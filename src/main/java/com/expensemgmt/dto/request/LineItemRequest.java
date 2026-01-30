package com.expensemgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record LineItemRequest(
    @NotBlank String name,
    BigDecimal quantity,
    String unit,
    @NotNull BigDecimal unitPrice,
    UUID categoryId
) {}
