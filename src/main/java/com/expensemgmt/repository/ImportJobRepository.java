package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.ImportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportJobRepository extends JpaRepository<ImportJob, UUID> {
    List<ImportJob> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<ImportJob> findByIdAndUserId(UUID id, UUID userId);
}
