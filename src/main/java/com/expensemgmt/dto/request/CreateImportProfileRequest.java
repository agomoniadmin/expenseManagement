package com.expensemgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateImportProfileRequest(
    @NotNull UUID accountId,
    @NotBlank String profileName,
    @NotBlank String dateColumn,
    @NotBlank String merchantColumn,
    @NotBlank String amountColumn,
    String typeColumn,
    String dateFormat
) {}
