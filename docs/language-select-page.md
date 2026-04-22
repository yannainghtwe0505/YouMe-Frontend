# Language select page

## Route / path

- **`/language`** (query: `?next=/login` or other safe internal path)

## Purpose

First-visit gate: user picks **en**, **ja**, or **my** before login/register. Persists choice in `localStorage` and i18n; does **not** call the backend until the user is authenticated (locale sync happens later via `PUT /me/locale` in `App.jsx`).

## UI components

- Centered card with locale buttons (`LanguageSelectPage.jsx`)
- Uses `react-i18next` and `../lib/locale` (`APP_LOCALES`, `markLanguageGateComplete`)

## User flow

1. Unauthenticated user hits a protected or auth route → `LanguageGate` redirects to `/language?next=…`.
2. User selects a language → `i18n.changeLanguage`, `LANG_STORAGE_KEY` updated, `markLanguageGateComplete()`.
3. Navigate to `next` (default `/login`).

## API calls

None on this page.

## State management

- **Local React state:** `selected` locale code.
- **URL:** `useSearchParams` → `next` path (validated: must start with `/`, not `//`).

## Navigation

- **From:** automatic redirect from `LanguageGate` in `App.jsx`.
- **To:** `next` query param (typically `/login` or `/register`).
