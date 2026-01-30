package com.expensemgmt.dto.response;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
    String code, int status, String message,
    Instant timestamp, List<String> details
) {}
