package com.expensemgmt.service;

import com.expensemgmt.domain.entity.Transaction;
import com.expensemgmt.domain.enums.ReconciliationStatus;
import com.expensemgmt.domain.enums.TransactionType;
import com.expensemgmt.dto.response.ReconciliationCandidateResponse;
import com.expensemgmt.repository.DomainEventRepository;
import com.expensemgmt.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private DomainEventRepository domainEventRepository;

    @InjectMocks private ReconciliationService reconciliationService;

    private final UUID userId = UUID.randomUUID();
    private final UUID accountId = UUID.randomUUID();

    @Test
    void getCandidates_shouldReturnMatchesAboveThreshold() {
        Transaction userTxn = Transaction.builder()
                .id(UUID.randomUUID()).userId(userId).accountId(accountId)
                .transactionDate(LocalDate.of(2026, 1, 15))
                .merchant("Amazon").amount(new BigDecimal("45.67"))
                .transactionType(TransactionType.DEBIT)
                .reconciliationStatus(ReconciliationStatus.UNRECONCILED)
                .build();

        Transaction importedTxn = Transaction.builder()
                .id(UUID.randomUUID()).userId(userId).accountId(accountId)
                .transactionDate(LocalDate.of(2026, 1, 15))
                .merchant("AMZN MKTP US").amount(new BigDecimal("45.67"))
                .transactionType(TransactionType.DEBIT)
                .importSource("CSV")
                .reconciliationStatus(ReconciliationStatus.UNRECONCILED)
                .build();

        when(transactionRepository.findUserUnreconciled(userId, accountId))
                .thenReturn(List.of(userTxn));
        when(transactionRepository.findImportedUnreconciled(userId, accountId))
                .thenReturn(List.of(importedTxn));

        List<ReconciliationCandidateResponse> candidates =
                reconciliationService.getCandidates(userId, accountId, 0.7);

        assertEquals(1, candidates.size());
        assertTrue(candidates.get(0).confidenceScore() >= 0.7);
    }

    @Test
    void getCandidates_shouldExcludeBelowThreshold() {
        Transaction userTxn = Transaction.builder()
                .id(UUID.randomUUID()).userId(userId).accountId(accountId)
                .transactionDate(LocalDate.of(2026, 1, 1))
                .merchant("Store A").amount(new BigDecimal("100.00"))
                .transactionType(TransactionType.DEBIT)
                .reconciliationStatus(ReconciliationStatus.UNRECONCILED)
                .build();

        Transaction importedTxn = Transaction.builder()
                .id(UUID.randomUUID()).userId(userId).accountId(accountId)
                .transactionDate(LocalDate.of(2026, 1, 20))
                .merchant("Different Store").amount(new BigDecimal("999.99"))
                .transactionType(TransactionType.DEBIT)
                .importSource("CSV")
                .reconciliationStatus(ReconciliationStatus.UNRECONCILED)
                .build();

        when(transactionRepository.findUserUnreconciled(userId, accountId))
                .thenReturn(List.of(userTxn));
        when(transactionRepository.findImportedUnreconciled(userId, accountId))
                .thenReturn(List.of(importedTxn));

        List<ReconciliationCandidateResponse> candidates =
                reconciliationService.getCandidates(userId, accountId, 0.7);

        assertTrue(candidates.isEmpty());
    }
}
