package com.expensemgmt.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateTransactionRequest(
    UUID categoryId,
    String notes,
    String merchant,
    BigDecimal amount
) {}
