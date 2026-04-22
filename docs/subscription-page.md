# Subscription (upgrade) pages

## Routes / paths

- **`/upgrade`** — `UpgradePage.jsx` (plan catalog, checkout, cancel, downgrade)
- **`/upgrade/success`** — `UpgradeSuccessPage.jsx` (confirm Stripe session)

## Purpose

Display **subscription plans** and billing state; start **Stripe Checkout** or **dev demo upgrade**; after return from Stripe, **confirm** session server-side.

## UI components

- `UpgradePage.jsx` + `UpgradePage.css`: plan cards, comparison table, modal, manage subscription actions
- `UpgradeSuccessPage.jsx`: reads `sessionId` from query, calls confirm API

## User flow (`/upgrade`)

1. Parallel `GET /subscription/plans` and `GET /subscription/current`.
2. User chooses plan → `POST /subscription/web/checkout-session` `{ targetPlan: "PLUS" | "GOLD" }`.
3. If response has `checkoutUrl`, redirect browser to Stripe.
4. If `demoUpgradeAvailable`, `POST /me/upgrade` `{ plan }` then redirect to `/upgrade/success?plan=…`.
5. **Cancel subscription:** `POST /subscription/cancel` `{ immediate: boolean }`.
6. **Downgrade (example in UI):** `POST /subscription/downgrade` `{ targetPlan: "PLUS", effective: "IMMEDIATE" }`.

## User flow (`/upgrade/success`)

1. Read `sessionId` from query string (Stripe success URL should pass it).
2. `POST /subscription/upgrade-confirm` `{ sessionId }`.
3. Show success / error UI.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/subscription/plans` | Marketing + price catalog |
| GET | `/subscription/current` | Current plan + Stripe snapshot |
| POST | `/subscription/web/checkout-session` | Create Checkout session |
| POST | `/subscription/upgrade-confirm` | Confirm session after payment |
| POST | `/me/upgrade` | Dev/demo instant plan bump |
| POST | `/subscription/cancel` | Cancel Stripe subscription |
| POST | `/subscription/downgrade` | Lower tier |

## State management

- **UpgradePage:** `catalog`, `billing`, `currentPlan`, modals, loading flags
- **UpgradeSuccess:** one-shot confirm call

## Navigation

- **From:** Profile (“upgrade” link) or Likes upgrade CTA → `/upgrade`
- **To:** Stripe (external), back to `/profile`, success page `/upgrade/success`
- Bottom nav is **hidden** on `/upgrade` routes (`App.jsx`)

## Related backend docs

`backend/docs/subscription-api.md`, `backend/docs/webhook-api.md`
