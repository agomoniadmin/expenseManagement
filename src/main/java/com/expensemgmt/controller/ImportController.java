package com.expensemgmt.controller;

import com.expensemgmt.dto.response.ImportJobResponse;
import com.expensemgmt.service.ImportService;
import com.expensemgmt.util.SecurityUtil;
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
    private final SecurityUtil securityUtil;

    @PostMapping("/upload")
    public ResponseEntity<ImportJobResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam UUID accountId,
            @RequestParam(required = false) String profileId,
            @RequestParam(defaultValue = "MM/dd/yyyy") String dateFormat) throws IOException {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(importService.uploadAndProcess(
                        securityUtil.getCurrentUserId(), accountId,
                        file.getOriginalFilename(), dateFormat,
                        file.getInputStream()));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<ImportJobResponse> getJobStatus(@PathVariable UUID jobId) {
        return ResponseEntity.ok(importService.getJobStatus(securityUtil.getCurrentUserId(), jobId));
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<ImportJobResponse>> getJobs() {
        return ResponseEntity.ok(importService.getJobs(securityUtil.getCurrentUserId()));
    }
}
