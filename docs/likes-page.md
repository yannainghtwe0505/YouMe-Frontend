# Likes page

## Route / path

- **`/likes`**

## Purpose

Two tabs: **Liked you** (inbound) and **You liked** (outbound). Inbound list is **subscription-gated**: Free plan shows count + blurred placeholders only (data from API); Plus/Gold shows full likers with like-back.

## UI components

- `LikesPage.jsx`: tabs, lists, upgrade banner for locked state, toast for actions
- Cards: `likes-row`, `matches-avatar`, buttons

## User flow

1. Load `GET /likes/inbound` and `GET /likes` in parallel.
2. **Inbound payload** (object):
   - **Free:** `{ plan, likes_count, locked: true, placeholders: [{ slot }, …] }` — no real user ids
   - **Plus/Gold:** `{ plan, likes_count, locked: false, likes: [...] }`; Gold may include `gold_features`
3. User taps **Like back** → `POST /likes/{fromUserId}` → optional navigate to `/messages/{matchId}` on match.

## API endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | `/likes/inbound` | Gated map (see above) or legacy array |
| GET | `/likes` | Array of outbound like rows |
| POST | `/likes/{fromUserId}` | `{ matched: boolean, matchId: number \| null }` |

### Example: inbound (Free)

```json
{
  "plan": "free",
  "likes_count": 37,
  "locked": true,
  "placeholders": [{ "slot": 0 }, { "slot": 1 }]
}
```

### Example: inbound (Plus)

```json
{
  "plan": "plus",
  "likes_count": 2,
  "locked": false,
  "likes": [
    {
      "id": 1,
      "fromUserId": 9,
      "fromUserName": "Alex",
      "fromUserAvatar": "https://...",
      "superLike": false,
      "createdAt": "2026-04-01T12:00:00Z"
    }
  ]
}
```

### Example: outbound row

Includes `toUserId`, `toUserName`, `toUserAvatar`, `matched`, `matchId`, `superLike`, `createdAt`.

## State management

- **Local:** `inboundPayload`, `outbound`, `tab`, `loading`, `error`, `actionBusyId`, `actionMsg`

## Navigation

- Bottom nav → **Likes**
- Upgrade banner → **`/upgrade`**
- After match from like-back → **`/messages/{matchId}`**
