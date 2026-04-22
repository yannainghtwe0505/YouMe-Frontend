# Matches page (conversation list)

## Route / path

- **`/messages`** — lists matches (not to be confused with thread view)

## Purpose

Show all **matches** with peer avatar, name, last message preview, unread count. Entry point before opening a chat.

## UI components

- `MatchesPage.jsx`: `matches-list`, `matches-row` as `Link` to thread

## User flow

1. `GET /matches` on mount.
2. User taps row → navigate to `/messages/:matchId`.

## API endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | `/matches` | Array of match summary objects |

### Typical row fields

- `matchId`, `peerUserId`, `peerName`, `peerAvatar`
- `lastMessageBody`, `lastMessageAt`, `unreadCount`

(Exact shape from `MatchQueryService.listMatchesForUser`.)

## State management

- **Local:** `matches`, `loading`, `error`

## Navigation

- Bottom nav → **Messages** → `/messages`
- Each row → **`/messages/{matchId}`**
- Empty state CTA → **`/`** (Discover)
