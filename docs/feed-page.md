# Feed (Discover) page

## Route / path

- **`/`** — `FeedPage` → renders **`UserList`**
- Related: **`DiscoverSettingsPanel`** (used inside `UserList`)

## Purpose

Card stack / list of suggested profiles (`GET /feed`). User can open detail overlay, **pass** (`POST /dislikes/:id`), **like** (`POST /likes/:id`), **super-like** (`POST /superlikes/:id`). Discovery filters and location: **`PUT /me/discovery-settings`** (radius, lat/lon, min/max age, `discoverySettings`, `lifestyle` maps). Loads viewer profile via **`GET /me`** for merge with discovery defaults.

## UI components

- `FeedPage.jsx` — thin wrapper
- `UserList.jsx` — feed loading, cards, overlay, actions, settings sheet
- `DiscoverSettingsPanel.jsx` — filters UI
- `discoveryDefaults.js` — merge helpers for API maps

## User flow

1. On mount, fetch `/feed` and optionally `/me` for settings merge.
2. User adjusts discovery settings → debounced or explicit save → `PUT /me/discovery-settings`.
3. Swipe / buttons → pass, like, or super-like; on mutual like, backend creates match (response includes `matched`, `matchId` for like endpoints).
4. Block/report flows may live in other surfaces; core feed uses dislike/like/superlike.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/feed` | List of candidate profiles for Discover |
| GET | `/me` | Viewer profile + discovery fields |
| PUT | `/me/discovery-settings` | `maxDistanceKm`, `latitude`, `longitude`, `minAge`, `maxAge`, `discoverySettings`, `lifestyle` |
| POST | `/dislikes/{toUserId}` | Pass |
| POST | `/likes/{toUserId}` | Like; response `{ matched, matchId }` |
| POST | `/superlikes/{toUserId}` | Super like; same response shape |

### Example: `PUT /me/discovery-settings`

```json
{
  "maxDistanceKm": 25,
  "latitude": 35.68,
  "longitude": 139.76,
  "minAge": 22,
  "maxAge": 40,
  "discoverySettings": { "mode": "standard" },
  "lifestyle": { "drinking": "SOCIAL" }
}
```

### Example: `GET /feed` item (illustrative)

Fields typically include user id, name, age, photos, distance, interests, lifestyle-related display data — exact keys are defined by `FeedService` on the backend.

## State management

- **Local (UserList):** feed array, loading/error, selected user, overlay open, discovery form state
- **No global store** — React state + `api` axios instance

## Navigation

- **Bottom nav:** Discover tab → `/`
- **Links:** Profile, Likes, Messages from bottom nav
