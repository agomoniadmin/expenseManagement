package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.CategoryMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CategoryMappingRepository extends JpaRepository<CategoryMapping, UUID> {
    List<CategoryMapping> findByUserIdAndIsActiveTrueOrderByPriorityAsc(UUID userId);
}
