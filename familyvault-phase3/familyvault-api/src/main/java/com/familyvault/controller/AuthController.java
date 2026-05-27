package com.familyvault.controller;

import com.familyvault.dto.auth.AuthResponse;
import com.familyvault.dto.auth.LoginRequest;
import com.familyvault.dto.auth.RefreshRequest;
import com.familyvault.dto.auth.RegisterRequest;
import com.familyvault.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, refresh tokens, and logout")
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/register
     *
     * Two flows:
     *  - No inviteCode → creates a new Family, caller becomes ADMIN. Invite code is returned.
     *  - With inviteCode → joins an existing Family as MEMBER.
     */
    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Create a new family (admin) or join an existing one with an invite code (member).")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    /**
     * POST /api/auth/login
     */
    @PostMapping("/login")
    @Operation(summary = "Login", description = "Authenticate and receive a JWT access token + refresh token.")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(authService.login(request, getClientIp(httpRequest)));
    }

    /**
     * POST /api/auth/refresh
     *
     * Exchange a valid refresh token for a new access token.
     * The old refresh token is rotated (invalidated) and a new one is issued.
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Uses a refresh token to issue a new access token (token rotation).")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.getRefreshToken()));
    }

    /**
     * POST /api/auth/logout
     *
     * Invalidates the refresh token in Redis so it can never be used again.
     */
    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Invalidates the refresh token server-side.")
    public ResponseEntity<Void> logout(
            @Valid @RequestBody RefreshRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.logout(request.getRefreshToken(), getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
