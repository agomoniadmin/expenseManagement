package com.expensemgmt.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

public record ConfirmReconciliationRequest(
    @NotNull UUID matchId,
    Map<String, String> precedenceOverrides
) {}
