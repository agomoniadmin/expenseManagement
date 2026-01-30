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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock private CategoryRepository categoryRepository;
    @Mock private CategoryMappingRepository categoryMappingRepository;

    @InjectMocks private CategoryService categoryService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void getCategories_shouldReturnHierarchicalCategories() {
        UUID parentId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();

        ItemCategory parent = ItemCategory.builder()
                .id(parentId).name("Food").icon("utensils").color("#4CAF50")
                .isSystem(true).build();
        ItemCategory child = ItemCategory.builder()
                .id(childId).parentId(parentId).name("Groceries")
                .isSystem(true).build();

        when(categoryRepository.findByUserIdOrSystemOrderBySortOrder(userId))
                .thenReturn(List.of(parent, child));

        List<CategoryResponse> result = categoryService.getCategories(userId);

        assertEquals(1, result.size());
        assertEquals("Food", result.get(0).name());
        assertEquals(1, result.get(0).children().size());
        assertEquals("Groceries", result.get(0).children().get(0).name());
    }

    @Test
    void createCategory_shouldSaveAndReturn() {
        CreateCategoryRequest request = new CreateCategoryRequest(
                "Custom Category", null, "star", "#FF0000", new BigDecimal("500"));

        when(categoryRepository.save(any(ItemCategory.class))).thenAnswer(inv -> {
            ItemCategory c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CategoryResponse response = categoryService.createCategory(userId, request);

        assertNotNull(response);
        assertEquals("Custom Category", response.name());
        verify(categoryRepository).save(any());
    }

    @Test
    void resolveCategory_shouldMatchStartsWith() {
        UUID categoryId = UUID.randomUUID();
        CategoryMapping mapping = CategoryMapping.builder()
                .userId(userId).pattern("SHELL").matchType(MatchType.STARTS_WITH)
                .categoryId(categoryId).isActive(true).build();

        when(categoryMappingRepository.findByUserIdAndIsActiveTrueOrderByPriorityAsc(userId))
                .thenReturn(List.of(mapping));

        UUID result = categoryService.resolveCategory(userId, "SHELL OIL #123");
        assertEquals(categoryId, result);
    }

    @Test
    void resolveCategory_shouldReturnNullWhenNoMatch() {
        when(categoryMappingRepository.findByUserIdAndIsActiveTrueOrderByPriorityAsc(userId))
                .thenReturn(List.of());

        UUID result = categoryService.resolveCategory(userId, "Unknown Merchant");
        assertNull(result);
    }

    @Test
    void createMapping_shouldSaveAndReturn() {
        UUID categoryId = UUID.randomUUID();
        CreateMappingRequest request = new CreateMappingRequest("AMAZON", "CONTAINS", categoryId, 10);

        when(categoryMappingRepository.save(any(CategoryMapping.class))).thenAnswer(inv -> {
            CategoryMapping m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        MappingResponse response = categoryService.createMapping(userId, request);

        assertNotNull(response);
        assertEquals("AMAZON", response.pattern());
        assertEquals("CONTAINS", response.matchType());
    }
}
