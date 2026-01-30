package com.expensemgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateTransactionRequest(
    @NotNull UUID accountId,
    @NotNull LocalDate date,
    @NotBlank String merchant,
    @NotNull BigDecimal amount,
    @NotBlank String type,
    BigDecimal taxAmount,
    String description,
    String referenceNumber,
    UUID categoryId,
    List<LineItemRequest> lineItems
) {}
