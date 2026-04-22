# Login page

## Route / path

- **`/login`** (wrapped in `LanguageGate` in `App.jsx`)

## Purpose

Authenticate with **email** or **Japan phone** + password; store JWT; route to Discover (`/`) or onboarding (`/register`) if `registrationComplete === false`.

## UI components

- `LoginPage.jsx`: form (`form-group`, `form-input`), password visibility toggle, links to register
- Layout: `auth-page-root`, card styling

## User flow

1. User enters login id (email if contains `@`, else treated as phone) and password.
2. Submit → `POST /auth/login` (Authorization header stripped for this path via `api.js`).
3. On success: `localStorage.token`, `onLogin` updates parent user state, navigate to `/` or `/register`.
4. On failure: show `error` from response `error` field or generic message.

## API endpoints

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/auth/login` | `{ email?: string, phone?: string, password: string }` | `{ token, userId, registrationComplete?, onboardingStep? }` |

### Example request

```json
{ "email": "user@example.com", "password": "secret" }
```

### Example response

```json
{
  "token": "<jwt>",
  "userId": 42,
  "registrationComplete": true,
  "onboardingStep": ""
}
```

### Errors

- **401** — `{ "error": "invalid creds" }` (or similar)

## Input fields

| Field | Notes |
|-------|--------|
| Login id | Single field; if it includes `@`, sent as `email`, else as `phone` |
| Password | Required |

## State management

- **Local:** `loginId`, `password`, `error`, `loading`, `showPassword`
- **Parent:** `App` `user` via `onLogin` + subsequent `fetchMe` with token

## Navigation

- **To:** `/` (complete users), `/register` (incomplete registration)
- **Links:** Register page
