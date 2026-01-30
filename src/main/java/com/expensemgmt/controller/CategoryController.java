package com.expensemgmt.controller;

import com.expensemgmt.dto.request.CreateCategoryRequest;
import com.expensemgmt.dto.request.CreateMappingRequest;
import com.expensemgmt.dto.response.CategoryResponse;
import com.expensemgmt.dto.response.MappingResponse;
import com.expensemgmt.service.CategoryService;
import com.expensemgmt.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final SecurityUtil securityUtil;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        return ResponseEntity.ok(categoryService.getCategories(securityUtil.getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(
            @RequestBody @Valid CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createCategory(securityUtil.getCurrentUserId(), request));
    }

    @PostMapping("/mappings")
    public ResponseEntity<MappingResponse> createMapping(
            @RequestBody @Valid CreateMappingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createMapping(securityUtil.getCurrentUserId(), request));
    }

    @GetMapping("/mappings")
    public ResponseEntity<List<MappingResponse>> getMappings() {
        return ResponseEntity.ok(categoryService.getMappings(securityUtil.getCurrentUserId()));
    }
}
