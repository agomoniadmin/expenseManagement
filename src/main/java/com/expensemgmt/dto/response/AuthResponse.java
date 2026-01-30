package com.expensemgmt.dto.response;

public record AuthResponse(
    String accessToken, String refreshToken, String tokenType,
    long expiresIn, UserResponse user
) {}
