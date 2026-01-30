package com.expensemgmt.dto.response;

import java.util.List;

public record PageResponse<T>(List<T> data, PageMeta meta) {
    public record PageMeta(long total, int page, int perPage) {}
}
