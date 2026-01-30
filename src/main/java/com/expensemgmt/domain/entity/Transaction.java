package com.expensemgmt.domain.entity;

import com.expensemgmt.domain.enums.ReconciliationStatus;
import com.expensemgmt.domain.enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_region", nullable = false)
    private String userRegion;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "post_date")
    private LocalDate postDate;

    @Column(nullable = false)
    private String merchant;

    @Column(name = "merchant_category_code")
    private String merchantCategoryCode;

    @Column(nullable = false)
    private BigDecimal amount;

    @Builder.Default
    private String currency = "USD";

    @Column(name = "tax_amount")
    private BigDecimal taxAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reference_number")
    private String referenceNumber;

    @Column(name = "import_source")
    private String importSource;

    @Column(name = "import_hash")
    private String importHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_status")
    @Builder.Default
    private ReconciliationStatus reconciliationStatus = ReconciliationStatus.UNRECONCILED;

    @Column(name = "reconciled_with_id")
    private UUID reconciledWithId;

    @Column(name = "transfer_link_id")
    private UUID transferLinkId;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    @Builder.Default
    private Integer version = 1;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
