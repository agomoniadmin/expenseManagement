package com.expensemgmt.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TransactionResponse(
    UUID id, UUID accountId, LocalDate date, String merchant,
    BigDecimal amount, String type, UUID categoryId, String description,
    String reconciliationStatus, List<LineItemResponse> lineItems,
    Instant createdAt, int version
) {}
