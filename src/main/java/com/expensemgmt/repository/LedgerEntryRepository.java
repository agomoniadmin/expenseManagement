package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {
    List<LedgerEntry> findByAccountIdAndEntryDateBetweenOrderByEntryDateDescCreatedAtDesc(
            UUID accountId, LocalDate start, LocalDate end);
    Optional<LedgerEntry> findTopByAccountIdOrderByCreatedAtDesc(UUID accountId);
}
