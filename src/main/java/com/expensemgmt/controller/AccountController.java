package com.expensemgmt.controller;

import com.expensemgmt.domain.entity.LedgerEntry;
import com.expensemgmt.dto.request.CreateAccountRequest;
import com.expensemgmt.dto.response.AccountResponse;
import com.expensemgmt.service.AccountService;
import com.expensemgmt.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final SecurityUtil securityUtil;

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAccounts() {
        return ResponseEntity.ok(accountService.getAccounts(securityUtil.getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(
            @RequestBody @Valid CreateAccountRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountService.createAccount(securityUtil.getCurrentUserId(), request));
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable UUID accountId) {
        return ResponseEntity.ok(accountService.getAccount(securityUtil.getCurrentUserId(), accountId));
    }

    @GetMapping("/{accountId}/ledger")
    public ResponseEntity<List<LedgerEntry>> getLedger(
            @PathVariable UUID accountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(accountService.getLedger(
                securityUtil.getCurrentUserId(), accountId, startDate, endDate));
    }
}
