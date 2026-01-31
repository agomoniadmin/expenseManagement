package com.expensemgmt.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ImportProfileResponse(
    UUID id,
    UUID accountId,
    String profileName,
    String dateColumn,
    String merchantColumn,
    String amountColumn,
    String typeColumn,
    String dateFormat,
    Instant createdAt
) {}
