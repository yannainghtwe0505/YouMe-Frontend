# Profile page

## Route / path

- **`/profile`**

## Purpose

View and edit **profile** (`GET /me`, `PUT /me/profile` or `POST /me/profile` if missing), **geolocation** hints, **AI profile tips** (`POST /me/assistant/profile-tips`), **change password** (`PUT /me/password`), **delete account** (`DELETE /me`). Shows subscription tier and link to upgrade.

## UI components

- `ProfilePage.jsx`: view/edit modes, forms, AI tips section, password form, delete confirmation (email match), links to `/photos`, `/upgrade`

## User flow

1. Initial `GET /me` → `normalizeProfile` maps API fields to form state.
2. Edit → `PUT /me/profile` with `profileToPayload` (displayName, bio, distanceKm, city, education, occupation, hobbies, birthday/age, gender, interests, lat/lon).
3. If 404 on `/me`, optional **create profile** path with `POST /me/profile`.
4. **AI tips:** `POST /me/assistant/profile-tips` with optional `{ locale }` → displays `tips` array and quota info in response.
5. **Password:** `PUT /me/password` `{ currentPassword, newPassword }`.
6. **Delete:** `DELETE /me` after typing email to confirm.

## API endpoints

| Method | Path | Body |
|--------|------|------|
| GET | `/me` | Full session + profile (`MeResponse`) |
| PUT | `/me/profile` | Partial `ProfileEntity` fields |
| POST | `/me/profile` | Create when no profile exists |
| POST | `/me/assistant/profile-tips` | Optional `{ locale }` |
| PUT | `/me/password` | `{ currentPassword, newPassword }` |
| DELETE | `/me` | No body |

### Example: `GET /me` (abbreviated)

```json
{
  "userId": 1,
  "email": "a@b.com",
  "registrationComplete": true,
  "name": "Sam",
  "bio": "...",
  "avatar": "https://...",
  "photos": ["https://..."],
  "subscriptionPlan": "FREE",
  "isPremium": false,
  "locale": "en",
  "aiQuota": { "usedToday": 0, "dailyLimit": 3, "remaining": 3, "fairUseCap": false },
  "aiEntitlements": {}
}
```

## Input fields (edit mode)

Display name, age or birthday, gender, interests (comma text), location, bio, discover distance, education, work, hobby, optional lat/lon from browser geolocation.

## State management

- **Local:** `profile`, `editedProfile`, `newProfile`, editing flags, tips, password, delete confirmation
- **Refresh:** `GET /me` on visibility when not editing

## Navigation

- Bottom nav → **Profile**
- **Photos** → `/photos`
- **Upgrade** → `/upgrade`
- **Logout** — parent `onLogout` clears token (not an API call)

## Note

Locale switching for logged-in users is primarily in **`App.jsx`** (`PUT /me/locale`), not on this page.
