package com.expensemgmt.service;

import com.expensemgmt.domain.entity.DomainEvent;
import com.expensemgmt.domain.entity.Transaction;
import com.expensemgmt.domain.enums.ReconciliationStatus;
import com.expensemgmt.dto.request.ConfirmReconciliationRequest;
import com.expensemgmt.dto.response.ReconciliationCandidateResponse;
import com.expensemgmt.dto.response.ReconciliationCandidateResponse.TransactionSummary;
import com.expensemgmt.dto.response.TransactionResponse;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.DomainEventRepository;
import com.expensemgmt.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final TransactionRepository transactionRepository;
    private final DomainEventRepository domainEventRepository;

    public List<ReconciliationCandidateResponse> getCandidates(UUID userId, UUID accountId,
                                                                double minConfidence) {
        List<Transaction> userTxns = transactionRepository.findUserUnreconciled(userId, accountId);
        List<Transaction> importedTxns = transactionRepository.findImportedUnreconciled(userId, accountId);

        List<ReconciliationCandidateResponse> candidates = new ArrayList<>();

        for (Transaction imported : importedTxns) {
            for (Transaction user : userTxns) {
                double score = calculateMatchScore(user, imported);
                if (score >= minConfidence) {
                    candidates.add(new ReconciliationCandidateResponse(
                            imported.getId(), score,
                            new TransactionSummary(user.getId(), user.getTransactionDate(),
                                    user.getMerchant(), user.getAmount()),
                            new TransactionSummary(imported.getId(), imported.getTransactionDate(),
                                    imported.getMerchant(), imported.getAmount())
                    ));
                }
            }
        }

        candidates.sort((a, b) -> Double.compare(b.confidenceScore(), a.confidenceScore()));
        return candidates;
    }

    @Transactional
    public TransactionResponse confirmMatch(UUID userId, ConfirmReconciliationRequest request) {
        Transaction imported = transactionRepository.findByIdAndUserId(request.matchId(), userId)
                .orElseThrow(() -> new EntityNotFoundException("Transaction", request.matchId()));

        // Find user transaction that best matches
        List<Transaction> userTxns = transactionRepository.findUserUnreconciled(
                userId, imported.getAccountId());

        Transaction bestMatch = null;
        double bestScore = 0;
        for (Transaction user : userTxns) {
            double score = calculateMatchScore(user, imported);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = user;
            }
        }

        if (bestMatch == null) {
            throw new EntityNotFoundException("Matching transaction", request.matchId());
        }

        // Merge: keep user data by default, use imported for specified overrides
        if (request.precedenceOverrides() != null) {
            if ("imported".equals(request.precedenceOverrides().get("merchant"))) {
                bestMatch.setMerchant(imported.getMerchant());
            }
        }
        if (imported.getReferenceNumber() != null) {
            bestMatch.setReferenceNumber(imported.getReferenceNumber());
        }

        bestMatch.setReconciliationStatus(ReconciliationStatus.RECONCILED);
        bestMatch.setReconciledWithId(imported.getId());
        imported.setReconciliationStatus(ReconciliationStatus.RECONCILED);
        imported.setReconciledWithId(bestMatch.getId());

        transactionRepository.save(bestMatch);
        transactionRepository.save(imported);

        DomainEvent event = DomainEvent.builder()
                .aggregateType("Transaction")
                .aggregateId(bestMatch.getId())
                .userRegion("us-east-1")
                .eventType("TransactionReconciled")
                .eventData(String.format("{\"matchedWith\":\"%s\",\"score\":%.2f}",
                        imported.getId(), bestScore))
                .version(bestMatch.getVersion())
                .build();
        domainEventRepository.save(event);

        return new TransactionResponse(
                bestMatch.getId(), bestMatch.getAccountId(), bestMatch.getTransactionDate(),
                bestMatch.getMerchant(), bestMatch.getAmount(), bestMatch.getTransactionType().name(),
                bestMatch.getCategoryId(), bestMatch.getDescription(),
                bestMatch.getReconciliationStatus().name(), List.of(),
                bestMatch.getCreatedAt(), bestMatch.getVersion());
    }

    private double calculateMatchScore(Transaction user, Transaction imported) {
        double score = 0;

        // Amount match (0.5 weight)
        if (user.getAmount().compareTo(imported.getAmount()) == 0) {
            score += 0.5;
        } else {
            BigDecimal diff = user.getAmount().subtract(imported.getAmount()).abs();
            BigDecimal pct = diff.divide(user.getAmount(), MathContext.DECIMAL32).abs();
            if (pct.doubleValue() <= 0.01) score += 0.3;
        }

        // Date match (0.3 weight)
        long daysDiff = Math.abs(ChronoUnit.DAYS.between(
                user.getTransactionDate(), imported.getTransactionDate()));
        if (daysDiff == 0) score += 0.3;
        else if (daysDiff <= 3) score += 0.2;
        else if (daysDiff <= 5) score += 0.1;

        // Merchant match (0.2 weight)
        String userMerch = user.getMerchant().toUpperCase();
        String impMerch = imported.getMerchant().toUpperCase();
        if (userMerch.equals(impMerch)) {
            score += 0.2;
        } else if (impMerch.contains(userMerch) || userMerch.contains(impMerch)) {
            score += 0.15;
        } else {
            // Simple word overlap check
            String[] userWords = userMerch.split("\\s+");
            for (String word : userWords) {
                if (word.length() > 2 && impMerch.contains(word)) {
                    score += 0.1;
                    break;
                }
            }
        }

        return Math.min(score, 1.0);
    }
}
