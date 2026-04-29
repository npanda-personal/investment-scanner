import axios from 'axios';
import type { AuthResponse, AuthUser } from '../types';

const API_BASE = '/api/v1/auth';
export const AUTH_TOKEN_KEY = 'investment_scanner_auth_token';

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    delete axios.defaults.headers.common.Authorization;
  }
}

export function loadStoredToken(): string | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  return token;
}

export async function signup(input: { email: string; password: string; name?: string | null }): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_BASE}/signup`, input);
  setAuthToken(response.data.accessToken);
  return response.data;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_BASE}/login`, input);
  setAuthToken(response.data.accessToken);
  return response.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${API_BASE}/logout`).catch(() => undefined);
  setAuthToken(null);
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await axios.get<AuthUser>(`${API_BASE}/me`);
  return response.data;
}

export async function updateProfile(input: { name?: string | null }): Promise<AuthUser> {
  const response = await axios.patch<AuthUser>(`${API_BASE}/me`, input);
  return response.data;
}
