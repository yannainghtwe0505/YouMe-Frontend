# Photos page

## Route / path

- **`/photos`**

## Purpose

Manage up to **6** profile photos: list, set primary, delete, upload via **S3 presigned PUT** (`POST /photos/presign` → browser `PUT` to `uploadUrl` → `POST /photos/complete`).

## UI components

- `PhotosPage.jsx`: grid/list, file input, loading states

## User flow

1. `GET /photos` → `{ id, url, primary }[]`.
2. **Upload:** `POST /photos/presign?filename=&contentType=` → `PUT` file to `uploadUrl` with `Content-Type` → `POST /photos/complete?s3Key=`.
3. **Primary:** `PUT /photos/{id}/primary`.
4. **Delete:** `DELETE /photos/{id}`.

## API endpoints

| Method | Path | Notes |
|--------|------|--------|
| GET | `/photos` | Own photos |
| POST | `/photos/presign` | Query: `filename`, `contentType` |
| POST | `/photos/complete` | Query: `s3Key` |
| PUT | `/photos/{id}/primary` | |
| DELETE | `/photos/{id}` | |

### Example: presign response

```json
{
  "uploadUrl": "https://bucket.s3...",
  "s3Key": "user/42/uuid.jpg"
}
```

### Example: complete response

```json
{ "id": 10, "s3Key": "user/42/uuid.jpg" }
```

## Errors

- **400** — max photos reached
- **503** — presign not configured on server

## State management

- **Local:** `photos`, `listLoading`, `uploading`, `busyPhotoId`, `error`

## Navigation

- Typically from **Profile** via link to `/photos`
