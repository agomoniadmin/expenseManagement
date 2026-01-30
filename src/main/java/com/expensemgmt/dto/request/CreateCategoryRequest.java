package com.expensemgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateCategoryRequest(
    @NotBlank String name,
    UUID parentId,
    String icon,
    String color,
    BigDecimal budgetLimit
) {}
