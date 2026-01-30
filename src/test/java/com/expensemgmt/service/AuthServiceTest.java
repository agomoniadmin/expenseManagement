package com.expensemgmt.service;

import com.expensemgmt.domain.entity.RefreshToken;
import com.expensemgmt.domain.entity.User;
import com.expensemgmt.domain.enums.UserRole;
import com.expensemgmt.dto.request.LoginRequest;
import com.expensemgmt.dto.request.RegisterRequest;
import com.expensemgmt.dto.request.RefreshTokenRequest;
import com.expensemgmt.dto.response.AuthResponse;
import com.expensemgmt.exception.DuplicateEntityException;
import com.expensemgmt.repository.RefreshTokenRepository;
import com.expensemgmt.repository.UserRepository;
import com.expensemgmt.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;

    @InjectMocks private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .passwordHash("encoded_password")
                .primaryRegion("us-east-1")
                .role(UserRole.USER)
                .firstName("Test")
                .lastName("User")
                .build();
    }

    @Test
    void register_shouldCreateUserAndReturnTokens() {
        RegisterRequest request = new RegisterRequest(
                "new@example.com", "SecurePass123!", "New", "User", "us-east-1");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123!")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(jwtTokenProvider.generateAccessToken(any(), anyString(), anyString(), anyString()))
                .thenReturn("access_token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("refresh_token");
        when(jwtTokenProvider.getAccessTokenExpiry()).thenReturn(3600L);
        when(jwtTokenProvider.getRefreshTokenExpiryMs()).thenReturn(604800000L);
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("access_token", response.accessToken());
        assertEquals("refresh_token", response.refreshToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("new@example.com", response.user().email());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_shouldThrowWhenEmailExists() {
        RegisterRequest request = new RegisterRequest(
                "existing@example.com", "SecurePass123!", "Test", "User", null);

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(DuplicateEntityException.class, () -> authService.register(request));
    }

    @Test
    void login_shouldReturnTokensForValidCredentials() {
        LoginRequest request = new LoginRequest("test@example.com", "password123!", null);

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123!", "encoded_password")).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(any(), anyString(), anyString(), anyString()))
                .thenReturn("access_token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("refresh_token");
        when(jwtTokenProvider.getAccessTokenExpiry()).thenReturn(3600L);
        when(jwtTokenProvider.getRefreshTokenExpiryMs()).thenReturn(604800000L);
        when(userRepository.save(any())).thenReturn(testUser);
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access_token", response.accessToken());
        verify(userRepository).save(testUser);
    }

    @Test
    void login_shouldThrowForInvalidEmail() {
        LoginRequest request = new LoginRequest("wrong@example.com", "password", null);
        when(userRepository.findByEmail("wrong@example.com")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void login_shouldThrowForWrongPassword() {
        LoginRequest request = new LoginRequest("test@example.com", "wrong", null);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrong", "encoded_password")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void refresh_shouldReturnNewTokens() {
        RefreshTokenRequest request = new RefreshTokenRequest("valid_refresh_token");
        RefreshToken token = RefreshToken.builder()
                .userId(testUser.getId())
                .token("valid_refresh_token")
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByToken("valid_refresh_token")).thenReturn(Optional.of(token));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(jwtTokenProvider.generateAccessToken(any(), anyString(), anyString(), anyString()))
                .thenReturn("new_access_token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("new_refresh_token");
        when(jwtTokenProvider.getAccessTokenExpiry()).thenReturn(3600L);
        when(jwtTokenProvider.getRefreshTokenExpiryMs()).thenReturn(604800000L);
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.refresh(request);

        assertEquals("new_access_token", response.accessToken());
        verify(refreshTokenRepository).delete(token);
    }

    @Test
    void refresh_shouldThrowForExpiredToken() {
        RefreshTokenRequest request = new RefreshTokenRequest("expired_token");
        RefreshToken token = RefreshToken.builder()
                .token("expired_token")
                .expiresAt(Instant.now().minusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByToken("expired_token")).thenReturn(Optional.of(token));

        assertThrows(BadCredentialsException.class, () -> authService.refresh(request));
    }
}
