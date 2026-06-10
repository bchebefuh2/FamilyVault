package com.familyvault.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private String userId;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private String familyId;
    private String familyName;
    private String inviteCode;  // only returned on registration (admin)
}
