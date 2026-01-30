package com.expensemgmt.domain.entity;

import com.expensemgmt.domain.enums.ImportJobStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "import_jobs")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ImportJob {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_region", nullable = false)
    private String userRegion;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_url")
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ImportJobStatus status = ImportJobStatus.PENDING;

    @Column(name = "date_format")
    private String dateFormat;

    @Column(name = "total_records")
    @Builder.Default
    private int totalRecords = 0;

    @Column(name = "imported_records")
    @Builder.Default
    private int importedRecords = 0;

    @Column(name = "duplicate_records")
    @Builder.Default
    private int duplicateRecords = 0;

    @Column(name = "matched_records")
    @Builder.Default
    private int matchedRecords = 0;

    @Column(name = "error_records")
    @Builder.Default
    private int errorRecords = 0;

    @Column(columnDefinition = "TEXT")
    private String errors;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
