# Texzy Server

NestJS + TypeORM + PostgreSQL backend for Texzy.

## Important

This app connects to an **existing** PostgreSQL schema.

- `DB_SYNCHRONIZE` must remain `false`
- NestJS will **not** create, drop, or alter tables

## Setup

```bash
cp .env.example .env
# fill DB + JWT + Google client IDs
npm install
npm run start:dev
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

## Auth APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Business register (optional `googleRegistrationToken`) |
| POST | `/api/auth/login` | No | Email/password login |
| POST | `/api/auth/refresh` | No | Rotate tokens |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/auth/logout` | Bearer | Revoke session(s) |
| POST | `/api/auth/google` | No | Google Sign-In (ID token) |

### Google Sign-In flow

1. RN sends Google `idToken` to `POST /api/auth/google`
2. Backend verifies with `google-auth-library` (signature, issuer, audience, expiry)
3. Uses Google `sub` as `users.google_id`
4. Outcomes:
   - **Existing `google_id`** → normal JWT login response
   - **New Google user** → `{ requiresBusinessRegistration: true, registrationToken }`
   - **Email exists, `google_id` null** → `{ code: "ACCOUNT_CONFLICT" }` (no auto-link)
5. Complete business signup via `POST /api/auth/register` with `googleRegistrationToken`

## CRUD modules

Swagger-documented CRUD for: products, needs, profiles, categories, collections, conversations, deals, users (read).

## License

MIT
