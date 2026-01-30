package com.expensemgmt.service;

import com.expensemgmt.domain.entity.CategoryMapping;
import com.expensemgmt.domain.entity.ItemCategory;
import com.expensemgmt.domain.enums.MatchType;
import com.expensemgmt.dto.request.CreateCategoryRequest;
import com.expensemgmt.dto.request.CreateMappingRequest;
import com.expensemgmt.dto.response.CategoryResponse;
import com.expensemgmt.dto.response.MappingResponse;
import com.expensemgmt.repository.CategoryMappingRepository;
import com.expensemgmt.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMappingRepository categoryMappingRepository;

    public List<CategoryResponse> getCategories(UUID userId) {
        List<ItemCategory> all = categoryRepository.findByUserIdOrSystemOrderBySortOrder(userId);
        Map<UUID, List<ItemCategory>> byParent = all.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(ItemCategory::getParentId));

        return all.stream()
                .filter(c -> c.getParentId() == null)
                .map(c -> mapToResponse(c, byParent))
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryResponse createCategory(UUID userId, CreateCategoryRequest request) {
        ItemCategory category = ItemCategory.builder()
                .userId(userId)
                .userRegion("us-east-1")
                .parentId(request.parentId())
                .name(request.name())
                .icon(request.icon())
                .color(request.color())
                .budgetLimit(request.budgetLimit())
                .isSystem(false)
                .build();
        category = categoryRepository.save(category);
        return mapToResponse(category, Map.of());
    }

    public UUID resolveCategory(UUID userId, String merchantName) {
        List<CategoryMapping> mappings = categoryMappingRepository
                .findByUserIdAndIsActiveTrueOrderByPriorityAsc(userId);
        for (CategoryMapping mapping : mappings) {
            if (matchesMerchant(merchantName, mapping)) {
                return mapping.getCategoryId();
            }
        }
        return null;
    }

    @Transactional
    public MappingResponse createMapping(UUID userId, CreateMappingRequest request) {
        CategoryMapping mapping = CategoryMapping.builder()
                .userId(userId)
                .userRegion("us-east-1")
                .pattern(request.pattern())
                .matchType(MatchType.valueOf(request.matchType()))
                .categoryId(request.categoryId())
                .priority(request.priority())
                .build();
        mapping = categoryMappingRepository.save(mapping);
        return new MappingResponse(mapping.getId(), mapping.getPattern(),
                mapping.getMatchType().name(), mapping.getCategoryId(),
                mapping.getPriority(), mapping.isActive());
    }

    public List<MappingResponse> getMappings(UUID userId) {
        return categoryMappingRepository.findByUserIdAndIsActiveTrueOrderByPriorityAsc(userId)
                .stream()
                .map(m -> new MappingResponse(m.getId(), m.getPattern(),
                        m.getMatchType().name(), m.getCategoryId(),
                        m.getPriority(), m.isActive()))
                .collect(Collectors.toList());
    }

    private boolean matchesMerchant(String merchant, CategoryMapping mapping) {
        if (merchant == null) return false;
        String upper = merchant.toUpperCase();
        String pattern = mapping.getPattern().toUpperCase();
        return switch (mapping.getMatchType()) {
            case EXACT -> upper.equals(pattern);
            case CONTAINS -> upper.contains(pattern);
            case STARTS_WITH -> upper.startsWith(pattern);
            case REGEX -> merchant.matches(mapping.getPattern());
        };
    }

    private CategoryResponse mapToResponse(ItemCategory cat, Map<UUID, List<ItemCategory>> childrenMap) {
        List<CategoryResponse> children = childrenMap.getOrDefault(cat.getId(), List.of())
                .stream().map(c -> mapToResponse(c, childrenMap)).collect(Collectors.toList());
        return new CategoryResponse(cat.getId(), cat.getName(),
                cat.getIcon(), cat.getColor(), cat.getBudgetLimit(), children);
    }
}
