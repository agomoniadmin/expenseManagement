package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.ImportProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportProfileRepository extends JpaRepository<ImportProfile, UUID> {
    Optional<ImportProfile> findByUserIdAndAccountId(UUID userId, UUID accountId);
    List<ImportProfile> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<ImportProfile> findByIdAndUserId(UUID id, UUID userId);
}
