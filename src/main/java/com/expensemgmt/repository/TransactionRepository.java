package com.expensemgmt.repository;

import com.expensemgmt.domain.entity.Transaction;
import com.expensemgmt.domain.enums.ReconciliationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Page<Transaction> findByUserIdAndTransactionDateBetween(
            UUID userId, LocalDate start, LocalDate end, Pageable pageable);

    Page<Transaction> findByAccountIdAndTransactionDateBetween(
            UUID accountId, LocalDate start, LocalDate end, Pageable pageable);

    List<Transaction> findByUserIdAndReconciliationStatus(UUID userId, ReconciliationStatus status);

    Optional<Transaction> findByImportHash(String hash);

    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND t.transactionDate BETWEEN :start AND :end " +
           "AND (CAST(:accountId AS text) IS NULL OR t.accountId = :accountId) " +
           "AND (CAST(:categoryId AS text) IS NULL OR t.categoryId = :categoryId) " +
           "AND (CAST(:minAmount AS text) IS NULL OR t.amount >= :minAmount) " +
           "AND (CAST(:maxAmount AS text) IS NULL OR t.amount <= :maxAmount)")
    Page<Transaction> searchTransactions(
            @Param("userId") UUID userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("accountId") UUID accountId,
            @Param("categoryId") UUID categoryId,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND t.accountId = :accountId " +
           "AND t.reconciliationStatus = 'UNRECONCILED' " +
           "AND t.importSource IS NOT NULL")
    List<Transaction> findImportedUnreconciled(
            @Param("userId") UUID userId, @Param("accountId") UUID accountId);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND t.accountId = :accountId " +
           "AND t.reconciliationStatus = 'UNRECONCILED' " +
           "AND t.importSource IS NULL")
    List<Transaction> findUserUnreconciled(
            @Param("userId") UUID userId, @Param("accountId") UUID accountId);
}
