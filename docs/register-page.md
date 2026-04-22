# Register page

## Route / path

- **`/register`** (`LanguageGate`; if already fully registered, redirect `/`)

## Purpose

Multi-step onboarding: verify **email** or **phone**, set password, collect profile (gender, birthday, Tokyo ward, nickname, legal consents, basics, interests, attribution), upload photos, complete registration. Uses JWT from pending session after password step.

## UI components

- `RegisterPage.jsx`: step machine (`STEP_ORDER`), `ProgressBar`, forms per step
- `tokyoWardI18n` for ward labels
- File inputs for up to 6 photos (`MAX_PHOTOS`), previews with object URLs

## User flow (simplified)

1. **method** — choose email vs phone.
2. **contact** — enter email or phone (+ optional email for phone path).
3. **verify** — request code, enter OTP.
4. **password** — create password → receives `pendingSessionToken` / JWT depending on API.
5. Profile steps: gender → birthday → location (wards from API) → nickname → legal → basics → interests → attribution → photos → done.
6. **complete** — `multipart/form-data` with `photos[]` → then `GET /me` to confirm.

## API endpoints

| Step | Method | Path | Notes |
|------|--------|------|--------|
| Tokyo wards | GET | `/auth/registration/tokyo-wards` | Public |
| Bootstrap | GET | `/me` | With token when resuming |
| Status | GET | `/auth/registration/status` | With Bearer |
| Send email code | POST | `/auth/registration/email/send` | `{ email }` |
| Send phone code | POST | `/auth/registration/phone/send` | `{ phone, email? }` |
| Verify email | POST | `/auth/registration/email/verify` | `{ email, code }` |
| Verify phone | POST | `/auth/registration/phone/verify` | `{ phone, code }` |
| Create password | POST | `/auth/registration/password` | `{ pendingSessionToken, password }` |
| Patch profile draft | PUT | `/auth/registration/profile` | JSON body (displayName, bio, gender, birthday, city, interests, lifestyle, discoverySettings, etc.) |
| Complete | POST | `/auth/registration/complete` | `multipart/form-data`: `photos` files |
| After complete | GET | `/me` | Refresh full profile |

### Example: email verify response (shape varies)

Server returns session/token material consumed by the client for subsequent authenticated registration calls.

### Example: complete registration

- **Content-Type:** `multipart/form-data`
- **Fields:** `photos` — one or more image files

## State management

- **Local:** extensive step state (`step`, `method`, `contact`, `code`, `pendingSessionToken`, profile fields, `photoFiles`, etc.)
- **Token:** `localStorage.token` updated when JWT is issued

## Navigation

- **From:** `/login` when `registrationComplete === false`
- **To:** `/` after successful completion (via `onRegister` / navigate in flow)

## Related backend docs

See `backend/docs/auth-api.md` for full registration API details.
