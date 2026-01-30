package com.expensemgmt.controller;

import com.expensemgmt.dto.request.ConfirmReconciliationRequest;
import com.expensemgmt.dto.response.ReconciliationCandidateResponse;
import com.expensemgmt.dto.response.TransactionResponse;
import com.expensemgmt.service.ReconciliationService;
import com.expensemgmt.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final ReconciliationService reconciliationService;
    private final SecurityUtil securityUtil;

    @GetMapping("/candidates")
    public ResponseEntity<List<ReconciliationCandidateResponse>> getCandidates(
            @RequestParam(required = false) UUID accountId,
            @RequestParam(defaultValue = "0.7") double confidenceMin) {
        return ResponseEntity.ok(reconciliationService.getCandidates(
                securityUtil.getCurrentUserId(), accountId, confidenceMin));
    }

    @PostMapping("/confirm")
    public ResponseEntity<TransactionResponse> confirmMatch(
            @RequestBody @Valid ConfirmReconciliationRequest request) {
        return ResponseEntity.ok(reconciliationService.confirmMatch(
                securityUtil.getCurrentUserId(), request));
    }
}
