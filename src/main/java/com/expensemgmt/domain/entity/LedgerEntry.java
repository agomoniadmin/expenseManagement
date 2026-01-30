package com.expensemgmt.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ledger_entries")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LedgerEntry {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "user_region", nullable = false)
    private String userRegion;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "entry_type", nullable = false)
    private String entryType;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "running_balance", nullable = false)
    private BigDecimal runningBalance;

    @Column(name = "counterparty_account_id")
    private UUID counterpartyAccountId;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
