package com.expensemgmt.service;

import com.expensemgmt.domain.entity.*;
import com.expensemgmt.domain.enums.ReconciliationStatus;
import com.expensemgmt.domain.enums.TransactionType;
import com.expensemgmt.dto.request.CreateTransactionRequest;
import com.expensemgmt.dto.request.TransferRequest;
import com.expensemgmt.dto.request.UpdateTransactionRequest;
import com.expensemgmt.dto.response.*;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final LineItemRepository lineItemRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final DomainEventRepository domainEventRepository;
    private final AccountService accountService;
    private final CategoryService categoryService;

    @Transactional
    public TransactionResponse createTransaction(UUID userId, CreateTransactionRequest request) {
        UUID categoryId = request.categoryId();
        if (categoryId == null) {
            categoryId = categoryService.resolveCategory(userId, request.merchant());
        }

        Transaction txn = Transaction.builder()
                .userId(userId)
                .userRegion("us-east-1")
                .accountId(request.accountId())
                .transactionDate(request.date())
                .merchant(request.merchant())
                .amount(request.amount())
                .transactionType(TransactionType.valueOf(request.type()))
                .taxAmount(request.taxAmount())
                .description(request.description())
                .referenceNumber(request.referenceNumber())
                .categoryId(categoryId)
                .currency("USD")
                .build();

        txn = transactionRepository.save(txn);

        if (request.lineItems() != null) {
            for (var li : request.lineItems()) {
                LineItem lineItem = LineItem.builder()
                        .transactionId(txn.getId())
                        .userRegion("us-east-1")
                        .itemName(li.name())
                        .quantity(li.quantity() != null ? li.quantity() : BigDecimal.ONE)
                        .unit(li.unit())
                        .unitPrice(li.unitPrice())
                        .categoryId(li.categoryId() != null ? li.categoryId() : categoryId)
                        .build();
                lineItemRepository.save(lineItem);
            }
        }

        createLedgerEntry(txn);
        accountService.updateBalance(txn.getAccountId(), txn.getAmount(),
                txn.getTransactionType() == TransactionType.DEBIT ? "DEBIT" : "CREDIT");
        emitEvent(txn, "TransactionCreated");

        return mapToResponse(txn);
    }

    public PageResponse<TransactionResponse> getTransactions(UUID userId, UUID accountId,
            UUID categoryId, LocalDate start, LocalDate end,
            BigDecimal minAmount, BigDecimal maxAmount, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "transactionDate"));
        Page<Transaction> result = transactionRepository.searchTransactions(
                userId, start, end, accountId, categoryId, minAmount, maxAmount, pageable);

        List<TransactionResponse> data = result.getContent().stream()
                .map(this::mapToResponse).toList();

        return new PageResponse<>(data,
                new PageResponse.PageMeta(result.getTotalElements(), page, size));
    }

    public TransactionResponse getTransaction(UUID userId, UUID transactionId) {
        Transaction txn = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Transaction", transactionId));
        return mapToResponse(txn);
    }

    @Transactional
    public TransactionResponse updateTransaction(UUID userId, UUID transactionId,
                                                  UpdateTransactionRequest request) {
        Transaction txn = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Transaction", transactionId));

        if (request.categoryId() != null) txn.setCategoryId(request.categoryId());
        if (request.merchant() != null) txn.setMerchant(request.merchant());
        if (request.notes() != null) txn.setDescription(request.notes());
        if (request.amount() != null) txn.setAmount(request.amount());

        txn = transactionRepository.save(txn);
        emitEvent(txn, "TransactionUpdated");
        return mapToResponse(txn);
    }

    @Transactional
    public TransactionResponse createTransfer(UUID userId, TransferRequest request) {
        UUID linkId = UUID.randomUUID();

        Transaction debit = Transaction.builder()
                .userId(userId).userRegion("us-east-1")
                .accountId(request.fromAccountId())
                .transactionDate(LocalDate.now())
                .merchant("Transfer")
                .amount(request.amount())
                .transactionType(TransactionType.TRANSFER_OUT)
                .description(request.description())
                .transferLinkId(linkId)
                .currency("USD")
                .build();
        debit = transactionRepository.save(debit);

        Transaction credit = Transaction.builder()
                .userId(userId).userRegion("us-east-1")
                .accountId(request.toAccountId())
                .transactionDate(LocalDate.now())
                .merchant("Transfer")
                .amount(request.amount())
                .transactionType(TransactionType.TRANSFER_IN)
                .description(request.description())
                .transferLinkId(linkId)
                .currency("USD")
                .build();
        credit = transactionRepository.save(credit);

        createLedgerEntry(debit);
        createLedgerEntry(credit);
        accountService.updateBalance(request.fromAccountId(), request.amount(), "DEBIT");
        accountService.updateBalance(request.toAccountId(), request.amount(), "CREDIT");

        return mapToResponse(debit);
    }

    private void createLedgerEntry(Transaction txn) {
        BigDecimal runningBalance = ledgerEntryRepository
                .findTopByAccountIdOrderByCreatedAtDesc(txn.getAccountId())
                .map(LedgerEntry::getRunningBalance)
                .orElse(BigDecimal.ZERO);

        String entryType = (txn.getTransactionType() == TransactionType.DEBIT ||
                txn.getTransactionType() == TransactionType.TRANSFER_OUT) ? "DEBIT" : "CREDIT";

        BigDecimal newBalance = "DEBIT".equals(entryType)
                ? runningBalance.subtract(txn.getAmount())
                : runningBalance.add(txn.getAmount());

        LedgerEntry entry = LedgerEntry.builder()
                .accountId(txn.getAccountId())
                .userRegion("us-east-1")
                .transactionId(txn.getId())
                .entryDate(txn.getTransactionDate())
                .entryType(entryType)
                .amount(txn.getAmount())
                .runningBalance(newBalance)
                .build();
        ledgerEntryRepository.save(entry);
    }

    private void emitEvent(Transaction txn, String eventType) {
        String eventData = String.format(
                "{\"id\":\"%s\",\"amount\":%s,\"merchant\":\"%s\",\"type\":\"%s\"}",
                txn.getId(), txn.getAmount(), txn.getMerchant(), txn.getTransactionType());

        DomainEvent event = DomainEvent.builder()
                .aggregateType("Transaction")
                .aggregateId(txn.getId())
                .userRegion("us-east-1")
                .eventType(eventType)
                .eventData(eventData)
                .version(txn.getVersion())
                .build();
        domainEventRepository.save(event);
    }

    private TransactionResponse mapToResponse(Transaction txn) {
        List<LineItemResponse> lineItems = lineItemRepository.findByTransactionId(txn.getId())
                .stream()
                .map(li -> new LineItemResponse(li.getId(), li.getItemName(),
                        li.getQuantity(), li.getUnit(), li.getUnitPrice(), li.getCategoryId()))
                .toList();

        return new TransactionResponse(
                txn.getId(), txn.getAccountId(), txn.getTransactionDate(),
                txn.getMerchant(), txn.getAmount(), txn.getTransactionType().name(),
                txn.getCategoryId(), txn.getDescription(),
                txn.getReconciliationStatus().name(), lineItems,
                txn.getCreatedAt(), txn.getVersion());
    }
}
