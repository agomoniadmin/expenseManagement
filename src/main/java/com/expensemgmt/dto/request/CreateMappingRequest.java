package com.expensemgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateMappingRequest(
    @NotBlank String pattern,
    @NotBlank String matchType,
    @NotNull UUID categoryId,
    int priority
) {}
