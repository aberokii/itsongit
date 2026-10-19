# Media Uploads

Upload an image, video or document with a presigned URL and attach it to a post with mediaItems.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

When you finish this page a file is uploaded to Zernio's storage and attached to a post.

You need an API key and an `accountId` ([quickstart](/quickstart)).

Uploads go straight to storage through a presigned URL, up to 5 GB per file. It takes 3 calls:

1. `POST /v1/media/presign`
2. A `PUT` of the file
3. `POST /v1/posts` with the returned `publicUrl` in `mediaItems`

A file you already host on a public HTTPS URL skips the first two calls. See [Media URL requirements](#media-url-requirements).

## Step 1: Get an upload URL

Call `POST /v1/media/presign` with `filename` and `contentType`. Pass `size` in bytes to have the 5 GB limit checked before you upload.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import { readFile } from 'node:fs/promises';
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: presigned } = await zernio.media.getMediaPresignedUrl({
  body: {
    filename: 'photo.jpg',
    contentType: 'image/jpeg'
  }
});

const { uploadUrl, publicUrl } = presigned;
```
</Tab>
<Tab value="Python">
```python
import httpx
from zernio import Zernio

client = Zernio()

presigned = client.media.get_media_presigned_url(
    filename="photo.jpg",
    content_type="image/jpeg"
)

upload_url = presigned["uploadUrl"]
public_url = presigned["publicUrl"]
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/media/presign" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "photo.jpg",
    "contentType": "image/jpeg"
  }'
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "uploadUrl": "https://<bucket>.r2.cloudflarestorage.com/temp/1234567890_abc123_photo.jpg?X-Amz-Signature=...",
  "publicUrl": "https://media.zernio.com/temp/1234567890_abc123_photo.jpg",
  "key": "temp/1234567890_abc123_photo.jpg",
  "expiresIn": 3600
}
```

`uploadUrl` is valid for `expiresIn` seconds (1 hour).

`publicUrl` is the address the post uses in Step 3.

## Step 2: Upload the file

`PUT` the file to `uploadUrl` with the same `Content-Type`.

This request goes to storage, not to the API, so it carries no `Authorization` header.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const fileBuffer = await readFile('photo.jpg');

await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: fileBuffer
});
```
</Tab>
<Tab value="Python">
```python
with open("photo.jpg", "rb") as f:
    httpx.put(upload_url, content=f.read(), headers={"Content-Type": "image/jpeg"})
```
</Tab>
<Tab value="curl">
```bash
# UPLOAD_URL is the uploadUrl from Step 1
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```
</Tab>
</Tabs>

Response (`200`), no body. Storage answers with an empty `200` and an `ETag` header, never JSON.

The file is now at `publicUrl`.

## Step 3: Create the post

Call `POST /v1/posts` with `publicUrl` in `mediaItems`.

`type` is `image`, `video`, `gif` or `document`. It is inferred from the file extension when omitted.

A `type` that contradicts the extension is rejected with `400`.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: created } = await zernio.posts.createPost({
  body: {
    content: 'Golden hour at the pier.',
    mediaItems: [
      { url: publicUrl, type: 'image' }
    ],
    platforms: [
      { platform: 'linkedin', accountId: '66b2e19d8c3f5a7e9d0b1c2d' }
    ],
    scheduledFor: '2027-01-01T12:00:00',
    timezone: 'America/New_York'
  }
});

console.log(created.post._id);
```
</Tab>
<Tab value="Python">
```python
created = client.posts.create_post(
    content="Golden hour at the pier.",
    media_items=[
        {"url": public_url, "type": "image"}
    ],
    platforms=[
        {"platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d"}
    ],
    scheduled_for="2027-01-01T12:00:00",
    timezone="America/New_York"
)

