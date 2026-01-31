package com.expensemgmt.controller;

import com.expensemgmt.dto.response.DashboardResponse;
import com.expensemgmt.service.ReportService;
import com.expensemgmt.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final SecurityUtil securityUtil;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> getDashboard(
            @RequestParam(defaultValue = "this-month") String period) {
        return ResponseEntity.ok(reportService.getDashboard(securityUtil.getCurrentUserId(), period));
    }
}
