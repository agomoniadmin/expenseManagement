package com.expensemgmt.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ImportJobResponse(
    UUID jobId, String status, Instant startedAt, Instant completedAt,
    ImportSummary summary, List<ImportError> errorDetails
) {
    public record ImportSummary(int totalRecords, int imported, int duplicates, int matched, int errors) {}
    public record ImportError(int line, String message) {}
}
