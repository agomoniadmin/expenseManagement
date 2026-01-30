package com.expensemgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record CreateAccountRequest(
    @NotBlank String type,
    @NotBlank String name,
    String institution,
    String currency,
    BigDecimal creditLimit,
    Integer statementCloseDay,
    Integer paymentDueDay
) {}
