package com.expensemgmt.service;

import com.expensemgmt.domain.entity.Transaction;
import com.expensemgmt.domain.enums.ReconciliationStatus;
import com.expensemgmt.domain.enums.TransactionType;
import com.expensemgmt.dto.request.CreateTransactionRequest;
import com.expensemgmt.dto.request.UpdateTransactionRequest;
import com.expensemgmt.dto.response.TransactionResponse;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private LineItemRepository lineItemRepository;
    @Mock private LedgerEntryRepository ledgerEntryRepository;
    @Mock private DomainEventRepository domainEventRepository;
    @Mock private AccountService accountService;
    @Mock private CategoryService categoryService;

    @InjectMocks private TransactionService transactionService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void createTransaction_shouldSaveAndReturnResponse() {
        UUID accountId = UUID.randomUUID();
        CreateTransactionRequest request = new CreateTransactionRequest(
                accountId, LocalDate.now(), "Amazon", new BigDecimal("45.67"),
                "DEBIT", null, "Test purchase", null, null, null);

        when(categoryService.resolveCategory(any(), anyString())).thenReturn(null);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            t.setVersion(1);
            return t;
        });
        when(ledgerEntryRepository.findTopByAccountIdOrderByCreatedAtDesc(accountId))
                .thenReturn(Optional.empty());
        when(ledgerEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(domainEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(accountService).updateBalance(any(), any(), anyString());
        when(lineItemRepository.findByTransactionId(any())).thenReturn(List.of());

        TransactionResponse response = transactionService.createTransaction(userId, request);

        assertNotNull(response);
        assertEquals("Amazon", response.merchant());
        assertEquals(new BigDecimal("45.67"), response.amount());
        assertEquals("DEBIT", response.type());
        verify(transactionRepository).save(any());
        verify(ledgerEntryRepository).save(any());
    }

    @Test
    void getTransaction_shouldReturnTransaction() {
        UUID txnId = UUID.randomUUID();
        Transaction txn = Transaction.builder()
                .id(txnId).userId(userId).accountId(UUID.randomUUID())
                .transactionDate(LocalDate.now()).merchant("Test")
                .amount(new BigDecimal("100")).transactionType(TransactionType.DEBIT)
                .reconciliationStatus(ReconciliationStatus.UNRECONCILED)
                .version(1).build();

        when(transactionRepository.findByIdAndUserId(txnId, userId)).thenReturn(Optional.of(txn));
        when(lineItemRepository.findByTransactionId(txnId)).thenReturn(List.of());

        TransactionResponse response = transactionService.getTransaction(userId, txnId);

        assertEquals(txnId, response.id());
        assertEquals("Test", response.merchant());
    }

    @Test
    void getTransaction_shouldThrowWhenNotFound() {
        UUID txnId = UUID.randomUUID();
        when(transactionRepository.findByIdAndUserId(txnId, userId)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> transactionService.getTransaction(userId, txnId));
    }

    @Test
    void updateTransaction_shouldUpdateFields() {
        UUID txnId = UUID.randomUUID();
        UUID newCategoryId = UUID.randomUUID();
        Transaction txn = Transaction.builder()
                .id(txnId).userId(userId).accountId(UUID.randomUUID())
                .transactionDate(LocalDate.now()).merchant("Old Merchant")
                .amount(new BigDecimal("100")).transactionType(TransactionType.DEBIT)
                .reconciliationStatus(ReconciliationStatus.UNRECONCILED)
                .version(1).build();

        UpdateTransactionRequest request = new UpdateTransactionRequest(
                newCategoryId, "Updated notes", "New Merchant", null);

        when(transactionRepository.findByIdAndUserId(txnId, userId)).thenReturn(Optional.of(txn));
        when(transactionRepository.save(any())).thenReturn(txn);
        when(domainEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(lineItemRepository.findByTransactionId(txnId)).thenReturn(List.of());

        TransactionResponse response = transactionService.updateTransaction(userId, txnId, request);

        assertEquals("New Merchant", response.merchant());
        assertEquals(newCategoryId, response.categoryId());
    }
}
