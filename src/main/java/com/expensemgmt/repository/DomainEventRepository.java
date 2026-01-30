package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.DomainEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DomainEventRepository extends JpaRepository<DomainEvent, UUID> {
    List<DomainEvent> findByAggregateTypeAndAggregateIdOrderByVersionAsc(String aggregateType, UUID aggregateId);
    List<DomainEvent> findByEventTypeOrderByCreatedAtDesc(String eventType);
}
