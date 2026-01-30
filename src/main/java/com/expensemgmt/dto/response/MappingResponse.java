package com.expensemgmt.dto.response;

import java.util.UUID;

public record MappingResponse(
    UUID id, String pattern, String matchType, UUID categoryId,
    int priority, boolean active
) {}
