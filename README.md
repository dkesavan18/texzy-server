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

## API response format

Every endpoint returns the same JSON envelope. The **HTTP status code** is set on the response (e.g. `401 Unauthorized`) — it is **not** repeated inside the body.

**Success** (HTTP 2xx):

```json
{
  "success": true,
  "error": null,
  "data": {}
}
```

**Error** (HTTP 4xx / 5xx):

```json
{
  "success": false,
  "error": "Human-readable message or validation error array",
  "data": null
}
```

## User roles

`users.role_id` references `categories.category_id`:

| category_id | Role | Assigned when |
|-------------|------|----------------|
| 1 | Admin | `POST /api/auth/admin/register` (existing admin only) |
| 2 | Buyer | `POST /api/auth/register` with `accountType: "customer"` |
| 3 | Seller (business) | `POST /api/auth/register` with `accountType: "business"` |

Ensure these three role rows exist in `categories` before using auth.

## Auth APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register buyer or seller (role auto-assigned) |
| POST | `/api/auth/admin/register` | Admin JWT | Create another admin account |
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
