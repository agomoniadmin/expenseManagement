package com.expensemgmt.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record LineItemResponse(
    UUID id, String itemName, BigDecimal quantity, String unit,
    BigDecimal unitPrice, UUID categoryId
) {}
