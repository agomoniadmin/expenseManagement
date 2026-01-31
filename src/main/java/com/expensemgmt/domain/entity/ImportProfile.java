package com.expensemgmt.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "import_profiles")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ImportProfile {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "profile_name", nullable = false, length = 100)
    private String profileName;

    @Column(name = "date_column", nullable = false, length = 100)
    private String dateColumn;

    @Column(name = "merchant_column", nullable = false, length = 100)
    private String merchantColumn;

    @Column(name = "amount_column", nullable = false, length = 100)
    private String amountColumn;

    @Column(name = "type_column", length = 100)
    private String typeColumn;

    @Column(name = "date_format", nullable = false, length = 50)
    @Builder.Default
    private String dateFormat = "MM/dd/yyyy";

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
