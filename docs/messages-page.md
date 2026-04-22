# Messages page (chat thread)

## Route / path

- **`/messages/:matchId`**

## Purpose

Load and display messages for a match; send text; mark read; optional **AI** icebreaker and reply ideas; **WebSocket** updates; block peer / delete match.

## UI components

- `MessagesPage.jsx`: message list, composer, peer header, overflow menu
- `createMatchChatSocket` from `chatSocket.js` → `WebSocket` to `/ws/chat?token=…`

## User flow

1. `GET /matches/{matchId}/messages?page=0` → `content` array; then `POST /matches/{matchId}/read`.
2. Open WebSocket; on `type: "chat"` for this match, reload messages silently.
3. Empty thread: auto `POST /matches/{matchId}/assistant/icebreaker` once, then reload.
4. User can request **reply ideas**: `POST /matches/{matchId}/assistant/reply-ideas` with body `{ tone: "warm and playful" }`.
5. Send message: `POST /matches/{matchId}/messages` with `{ body }`.
6. Menu: **Delete match** `DELETE /matches/{matchId}`; **Block** `POST /blocks/{peerUserId}` (+ delete match).

## API endpoints

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/matches/{matchId}/messages?page=0` | Paginated thread |
| POST | `/matches/{matchId}/read` | Mark read |
| POST | `/matches/{matchId}/messages` | `{ body: string }` |
| GET | `/matches` | Resolve peer from list |
| GET | `/ai/capabilities` | `llmConfigured` for UI |
| GET | `/me` | AI quota / entitlements for chat-reply |
| POST | `/matches/{matchId}/assistant/icebreaker` | Seed assistant greeting |
| POST | `/matches/{matchId}/assistant/reply-ideas` | `{ tone?: string }` |
| DELETE | `/matches/{matchId}` | Leave match |
| POST | `/blocks/{userId}` | Block peer |

### Example: list messages response

```json
{
  "content": [
    {
      "id": 1,
      "body": "Hey!",
      "createdAt": "2026-04-10T10:00:00Z",
      "senderId": 2,
      "messageKind": "user",
      "isAssistant": false,
      "isFromCurrentUser": true
    }
  ],
  "number": 0,
  "size": 1
}
```

### Example: send message response

```json
{ "id": 123 }
```

## Realtime

- **URL:** `VITE_WS_URL` or same host as API with path `/ws/chat`
- **Query:** `token=<JWT>`
- **Payload (example):** `{ "type": "chat", "matchId": 5 }` → client refetches messages

## State management

- **Local:** messages, peer, loading, reply ideas, AI quota, menu, etc.

## Navigation

- **From:** `MatchesPage` list
- **Back:** user navigates via UI to `/messages`

## Related backend docs

`backend/docs/messages-api.md`, `backend/docs/discover-media-ai-api.md` (assistant + AI)
