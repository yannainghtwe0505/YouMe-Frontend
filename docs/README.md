# Frontend documentation index

Single-page application (React + Vite + React Router + i18next). API base URL: **`VITE_API_URL`** in `.env.*` (see `src/config/urls.js` and [../../docs/ENVIRONMENT_URLS.md](../../docs/ENVIRONMENT_URLS.md)). WebSocket chat: **`VITE_WS_URL`** or derived from API URL → `ws(s)://…/ws/chat?token=…`.

| Document | Route(s) |
|----------|----------|
| [language-select-page.md](./language-select-page.md) | `/language` |
| [login-page.md](./login-page.md) | `/login` |
| [register-page.md](./register-page.md) | `/register` |
| [feed-page.md](./feed-page.md) | `/` (Discover) |
| [likes-page.md](./likes-page.md) | `/likes` |
| [matches-page.md](./matches-page.md) | `/messages` |
| [messages-page.md](./messages-page.md) | `/messages/:matchId` |
| [photos-page.md](./photos-page.md) | `/photos` |
| [profile-page.md](./profile-page.md) | `/profile` |
| [subscription-page.md](./subscription-page.md) | `/upgrade`, `/upgrade/success` |

Global shell: `App.jsx` provides bottom navigation (Discover, Likes, Messages, language toggle, Profile), unread badge (`GET /matches/unread-total`), session restore (`GET /me`), and `PUT /me/locale` when cycling language.

Backend API reference: `backend/docs/README.md`.
