export interface AuthUserDto {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string | null;
}

export interface AuthResponse {
  user: AuthUserDto;
  accessToken: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}
