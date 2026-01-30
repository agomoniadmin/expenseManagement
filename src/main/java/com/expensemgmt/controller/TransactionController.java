package com.expensemgmt.controller;

import com.expensemgmt.dto.request.CreateTransactionRequest;
import com.expensemgmt.dto.request.TransferRequest;
import com.expensemgmt.dto.request.UpdateTransactionRequest;
import com.expensemgmt.dto.response.PageResponse;
import com.expensemgmt.dto.response.TransactionResponse;
import com.expensemgmt.service.TransactionService;
import com.expensemgmt.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final SecurityUtil securityUtil;

    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(
            @RequestBody @Valid CreateTransactionRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.createTransaction(securityUtil.getCurrentUserId(), request));
    }

    @GetMapping
    public ResponseEntity<PageResponse<TransactionResponse>> getTransactions(
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(transactionService.getTransactions(
                securityUtil.getCurrentUserId(), accountId, categoryId,
                startDate, endDate, minAmount, maxAmount, page, size));
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> getTransaction(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(
                transactionService.getTransaction(securityUtil.getCurrentUserId(), transactionId));
    }

    @PatchMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @PathVariable UUID transactionId,
            @RequestBody @Valid UpdateTransactionRequest request) {
        return ResponseEntity.ok(transactionService.updateTransaction(
                securityUtil.getCurrentUserId(), transactionId, request));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> createTransfer(
            @RequestBody @Valid TransferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.createTransfer(securityUtil.getCurrentUserId(), request));
    }
}
