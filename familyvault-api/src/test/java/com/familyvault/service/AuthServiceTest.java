package com.familyvault.service;

import com.familyvault.dto.auth.LoginRequest;
import com.familyvault.dto.auth.RegisterRequest;
import com.familyvault.dto.auth.AuthResponse;
import com.familyvault.entity.Family;
import com.familyvault.entity.User;
import com.familyvault.entity.enums.Role;
import com.familyvault.exception.ApiException;
import com.familyvault.repository.FamilyRepository;
import com.familyvault.repository.UserRepository;
import com.familyvault.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private FamilyRepository familyRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOps;
    @Mock private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    private User mockUser;
    private Family mockFamily;

    @BeforeEach
    void setUp() {
        mockFamily = Family.builder()
                .id("family-123")
                .name("Smith Family")
                .inviteCode("ABCD1234")
                .build();

        mockUser = User.builder()
                .id("user-456")
                .email("john@example.com")
                .password("hashed-password")
                .firstName("John")
                .lastName("Smith")
                .role(Role.ADMIN)
                .family(mockFamily)
                .build();

        // Wire Redis mock
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
    }

    // ── Register ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("register() - new family - creates ADMIN user and returns invite code")
    void register_newFamily_createsAdminAndReturnsInviteCode() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("john@example.com");
        request.setPassword("securepass");
        request.setFirstName("John");
        request.setLastName("Smith");
        request.setFamilyName("Smith Family");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(familyRepository.save(any(Family.class))).thenReturn(mockFamily);
        when(passwordEncoder.encode("securepass")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(jwtUtil.generateAccessToken(any(), any(), any())).thenReturn("mock-jwt");
        doNothing().when(valueOps).set(anyString(), anyString(), anyLong(), any());

        AuthResponse response = authService.register(request);

        assertThat(response.getEmail()).isEqualTo("john@example.com");
        assertThat(response.getRole()).isEqualTo("ADMIN");
        assertThat(response.getInviteCode()).isEqualTo("ABCD1234");
        assertThat(response.getAccessToken()).isEqualTo("mock-jwt");
        verify(familyRepository).save(any(Family.class));
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("register() - duplicate email - throws ApiException 409")
    void register_duplicateEmail_throwsConflict() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("john@example.com");
        request.setPassword("securepass");
        request.setFirstName("John");
        request.setLastName("Smith");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("register() - valid invite code - joins family as MEMBER")
    void register_withInviteCode_joinsFamilyAsMember() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("jane@example.com");
        request.setPassword("securepass");
        request.setFirstName("Jane");
        request.setLastName("Smith");
        request.setInviteCode("ABCD1234");

        User memberUser = User.builder()
                .id("user-789").email("jane@example.com")
                .firstName("Jane").lastName("Smith")
                .role(Role.MEMBER).family(mockFamily).build();

        when(userRepository.existsByEmail("jane@example.com")).thenReturn(false);
        when(familyRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(mockFamily));
        when(passwordEncoder.encode("securepass")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(memberUser);
        when(jwtUtil.generateAccessToken(any(), any(), any())).thenReturn("mock-jwt");
        doNothing().when(valueOps).set(anyString(), anyString(), anyLong(), any());

        AuthResponse response = authService.register(request);

        assertThat(response.getRole()).isEqualTo("MEMBER");
        assertThat(response.getInviteCode()).isNull(); // members do not receive the invite code
        verify(familyRepository, never()).save(any(Family.class)); // no new family created
    }

    @Test
    @DisplayName("register() - bad invite code - throws ApiException 400")
    void register_invalidInviteCode_throwsBadRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("jane@example.com");
        request.setPassword("securepass");
        request.setFirstName("Jane");
        request.setLastName("Smith");
        request.setInviteCode("INVALID");

        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(familyRepository.findByInviteCode("INVALID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("invite code");
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("login() - valid credentials - returns tokens")
    void login_validCredentials_returnsAuthResponse() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("securepass");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(mockUser));
        when(jwtUtil.generateAccessToken(any(), any(), any())).thenReturn("mock-jwt");
        doNothing().when(valueOps).set(anyString(), anyString(), anyLong(), any());
        doNothing().when(auditService).log(any(), any(), any(), any(), any());

        AuthResponse response = authService.login(request, "127.0.0.1");

        assertThat(response.getAccessToken()).isEqualTo("mock-jwt");
        assertThat(response.getRefreshToken()).isNotNull();
        verify(auditService).log(eq(mockUser), eq("LOGIN"), isNull(), isNull(), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("login() - wrong password - throws BadCredentialsException")
    void login_wrongPassword_throwsBadCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("wrongpass");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request, "127.0.0.1"))
                .isInstanceOf(BadCredentialsException.class);
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("refresh() - valid token - rotates and returns new tokens")
    void refresh_validToken_returnsNewTokens() {
        when(valueOps.get("refresh:valid-refresh-token")).thenReturn("user-456");
        when(redisTemplate.delete("refresh:valid-refresh-token")).thenReturn(true);
        when(userRepository.findById("user-456")).thenReturn(Optional.of(mockUser));
        when(jwtUtil.generateAccessToken(any(), any(), any())).thenReturn("new-jwt");
        doNothing().when(valueOps).set(anyString(), anyString(), anyLong(), any());

        AuthResponse response = authService.refresh("valid-refresh-token");

        assertThat(response.getAccessToken()).isEqualTo("new-jwt");
        verify(redisTemplate).delete("refresh:valid-refresh-token"); // old token rotated out
    }

    @Test
    @DisplayName("refresh() - expired/unknown token - throws ApiException 401")
    void refresh_invalidToken_throwsUnauthorized() {
        when(valueOps.get("refresh:bad-token")).thenReturn(null);

        assertThatThrownBy(() -> authService.refresh("bad-token"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("expired");
    }
}
