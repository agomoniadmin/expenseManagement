package com.expensemgmt.service;

import com.expensemgmt.domain.entity.ImportJob;
import com.expensemgmt.domain.enums.ImportJobStatus;
import com.expensemgmt.dto.response.ImportJobResponse;
import com.expensemgmt.repository.ImportJobRepository;
import com.expensemgmt.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportServiceTest {

    @Mock private ImportJobRepository importJobRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private CategoryService categoryService;

    @InjectMocks private ImportService importService;

    private final UUID userId = UUID.randomUUID();
    private final UUID accountId = UUID.randomUUID();

    @Test
    void uploadAndProcess_shouldImportValidCSV() {
        String csv = "Date,Description,Amount,Type\n01/15/2026,Amazon,45.67,DEBIT\n01/16/2026,Walmart,23.50,DEBIT\n";
        InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(inv -> {
            ImportJob j = inv.getArgument(0);
            j.setId(UUID.randomUUID());
            return j;
        });
        when(transactionRepository.findByImportHash(any())).thenReturn(Optional.empty());
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(categoryService.resolveCategory(any(), any())).thenReturn(null);

        ImportJobResponse response = importService.uploadAndProcess(
                userId, accountId, "test.csv", "MM/dd/yyyy", stream);

        assertNotNull(response);
        assertEquals("COMPLETED", response.status());
        assertEquals(2, response.summary().totalRecords());
        assertEquals(2, response.summary().imported());
        assertEquals(0, response.summary().duplicates());
    }

    @Test
    void uploadAndProcess_shouldDetectDuplicates() {
        String csv = "Date,Description,Amount,Type\n01/15/2026,Amazon,45.67,DEBIT\n";
        InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(inv -> {
            ImportJob j = inv.getArgument(0);
            j.setId(UUID.randomUUID());
            return j;
        });
        when(transactionRepository.findByImportHash(any()))
                .thenReturn(Optional.of(mock(com.expensemgmt.domain.entity.Transaction.class)));

        ImportJobResponse response = importService.uploadAndProcess(
                userId, accountId, "test.csv", "MM/dd/yyyy", stream);

        assertEquals(1, response.summary().duplicates());
        assertEquals(0, response.summary().imported());
    }

    @Test
    void uploadAndProcess_shouldHandleErrors() {
        String csv = "Date,Description,Amount,Type\nINVALID_DATE,Amazon,45.67,DEBIT\n";
        InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(inv -> {
            ImportJob j = inv.getArgument(0);
            j.setId(UUID.randomUUID());
            return j;
        });

        ImportJobResponse response = importService.uploadAndProcess(
                userId, accountId, "test.csv", "MM/dd/yyyy", stream);

        assertEquals(1, response.summary().errors());
        assertTrue(response.errorDetails().size() > 0);
    }
}
