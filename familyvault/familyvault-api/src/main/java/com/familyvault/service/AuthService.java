package com.familyvault.service;

import com.familyvault.dto.auth.AuthResponse;
import com.familyvault.dto.auth.LoginRequest;
import com.familyvault.dto.auth.RegisterRequest;
import com.familyvault.entity.Family;
import com.familyvault.entity.User;
import com.familyvault.entity.enums.Role;
import com.familyvault.exception.ApiException;
import com.familyvault.repository.FamilyRepository;
import com.familyvault.repository.UserRepository;
import com.familyvault.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String REFRESH_KEY_PREFIX = "refresh:";

    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final StringRedisTemplate redisTemplate;
    private final AuditService auditService;

    @Value("${jwt.refresh-token-ttl-days:7}")
    private long refreshTokenTtlDays;

    // ── Register ─────────────────────────────────────────────────────────────

    /**
     * Creates a new user. Two paths:
     *  - No inviteCode: creates a new Family; caller becomes ADMIN.
     *  - Has inviteCode: looks up existing Family; caller becomes MEMBER.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException("An account with this email already exists.", HttpStatus.CONFLICT);
        }

        Family family;
        Role role;

        if (request.getInviteCode() != null && !request.getInviteCode().isBlank()) {
            // Join an existing family
            family = familyRepository.findByInviteCode(request.getInviteCode().toUpperCase())
                    .orElseThrow(() -> new ApiException("Invalid or expired invite code.", HttpStatus.BAD_REQUEST));
            role = Role.MEMBER;
        } else {
            // Create a new family — this user is the admin
            String familyName = (request.getFamilyName() != null && !request.getFamilyName().isBlank())
                    ? request.getFamilyName()
                    : request.getFirstName() + " Family";

            family = Family.builder()
                    .name(familyName)
                    .inviteCode(generateInviteCode())
                    .build();
            family = familyRepository.save(family);
            role = Role.ADMIN;
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(role)
                .family(family)
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {} | family: {} | role: {}", user.getEmail(), family.getName(), role);

        return buildAuthResponse(user);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request, String ipAddress) {
        // Delegates to Spring Security's DaoAuthenticationProvider (throws BadCredentialsException on failure)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApiException("User not found.", HttpStatus.NOT_FOUND));

        auditService.log(user, "LOGIN", null, null, ipAddress);
        return buildAuthResponse(user);
    }

    // ── Refresh Token ─────────────────────────────────────────────────────────

    /**
     * Validates the refresh token in Redis, rotates it, and issues a new access token.
     * Token rotation means: old refresh token is deleted, new one is stored.
     */
    @Transactional(readOnly = true)
    public AuthResponse refresh(String refreshToken) {
        String userId = redisTemplate.opsForValue().get(REFRESH_KEY_PREFIX + refreshToken);

        if (userId == null) {
            throw new ApiException("Refresh token is invalid or has expired. Please log in again.", HttpStatus.UNAUTHORIZED);
        }

        // Rotate: delete old token before issuing new one
        redisTemplate.delete(REFRESH_KEY_PREFIX + refreshToken);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found.", HttpStatus.NOT_FOUND));

        return buildAuthResponse(user);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public void logout(String refreshToken, String ipAddress) {
        // Remove refresh token from Redis — it can never be used to get a new access token
        Boolean deleted = redisTemplate.delete(REFRESH_KEY_PREFIX + refreshToken);

        // Best-effort audit log — user might already be unknown
        if (Boolean.TRUE.equals(deleted)) {
            log.info("User logged out, refresh token invalidated.");
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());

        // Generate a random refresh token (UUID) and store in Redis
        String refreshToken = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
                REFRESH_KEY_PREFIX + refreshToken,
                user.getId(),
                refreshTokenTtlDays,
                TimeUnit.DAYS
        );

        // Only expose the invite code to the family admin on registration
        String inviteCode = (user.getRole() == Role.ADMIN && user.getFamily() != null)
                ? user.getFamily().getInviteCode()
                : null;

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(900L)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .familyId(user.getFamily() != null ? user.getFamily().getId() : null)
                .familyName(user.getFamily() != null ? user.getFamily().getName() : null)
                .inviteCode(inviteCode)
                .build();
    }

    private String generateInviteCode() {
        // 8-character alphanumeric invite code, e.g. "A3F9B2C1"
        return UUID.randomUUID().toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase();
    }
}