print(created["post"]["_id"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/posts" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Golden hour at the pier.",
    "mediaItems": [
      { "url": "https://media.zernio.com/temp/1234567890_abc123_photo.jpg", "type": "image" }
    ],
    "platforms": [
      { "platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d" }
    ],
    "scheduledFor": "2027-01-01T12:00:00",
    "timezone": "America/New_York"
  }'
```
</Tab>
</Tabs>

Response (`201`):

```json
{
  "message": "Post scheduled successfully",
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "status": "scheduled",
    "scheduledFor": "2027-01-01T17:00:00Z",
    "mediaItems": [
      { "url": "https://media.zernio.com/temp/1234567890_abc123_photo.jpg", "type": "image" }
    ],
    "platforms": [
      { "platform": "linkedin", "status": "pending" }
    ]
  }
}
```

The [presign endpoint](/media/get-media-presigned-url) lists every parameter.

## How it behaves

### Uploads expire after 7 days

An upload sits in temporary storage for 7 days.

When you create or update a post that references its `publicUrl`, Zernio copies the file to permanent storage. A post scheduled or queued weeks or months ahead still publishes with its media.

Create the post within 7 days of uploading. After 7 days the upload is gone.

- Creating a scheduled, queued or `publishNow` post with it returns `400`.
- A draft with it is saved, but scheduling or publishing that draft returns `400`.

### Media URL requirements

Every `mediaItems[].url` must be publicly reachable over HTTPS and return the file itself.

Google Drive, Dropbox, OneDrive and iCloud links do not work. They return an HTML page, not the file, so the platform's servers cannot fetch from them.

Use a direct media URL or upload through the presign endpoint.

**Test a URL** in an incognito window. A webpage instead of the raw file means the post will fail.

### Formats and sizes

`contentType` must be one of the MIME types the [presign endpoint](/media/get-media-presigned-url) accepts. A generic type such as `application/octet-stream` is rejected with `400`.

| Type | Formats |
|------|---------|
| Images | JPEG, PNG, GIF, WebP |
| Videos | MP4, MPEG, MOV, AVI, WebM, M4V |
| Documents | PDF (LinkedIn only) |
| Audio | MP3, M4A, AAC, OGG, WAV, WebM |

**Audio.** Audio has no `mediaItems[].type`, so an audio file cannot be attached to a post. Send its `publicUrl` as `attachmentUrl` with `attachmentType: "audio"` on [send inbox message](/messages/send-inbox-message) instead.

**Size caps.** Presign caps every type at 5 GB. No type has a smaller cap.

**Platform limits.** Platforms are stricter. A LinkedIn document must be a PDF of 100 MB or less.

Each platform's limits on count, size, duration and aspect ratio are under "Media requirements" on its [platform page](/platforms).

### Zernio compresses files above a platform's limit

Images and videos above a platform's limit are compressed before upload. Videos over 200 MB may not be.

Bluesky images are recompressed to stay under its 1 MB blob limit.

A custom thumbnail in `mediaItems[].thumbnail` (JPG or PNG, 10 MB max) applies to:

- Facebook video posts
- Facebook Reels
- YouTube videos
- LinkedIn video posts

### `customMedia` replaces `mediaItems` for one platform

`mediaItems` attaches to every platform in the request. To send a different file to one of them, set `customMedia` on that entry:

```json
{
  "content": "Same text, different media per platform",
  "mediaItems": [{ "url": "https://media.zernio.com/temp/1234567890_abc123_photo.jpg", "type": "image" }],
  "platforms": [
    { "platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d" },
    {
      "platform": "instagram",
      "accountId": "66b2e19d8c3f5a7e9d0b1c2e",
      "customMedia": [{ "url": "https://media.zernio.com/temp/1234567890_abc123_square.jpg", "type": "image" }]
    }
  ]
}
```

## If it fails

A `400` from `POST /v1/media/presign` means one of three things:

- `filename` is missing.
- `contentType` is not an accepted MIME type.
- `size` is above 5 GB.

Example:

```json
{
  "error": "Invalid contentType",
  "type": "invalid_request_error",
  "code": "invalid_field_value",
  "param": "contentType"
}
```

Send the file's real MIME type (`image/jpeg`, `video/mp4`, `application/pdf`).

A `PUT` to an `uploadUrl` older than 1 hour is refused by storage. Request a new one.

## Related

- [Presign endpoint](/media/get-media-presigned-url): every parameter and accepted MIME type.
- [Create post](/posts/create-post): `mediaItems`, `customMedia`, `altText` and `thumbnail`.
- [Platforms](/platforms): per-platform media requirements.
- [Multi-tenant publishing](/multi-tenant/publishing): uploading once for many customers.