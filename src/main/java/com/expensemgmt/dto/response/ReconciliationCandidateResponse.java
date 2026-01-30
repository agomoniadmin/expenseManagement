package com.expensemgmt.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ReconciliationCandidateResponse(
    UUID matchId, double confidenceScore,
    TransactionSummary userTransaction,
    TransactionSummary importedTransaction
) {
    public record TransactionSummary(UUID id, LocalDate date, String merchant, BigDecimal amount) {}
}
