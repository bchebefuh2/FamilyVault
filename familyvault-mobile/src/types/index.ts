// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MEMBER';
  familyId: string;
  familyName: string;
  inviteCode?: string; // only for new ADMIN registrations
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  familyName?: string; // required if creating a new family
  inviteCode?: string; // required if joining an existing family
}

export interface RefreshRequest {
  refreshToken: string;
}

// ── User / Session ────────────────────────────────────────────────────────────

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MEMBER';
  familyId: string;
  familyName: string;
  inviteCode?: string;
}

// ── Files ─────────────────────────────────────────────────────────────────────

export interface FileMetadata {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedByEmail: string;
  createdAt: string; // ISO date string from the API
}

// ── Navigation ────────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Files: undefined;
  Upload: undefined;
  Profile: undefined;
};

// ── API Errors ────────────────────────────────────────────────────────────────

export interface ApiError {
  title: string;
  detail: string;
  status: number;
  errors?: Record<string, string>;
}
