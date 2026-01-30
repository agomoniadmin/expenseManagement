package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.LineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LineItemRepository extends JpaRepository<LineItem, UUID> {
    List<LineItem> findByTransactionId(UUID transactionId);
    void deleteByTransactionId(UUID transactionId);
}
