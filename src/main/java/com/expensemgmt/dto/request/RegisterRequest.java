package com.expensemgmt.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 12, message = "Password must be at least 12 characters") String password,
    String firstName,
    String lastName,
    String region
) {}
