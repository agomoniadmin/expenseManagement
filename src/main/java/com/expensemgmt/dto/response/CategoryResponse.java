package com.expensemgmt.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CategoryResponse(
    UUID id, String name, String icon, String color,
    BigDecimal budgetLimit, List<CategoryResponse> children
) {}
