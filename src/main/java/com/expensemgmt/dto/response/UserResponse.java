package com.expensemgmt.dto.response;

import java.util.List;
import java.util.UUID;

public record UserResponse(
    UUID id, String email, String region, List<String> roles,
    String firstName, String lastName
) {}
