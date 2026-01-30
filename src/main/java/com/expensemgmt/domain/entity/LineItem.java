package com.expensemgmt.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "line_items")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LineItem {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    @Column(name = "user_region", nullable = false)
    private String userRegion;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    private String unit;

    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "tax_amount")
    private BigDecimal taxAmount;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
