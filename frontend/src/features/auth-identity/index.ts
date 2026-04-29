export { publicAuthIdentityRoutes, protectedAuthIdentityRoutes, ProtectedRoute } from './routes';
export { AuthIdentityProvider, useAuthIdentity } from './hooks';
export { fetchMe, loadStoredToken, login, logout, setAuthToken, signup, updateProfile } from './api/authIdentityService';
export type { AuthResponse, AuthUser } from './types';
