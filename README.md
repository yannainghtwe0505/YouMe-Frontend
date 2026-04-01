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
npm run dev -- --port 5179
```

Open the URL Vite prints (e.g. `http://localhost:5179`).

The API base URL is set in **`src/api.js`** (`baseURL: 'http://localhost:8090'`). Change it if your backend runs elsewhere. Ensure **CORS** on the server allows your dev origin (see `../backend` → `WebConfig.java`).

---

## Build for production

```bash
npm run build
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

There is no `.env` file in the template: **edit `src/api.js`** for `baseURL`, or introduce `import.meta.env.VITE_API_URL` if you want Vite env-based config for multiple deployments.

---

## Backend

The REST API lives in **`../backend`**. Start it before using authenticated screens.
