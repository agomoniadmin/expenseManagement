package com.expensemgmt.controller;

import com.expensemgmt.domain.entity.ImportProfile;
import com.expensemgmt.dto.request.CreateImportProfileRequest;
import com.expensemgmt.dto.response.ImportJobResponse;
import com.expensemgmt.dto.response.ImportProfileResponse;
import com.expensemgmt.service.ImportProfileService;
import com.expensemgmt.service.ImportService;
import com.expensemgmt.service.ImportService.ColumnMapping;
import com.expensemgmt.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/import")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;
    private final ImportProfileService importProfileService;
    private final SecurityUtil securityUtil;

    @PostMapping("/upload")
    public ResponseEntity<ImportJobResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam UUID accountId,
            @RequestParam(required = false) String profileId,
            @RequestParam(required = false) String dateColumn,
            @RequestParam(required = false) String merchantColumn,
            @RequestParam(required = false) String amountColumn,
            @RequestParam(required = false) String typeColumn,
            @RequestParam(defaultValue = "MM/dd/yyyy") String dateFormat) throws IOException {

        UUID userId = securityUtil.getCurrentUserId();
        ColumnMapping mapping = resolveMapping(userId, accountId, profileId,
                dateColumn, merchantColumn, amountColumn, typeColumn, dateFormat);

        String effectiveDateFormat = dateFormat;
        if (profileId != null) {
            ImportProfile profile = importProfileService.getEntity(userId, UUID.fromString(profileId));
            effectiveDateFormat = profile.getDateFormat();
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(importService.uploadAndProcess(
                        userId, accountId,
                        file.getOriginalFilename(), effectiveDateFormat,
                        file.getInputStream(), mapping));
    }

    @PostMapping("/preview-headers")
    public ResponseEntity<List<String>> previewHeaders(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(importService.previewHeaders(file.getInputStream()));
    }

    // --- Profile CRUD ---

    @PostMapping("/profiles")
    public ResponseEntity<ImportProfileResponse> createProfile(
            @Valid @RequestBody CreateImportProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(importProfileService.createOrUpdate(securityUtil.getCurrentUserId(), request));
    }

    @GetMapping("/profiles")
    public ResponseEntity<List<ImportProfileResponse>> listProfiles() {
        return ResponseEntity.ok(importProfileService.list(securityUtil.getCurrentUserId()));
    }

    @GetMapping("/profiles/account/{accountId}")
    public ResponseEntity<ImportProfileResponse> getProfileByAccount(@PathVariable UUID accountId) {
        return importProfileService.getByAccount(securityUtil.getCurrentUserId(), accountId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/profiles/{profileId}")
    public ResponseEntity<Void> deleteProfile(@PathVariable UUID profileId) {
        importProfileService.delete(securityUtil.getCurrentUserId(), profileId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<ImportJobResponse> getJobStatus(@PathVariable UUID jobId) {
        return ResponseEntity.ok(importService.getJobStatus(securityUtil.getCurrentUserId(), jobId));
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<ImportJobResponse>> getJobs() {
        return ResponseEntity.ok(importService.getJobs(securityUtil.getCurrentUserId()));
    }

    private ColumnMapping resolveMapping(UUID userId, UUID accountId, String profileId,
                                          String dateCol, String merchantCol, String amountCol,
                                          String typeCol, String dateFormat) {
        // 1. Explicit profileId
        if (profileId != null) {
            ImportProfile p = importProfileService.getEntity(userId, UUID.fromString(profileId));
            return new ColumnMapping(p.getDateColumn(), p.getMerchantColumn(),
                    p.getAmountColumn(), p.getTypeColumn());
        }
        // 2. Inline column params
        if (dateCol != null && merchantCol != null && amountCol != null) {
            return new ColumnMapping(dateCol, merchantCol, amountCol, typeCol);
        }
        // 3. Auto-lookup by account
        return importProfileService.getByAccount(userId, accountId)
                .map(pr -> new ColumnMapping(pr.dateColumn(), pr.merchantColumn(),
                        pr.amountColumn(), pr.typeColumn()))
                .orElse(null); // null → legacy positional fallback
    }
}
