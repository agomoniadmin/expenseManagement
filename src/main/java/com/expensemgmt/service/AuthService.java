package com.expensemgmt.service;

import com.expensemgmt.domain.entity.RefreshToken;
import com.expensemgmt.domain.entity.User;
import com.expensemgmt.domain.enums.UserRole;
import com.expensemgmt.dto.request.LoginRequest;
import com.expensemgmt.dto.request.RegisterRequest;
import com.expensemgmt.dto.request.RefreshTokenRequest;
import com.expensemgmt.dto.response.AuthResponse;
import com.expensemgmt.dto.response.UserResponse;
import com.expensemgmt.exception.DuplicateEntityException;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.RefreshTokenRepository;
import com.expensemgmt.repository.UserRepository;
import com.expensemgmt.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEntityException("Email already registered: " + request.email());
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .primaryRegion(request.region() != null ? request.region() : "us-east-1")
                .role(UserRole.USER)
                .build();

        user = userRepository.save(user);
        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new BadCredentialsException("Refresh token expired");
        }

        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User", refreshToken.getUserId()));

        refreshTokenRepository.delete(refreshToken);
        return generateAuthResponse(user);
    }

    @Transactional
    public void logout(UUID userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    private AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name(), user.getPrimaryRegion());
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken();

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getId())
                .token(refreshTokenStr)
                .expiresAt(Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpiryMs()))
                .build();
        refreshTokenRepository.save(refreshToken);

        UserResponse userResponse = new UserResponse(
                user.getId(), user.getEmail(), user.getPrimaryRegion(),
                List.of(user.getRole().name()), user.getFirstName(), user.getLastName());

        return new AuthResponse(accessToken, refreshTokenStr, "Bearer",
                jwtTokenProvider.getAccessTokenExpiry(), userResponse);
    }
}
