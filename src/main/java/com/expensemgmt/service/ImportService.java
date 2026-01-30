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

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportService {

    private final ImportJobRepository importJobRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    @Transactional
    public ImportJobResponse uploadAndProcess(UUID userId, UUID accountId,
                                               String fileName, String dateFormat,
                                               InputStream csvStream) {
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

        try (CSVReader reader = new CSVReader(new InputStreamReader(csvStream, StandardCharsets.UTF_8))) {
            String[] header = reader.readNext(); // skip header
            String[] row;
            int lineNum = 1;

            while ((row = reader.readNext()) != null) {
                lineNum++;
                total++;
                try {
                    if (row.length < 3) {
                        errors++;
                        errorList.add(new ImportError(lineNum, "Insufficient columns"));
                        continue;
                    }

                    String dateStr = row[0].trim();
                    String merchant = row[1].trim();
                    String amountStr = row[2].trim();
                    String typeStr = row.length > 3 ? row[3].trim() : "DEBIT";

                    LocalDate date = LocalDate.parse(dateStr, dtf);
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
