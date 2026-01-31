package com.expensemgmt.service;

import com.expensemgmt.domain.entity.ImportProfile;
import com.expensemgmt.dto.request.CreateImportProfileRequest;
import com.expensemgmt.dto.response.ImportProfileResponse;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.ImportProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ImportProfileService {

    private final ImportProfileRepository importProfileRepository;

    @Transactional
    public ImportProfileResponse createOrUpdate(UUID userId, CreateImportProfileRequest request) {
        String dateFormat = request.dateFormat() != null ? request.dateFormat() : "MM/dd/yyyy";

        ImportProfile profile = importProfileRepository
                .findByUserIdAndAccountId(userId, request.accountId())
                .map(existing -> {
                    existing.setProfileName(request.profileName());
                    existing.setDateColumn(request.dateColumn());
                    existing.setMerchantColumn(request.merchantColumn());
                    existing.setAmountColumn(request.amountColumn());
                    existing.setTypeColumn(request.typeColumn());
                    existing.setDateFormat(dateFormat);
                    existing.setUpdatedAt(Instant.now());
                    return existing;
                })
                .orElseGet(() -> ImportProfile.builder()
                        .userId(userId)
                        .accountId(request.accountId())
                        .profileName(request.profileName())
                        .dateColumn(request.dateColumn())
                        .merchantColumn(request.merchantColumn())
                        .amountColumn(request.amountColumn())
                        .typeColumn(request.typeColumn())
                        .dateFormat(dateFormat)
                        .build());

        profile = importProfileRepository.save(profile);
        return mapToResponse(profile);
    }

    public Optional<ImportProfileResponse> getByAccount(UUID userId, UUID accountId) {
        return importProfileRepository.findByUserIdAndAccountId(userId, accountId)
                .map(this::mapToResponse);
    }

    public List<ImportProfileResponse> list(UUID userId) {
        return importProfileRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponse).toList();
    }

    @Transactional
    public void delete(UUID userId, UUID profileId) {
        ImportProfile profile = importProfileRepository.findByIdAndUserId(profileId, userId)
                .orElseThrow(() -> new EntityNotFoundException("ImportProfile", profileId));
        importProfileRepository.delete(profile);
    }

    public ImportProfile getEntity(UUID userId, UUID profileId) {
        return importProfileRepository.findByIdAndUserId(profileId, userId)
                .orElseThrow(() -> new EntityNotFoundException("ImportProfile", profileId));
    }

    private ImportProfileResponse mapToResponse(ImportProfile p) {
        return new ImportProfileResponse(
                p.getId(), p.getAccountId(), p.getProfileName(),
                p.getDateColumn(), p.getMerchantColumn(), p.getAmountColumn(),
                p.getTypeColumn(), p.getDateFormat(), p.getCreatedAt());
    }
}
