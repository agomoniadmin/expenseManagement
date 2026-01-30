package com.expensemgmt.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "domain_events")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DomainEvent {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "aggregate_type", nullable = false)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId;

    @Column(name = "user_region", nullable = false)
    private String userRegion;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "event_data", columnDefinition = "TEXT", nullable = false)
    private String eventData;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(nullable = false)
    private int version;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
