package com.expensemgmt.service;

import com.expensemgmt.domain.entity.ImportJob;
import com.expensemgmt.domain.entity.Transaction;
import com.expensemgmt.domain.enums.ImportJobStatus;
import com.expensemgmt.domain.enums.TransactionType;
import com.expensemgmt.dto.response.ImportJobResponse;
import com.expensemgmt.dto.response.ImportJobResponse.ImportError;
import com.expensemgmt.dto.response.ImportJobResponse.ImportSummary;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.ImportJobRepository;
import com.expensemgmt.repository.TransactionRepository;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportService {

    private final ImportJobRepository importJobRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    /** Excel epoch: 1899-12-30 (Excel incorrectly treats 1900 as a leap year). */
    private static final LocalDate EXCEL_EPOCH = LocalDate.of(1899, 12, 30);
    private static final char BOM = '\uFEFF';

    public record ColumnMapping(String dateColumn, String merchantColumn, String amountColumn, String typeColumn) {}

    /** Wraps an InputStream to strip a leading UTF-8 BOM if present. */
    private static Reader bomStrippingReader(InputStream in) throws IOException {
        PushbackInputStream pb = new PushbackInputStream(in, 3);
        byte[] bom = new byte[3];
        int read = pb.read(bom, 0, 3);
        if (read >= 3 && bom[0] == (byte) 0xEF && bom[1] == (byte) 0xBB && bom[2] == (byte) 0xBF) {
            // BOM consumed — do nothing
        } else if (read > 0) {
            pb.unread(bom, 0, read);
        }
        return new InputStreamReader(pb, StandardCharsets.UTF_8);
    }

    /**
     * Parse a date string. First tries the provided DateTimeFormatter.
     * If that fails and the value looks like an integer, treats it as an Excel serial date number.
     */
    private static LocalDate parseDate(String dateStr, DateTimeFormatter dtf) {
        try {
            return LocalDate.parse(dateStr, dtf);
        } catch (DateTimeParseException e) {
            // Try Excel serial date number
            try {
                long serial = Long.parseLong(dateStr);
                if (serial > 0 && serial < 200000) {
                    return EXCEL_EPOCH.plusDays(serial);
                }
            } catch (NumberFormatException ignored) {
                // not a number
            }
            throw e; // rethrow the original parse exception
        }
    }

    public List<String> previewHeaders(InputStream csvStream) throws IOException {
        try (CSVReader reader = new CSVReader(bomStrippingReader(csvStream))) {
            String[] header = reader.readNext();
            if (header == null) return List.of();
            return Arrays.stream(header).map(h -> h.trim().replace("\r", "")).toList();
        } catch (CsvValidationException e) {
            throw new IOException("Failed to read CSV headers: " + e.getMessage(), e);
        }
    }

    @Transactional
    public ImportJobResponse uploadAndProcess(UUID userId, UUID accountId,
                                               String fileName, String dateFormat,
                                               InputStream csvStream,
                                               ColumnMapping mapping) {
        ImportJob job = ImportJob.builder()
                .userId(userId)
                .userRegion("us-east-1")
                .accountId(accountId)
                .fileName(fileName)
                .dateFormat(dateFormat)
                .status(ImportJobStatus.PROCESSING)
                .startedAt(Instant.now())
                .build();
        job = importJobRepository.save(job);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern(dateFormat);
        int imported = 0, duplicates = 0, errors = 0, total = 0;
        List<ImportError> errorList = new ArrayList<>();

        try (CSVReader reader = new CSVReader(bomStrippingReader(csvStream))) {
            String[] header = reader.readNext();
            if (header == null) {
                job.setStatus(ImportJobStatus.FAILED);
                job.setErrors("CSV file is empty");
                importJobRepository.save(job);
                return mapToResponse(job, errorList);
            }

            // Build header index map (strip \r from Windows line endings)
            Map<String, Integer> headerIndex = new HashMap<>();
            for (int i = 0; i < header.length; i++) {
                headerIndex.put(header[i].trim().replace("\r", ""), i);
            }

            // Resolve column indices
            int dateIdx, merchantIdx, amountIdx, typeIdx;
            if (mapping != null) {
                Integer di = headerIndex.get(mapping.dateColumn());
                Integer mi = headerIndex.get(mapping.merchantColumn());
                Integer ai = headerIndex.get(mapping.amountColumn());
                if (di == null || mi == null || ai == null) {
                    job.setStatus(ImportJobStatus.FAILED);
                    job.setErrors("Mapped column not found in CSV headers");
                    importJobRepository.save(job);
                    return mapToResponse(job, errorList);
                }
                dateIdx = di;
                merchantIdx = mi;
                amountIdx = ai;
                typeIdx = mapping.typeColumn() != null ? headerIndex.getOrDefault(mapping.typeColumn(), -1) : -1;
            } else {
                // Legacy positional fallback
                dateIdx = 0;
                merchantIdx = 1;
                amountIdx = 2;
                typeIdx = header.length > 3 ? 3 : -1;
            }

            String[] row;
            int lineNum = 1;

            while ((row = reader.readNext()) != null) {
                lineNum++;
                total++;
                try {
                    int maxIdx = Math.max(dateIdx, Math.max(merchantIdx, amountIdx));
                    if (row.length <= maxIdx) {
                        errors++;
                        errorList.add(new ImportError(lineNum, "Insufficient columns"));
                        continue;
                    }

                    String dateStr = row[dateIdx].trim();
                    String merchant = row[merchantIdx].trim();
                    String amountStr = row[amountIdx].trim();
                    String typeStr = (typeIdx >= 0 && row.length > typeIdx) ? row[typeIdx].trim() : "DEBIT";

                    LocalDate date = parseDate(dateStr, dtf);
                    BigDecimal amount = new BigDecimal(amountStr);
                    if (amount.compareTo(BigDecimal.ZERO) < 0) {
                        amount = amount.negate();
                        typeStr = "CREDIT";
                    }

                    String hash = generateImportHash(dateStr, amountStr, merchant);
                    if (transactionRepository.findByImportHash(hash).isPresent()) {
                        duplicates++;
                        continue;
                    }

                    UUID categoryId = categoryService.resolveCategory(userId, merchant);

                    Transaction txn = Transaction.builder()
                            .userId(userId)
                            .userRegion("us-east-1")
                            .accountId(accountId)
                            .transactionDate(date)
                            .merchant(merchant)
                            .amount(amount)
                            .transactionType(TransactionType.valueOf(typeStr.toUpperCase()))
                            .importSource("CSV")
                            .importHash(hash)
                            .categoryId(categoryId)
                            .currency("USD")
                            .build();
                    transactionRepository.save(txn);
                    imported++;
                } catch (Exception e) {
                    errors++;
                    errorList.add(new ImportError(lineNum, e.getMessage()));
                }
            }
        } catch (IOException | CsvValidationException e) {
            job.setStatus(ImportJobStatus.FAILED);
            job.setErrors(e.getMessage());
            importJobRepository.save(job);
            return mapToResponse(job, errorList);
        }

        job.setStatus(ImportJobStatus.COMPLETED);
        job.setTotalRecords(total);
        job.setImportedRecords(imported);
        job.setDuplicateRecords(duplicates);
        job.setErrorRecords(errors);
        job.setCompletedAt(Instant.now());
        importJobRepository.save(job);

        return mapToResponse(job, errorList);
    }

    @Transactional
    public ImportJobResponse uploadAndProcess(UUID userId, UUID accountId,
                                               String fileName, String dateFormat,
                                               InputStream csvStream) {
        return uploadAndProcess(userId, accountId, fileName, dateFormat, csvStream, null);
    }

    public ImportJobResponse getJobStatus(UUID userId, UUID jobId) {
        ImportJob job = importJobRepository.findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new EntityNotFoundException("ImportJob", jobId));
        return mapToResponse(job, List.of());
    }

    public List<ImportJobResponse> getJobs(UUID userId) {
        return importJobRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(j -> mapToResponse(j, List.of())).toList();
    }

    private String generateImportHash(String date, String amount, String merchant) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String input = date + "|" + amount + "|" + merchant;
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    private ImportJobResponse mapToResponse(ImportJob job, List<ImportError> errorList) {
        return new ImportJobResponse(
                job.getId(), job.getStatus().name(), job.getStartedAt(), job.getCompletedAt(),
                new ImportSummary(job.getTotalRecords(), job.getImportedRecords(),
                        job.getDuplicateRecords(), job.getMatchedRecords(), job.getErrorRecords()),
                errorList);
    }
}
