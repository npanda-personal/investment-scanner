# Auth Identity

## Ownership

`auth-identity` owns MVP real-user authentication, profile identity, token validation, and user context helpers.

It does not own enterprise IAM, SSO, organizations, teams, MFA, password reset email, social login, or advanced RBAC.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/signup` | Create user, hash password, create FREE subscription, return access token |
| `POST /auth/login` | Validate email/password and return access token |
| `POST /auth/logout` | Client-side token invalidation helper |
| `GET /auth/me` | Return current safe user DTO |
| `PATCH /auth/me` | Update basic profile name |

## Auth Strategy

MVP uses email/password authentication with HMAC-signed JWT-style access tokens.

Passwords are hashed using Node `crypto.scrypt` with per-password random salt. Plain passwords are never stored or returned.

Token signing uses:

- `AUTH_SECRET` when configured
- ephemeral development secret when not production

In production, missing `AUTH_SECRET` fails safely.

## Middleware

Exports:

- `requireAuth`
- `optionalAuth`

Authenticated requests receive `req.user` with the safe user DTO.

## Ownership Isolation

Authenticated user context is passed into user-owned modules. New records are owned by the current user.

Protected modules include:

- portfolio-management
- portfolio-intelligence
- watchlist-management
- alerts-monitoring
- backtesting-strategy-lab
- ai-investment-copilot usage gating
- subscription-billing

Existing nullable-owner rows remain readable during migration. Rows owned by another concrete user are filtered out.

## Subscription Integration

Signup creates an `AppUser` with a FREE `UserSubscription`. Subscription Billing now reads user context from authenticated requests instead of `default-user` for normal flows.

## Environment Variables

- `AUTH_SECRET`: required in production, recommended in development.

## Known Limitations

- No token revocation list.
- No refresh token endpoint yet.
- No password reset flow.
- No email verification.
- No OAuth or SSO.
- No organizations or team accounts.

## Verification

Expected verification commands:

- `npx prisma generate`
- `npm run build` in `backend`
- `npm test -- auth-identity --runInBand` in `backend`
- `npm test -- --runInBand` in `backend`
- `npm run build` in `frontend`
