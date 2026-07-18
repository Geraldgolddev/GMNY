# GMNY API Reference

Base URL (local): `http://localhost:4000/api/v1`  
OpenAPI UI: `http://localhost:4000/docs`

All responses use JSON. Protected routes require:

```http
Authorization: Bearer <access_token>
```

## Health

### `GET /health`

Public. Verifies process liveness and PostgreSQL connectivity.

## Auth

### `POST /auth/register`

Creates a `USER` account, KYC profile stub, access token, and refresh token.

**Body**

| Field | Rules |
|-------|--------|
| email | valid email |
| password | ≥12 chars, upper, lower, number, special |
| firstName | 1–100 |
| lastName | 1–100 |

### `POST /auth/login`

Returns user + tokens. Failed attempts return generic `INVALID_CREDENTIALS`.

### `POST /auth/refresh`

Rotates refresh token (old token revoked) and returns new token pair fields.

### `POST /auth/logout`

Requires Bearer access token. Optionally revoke a specific refresh token; otherwise revoke all sessions for the user.

### `GET /auth/me`

Returns the authenticated user profile.

## Users

### `GET /users`

`ADMIN` only. Lists users for the operations console.

## Error shape

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": ["password: Password must contain a number"],
  "path": "/api/v1/auth/register",
  "timestamp": "2026-07-18T00:00:00.000Z"
}
```
