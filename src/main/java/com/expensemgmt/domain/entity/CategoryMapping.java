package com.expensemgmt.domain.entity;

import com.expensemgmt.domain.enums.MatchType;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "category_mappings")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CategoryMapping {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_region", nullable = false)
    private String userRegion;

    @Column(nullable = false)
    private String pattern;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_type", nullable = false)
    private MatchType matchType;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Builder.Default
    private int priority = 50;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
