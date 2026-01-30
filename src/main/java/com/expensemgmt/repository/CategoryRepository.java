package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.ItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<ItemCategory, UUID> {
    @Query("SELECT c FROM ItemCategory c WHERE c.userId = :userId OR c.isSystem = true ORDER BY c.sortOrder")
    List<ItemCategory> findByUserIdOrSystemOrderBySortOrder(@Param("userId") UUID userId);

    List<ItemCategory> findByParentId(UUID parentId);
    List<ItemCategory> findByIsSystemTrue();
}
