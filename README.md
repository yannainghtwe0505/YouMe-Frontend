# YouMe — Frontend (React SPA)

Single-page application for **YouMe**: login/register, discovery feed, likes, matches, chat, profile editing, and photo upload helper UI. Talks to the **Spring Boot API** over HTTP.

**Related docs:** [PROJECT_SPEC.md](./PROJECT_SPEC.md) (routes, stack, how features map to API calls).

---

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **npm** (or use `pnpm` / `yarn` if you prefer—adjust commands)

---

## Run locally (development)

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (port **5179**; dev server binds all interfaces via `vite.config.js`).

**API / SPA URLs:** `.env.development` → `VITE_API_URL`, `VITE_PUBLIC_APP_URL`. Central reader: `src/config/urls.js`. See [../docs/ENVIRONMENT_URLS.md](../docs/ENVIRONMENT_URLS.md). Backend CORS is driven by `app.urls.cors-allowed-origin-patterns`.

---

## Build for production

```bash
npm run build
npm run build:staging   # uses .env.staging
```

Output: **`dist/`** — static files you can host on any CDN, object storage, or reverse proxy (e.g. Nginx) in front of the API.

```bash
npm run preview   # local preview of production build
```

---

## Project layout

```
src/
  App.jsx           Routes, auth shell, bottom navigation
  App.css           App-wide layout, cards, buttons, discover UI
  api.js            Axios instance, JWT on requests, 401 handling
  index.css         Design tokens (CSS variables), global base styles
  main.jsx          Entry + router root
  pages/
    FeedPage.jsx
    ProfilePage.jsx
    LikesPage.jsx
    MatchesPage.jsx
    MessagesPage.jsx
    PhotosPage.jsx
    LoginPage.jsx
    RegisterPage.jsx
```

---

## Environment / configuration

Use **`.env.development`**, **`.env.staging`**, and **`.env.production`** (see [../docs/ENVIRONMENT_URLS.md](../docs/ENVIRONMENT_URLS.md)). `src/config/urls.js` exposes `API_BASE_URL`, `WS_URL`, and `APP_PUBLIC_URL` to the app.

---

## Backend

The REST API lives in **`../backend`**. Start it before using authenticated screens.
