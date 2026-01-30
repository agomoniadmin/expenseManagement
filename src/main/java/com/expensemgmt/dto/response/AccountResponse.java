package com.expensemgmt.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(
    UUID id, String type, String name, String institution, String currency,
    BigDecimal currentBalance, BigDecimal availableBalance,
    Instant lastSynced, String status
) {}
