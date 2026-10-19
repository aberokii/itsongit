# Zernio API: technical spec for @itsongit Instagram Reels pipeline

Scope: one Instagram account (@itsongit), Instagram only, about 5 Reels a day from a Python script. Each Reel has a custom cover, a caption, a fixed daily time and a comment-to-DM automation. Analytics and comment/inbox handling are in scope too.

Every fact below comes from the Zernio docs saved in this folder. The source page is named in brackets, e.g. `[posts_create-post.md]`. `[openapi.yaml]` means the official spec at `https://zernio.com/openapi.yaml`. It is the source of the `platforms[]`, `MediaItem` and `InstagramPlatformData` schemas, which the markdown reference pages do not expand. I downloaded it for reference only and did not save it in this folder. Nothing here has been tested, because there is no API key yet.

Status of the doc pages: the docs date the messages meter from 1 October 2026, so they are current as of Oct 2026.

---

## 1. Basics

### Base URL and auth
- Base URL: `https://zernio.com/api/v1` [quickstart.md]. In this spec, paths are written `/v1/...`; the full URL is `https://zernio.com/api/v1/...`.
- Auth header: `Authorization: Bearer sk_...` [quickstart.md]
- Key format: `sk_` followed by 64 hex characters, 67 characters in total. Zernio stores only a SHA-256 hash and never shows the key again [quickstart.md].
- Creating a key: dashboard, then `https://zernio.com/dashboard/api-keys`, then **Create API key**. Copy the key at once [quickstart.md]. Keys can also be managed through the API (`/v1/api-keys`, see llms.txt: create-api-key, list-api-keys, delete-api-key). Restricted keys start with `zrk_` [guides_error-handling.md].
- Python SDK: `pip install zernio-sdk`, then `from zernio import Zernio; client = Zernio()`. It reads the `ZERNIO_API_KEY` env var [quickstart.md].
- Field names are camelCase. **Unknown or snake_case keys are silently dropped, not rejected.** For example, `scheduled_for` in a raw JSON body leaves the post as a draft [guides_error-handling.md]. The Python SDK takes snake_case kwargs (`scheduled_for=`, `media_items=`) and converts them. A raw `requests` body must use camelCase.

### Rate limits [guides_rate-limits.md]
| Connected accounts (team-wide) | Requests/min | Analytics endpoints, requests/sec |
|---|---|---|
| 0-2 (free), which is our case with 1 IG account | **60** | **6** |
| 3-2,000 | 600 | 10 |
| 2,001+ | 1,200 | 20 |

- The window slides. Read `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (unix seconds) on every response. On a `429`, wait `Retry-After` seconds.
- The analytics per-second window covers: `GET /v1/analytics`, `/analytics/delta`, `/analytics/best-time`, `/analytics/content-decay`, `/analytics/daily-metrics`, `/analytics/format-breakdown`, `/analytics/post-timeline` and `/analytics/posting-frequency`.
- **Posting velocity caps (per account):** 25 posts/hour. Daily cap: **Instagram 100**. A post rejected by these caps returns `429` with the cooldown in the message.
- Instagram itself allows 100 posts per rolling 24h, all content types combined [platforms_instagram.md].
- Legacy AppSumo plans have lower caps of 5, 8 or 20 per account per day. Not relevant unless the account is an AppSumo one [guides_rate-limits.md].
- The API key `429` body has no `code`:
  ```json
  {"error":"Rate limit exceeded. Please retry after 12 seconds.","details":{"currentCount":601,"limit":600,"retryAfterSeconds":12}}
  ```
- Zernio retries platform-side `429`/`5xx` up to 3 times itself.
- Post analytics are cached for 60 min. Follower stats refresh daily.
- Account cooldown: `SocialAccount.rateLimitedUntil` [accounts_list-accounts.md]. It starts after a `user_abuse` failure, or after 10 or more failures within an hour. It lasts 10, 20, 40 or 80 minutes, doubling up to 24h. While it is active, `POST /v1/posts` returns `429`.

### Idempotency [guides_idempotency.md, posts_create-post.md]
- Header: `Idempotency-Key: <uuid>`, at most 255 characters (`400` if longer). Window: 24h. Scope: your user.
- `POST /v1/posts`:
  - A retry with the same key returns **200** and the original post (`"message": "Post already exists (idempotent retry)"`). It matches **on the key alone, not on the body**.
  - While the first request is still processing, a retry gets `409` with `code: "idempotency_conflict"` and a `Retry-After` header.
  - A new post always returns `201`.
- Layer 2: `x-request-id` header. A retry counts only when the content fingerprint also matches. It returns 200, or `202` with `postId` while the original is still being saved.
- Layer 3: **content-hash dedup**. Same `(platform, accountId, content + media URLs)` within 24h returns `409`:
  ```json
  {"error":"This exact content is already scheduled, publishing, or was posted to this account within the last 24 hours.","details":{"accountId":"...","platform":"instagram","existingPostId":"..."}}
  ```
  Failed or cancelled posts do not block a resend.
- Order of checks: Idempotency-Key, then x-request-id, then content hash, then create.
- Other endpoints that take `Idempotency-Key`: create profile, send inbox message, reply to comment, and others. There, same key with a different body returns `422`, a request in flight returns `409`, and a replay carries the `Idempotent-Replayed: true` header. **Only 2xx responses are stored for replay.**
- The **Python SDK** takes it as `client.posts.create_post(idempotency_key=..., ...)` [guides_idempotency.md]. The quickstart says "The Python client takes no key" for `send_inbox_message` [quickstart.md]. Use raw HTTP there if you need idempotent DMs.

### Error envelope [guides_error-handling.md]
```json
{"error":"budgetAmount is required","type":"invalid_request_error","code":"missing_required_field","param":"budgetAmount"}
```
- Fields:
  - `error`: human-readable, unstable. Never branch on it.
  - `type`: stable. One of `invalid_request_error`, `authentication_error`, `permission_error`, `not_found`, `rate_limit_error`, `platform_error`, `api_error`.
  - `code`: stable.
  - `param`, `details`, `platform`, `platformError`, `docUrl`.
- Some responses predate the envelope and carry only `error`/`details`: the API key `429`, the plan-cap `403` on `POST /v1/profiles`, and the invalid `timezone` `400` on `POST /v1/posts`.
- **`207` is a 2xx.** `publishNow` or retry return it when at least one platform failed. Branch on the status code or on `post.status`.
- Codes relevant to us:
  - `missing_credentials` / `invalid_credentials` (401).
  - `ACCOUNT_DISCONNECTED` (403 on create post).
  - `ads_connection_required` (409, the account needs reconnecting).
  - `rate_limited`.
  - `temporarily_unavailable` (503, respect `Retry-After`).
  - `queue_slot_conflict` (409 on PUT post).
  - `PLATFORM_BETA_RESTRICTED`.
- A scheduled post that fails later returns no error envelope. The result lands on the post: `status: "failed"|"partial"` plus `platforms[].errorMessage`, `errorCategory` and `errorSource`.

### Pricing and plan limits [pricing.md, pricing_messages.md]
- Billing is per connected account. **Accounts 1-2 are free, with no credit card**, so 1 IG account costs $0/month. Accounts 3-10 cost $6 each.
- "Every account, free or paid, includes full API access, unlimited posts, all 16 platforms, analytics, inbox and ads." Posts are unlimited, subject only to the velocity and daily caps above.
- **Outbound messages meter** (from 1 Oct 2026): the first **10,000/month free** per team, then $0.0001/message. Instagram DMs count, and that includes our comment-to-DM DMs. **Comment replies do not count.** Failed sends do not count.
  - With no card on file: the owner gets an email at 7,500, and the send that would pass 10,000 fails with `403`, code `message_allowance_exceeded`.
  - No endpoint reports the running count.
- At 5 Reels a day, the 2-free-account tier covers us. We stay within 60 req/min and 6 analytics req/s. DMs stay free up to 10k/month, about 330 DMs a day. Beyond that, put a card on file or the DMs start failing.
- Several pages mention an "Analytics add-on" or "Inbox addon" (`analytics_addon_required`, `INBOX_REQUIRED`). The docs say these belong to **legacy plans only** [guides_error-handling.md, workflows.md].

---

## 2. Profiles and accounts

### List and create profiles [profiles_list-profiles.md]
- `GET /v1/profiles`. Optional query: `includeOverLimit`, `name` (exact), `externalId` (exact), `limit`, `skip`.
  - Response: `{ profiles: Profile[], total?, skip?, limit? }`.
  - `Profile` fields: `_id`, `name`, `description`, `color`, `timezone` (null means UTC), `externalId`, `isDefault`, `accountCount`, `createdAt`.
- `POST /v1/profiles`. Body: `name` (required, unique per team), `description`, `color`, `timezone` (IANA), `externalId`. Returns `201 { message, profile }`.
  - A duplicate name returns `409` with `details.existingProfileId`. Takes `Idempotency-Key`.
  - **Set `timezone` on the profile** (e.g. `Asia/Kolkata`, whichever we schedule in). Posts and queues on this profile then default to it.

### List accounts and find the Instagram accountId [accounts_list-accounts.md]
- `GET /v1/accounts?platform=instagram&profileId=<profileId>`. Other optional query parameters:
  - `status` (`connected` or `disconnected`)
  - `search` (case-insensitive on username or display name)
  - `includeOverLimit`, `excludeHidden`, `includeStatusCounts`
  - `page` and `limit`, which must be sent together
- Response: `{ accounts: SocialAccount[], hasAnalyticsAccess: boolean, pagination? }`.
- `SocialAccount` fields:
  - `_id`: **this is the `accountId` used everywhere**
  - `platform` (`"instagram"`), `profileId`, `username`, `displayName`
  - `platformUserId`: on Instagram Login accounts this is the app-scoped id, and the professional `17841...` id is in `metadata.instagramScopedId`. On Facebook Login accounts it is the professional id.
  - `isActive`, `needsReconnection`, `enabled`
  - `followersCount`, `followersLastUpdated`
  - `rateLimitedUntil`
- Posts target accounts by `_id`, never by username. Ids are 24-character hex strings [quickstart.md].
- Python: `client.accounts.list_accounts()`, then `[a for a in r["accounts"] if a["platform"]=="instagram" and a["username"]=="itsongit"][0]["_id"]`.

### Account health
- All accounts: `GET /v1/accounts/health` [guides_error-handling.md]. Filters: `profileId`, `platform`, `status` (`healthy`|`warning`|`error`).
  - Response: `{ summary: {total, healthy, warning, error, needsReconnect}, accounts: [{accountId, platform, username, status, canPost, canFetchAnalytics, tokenValid, needsReconnect, issues[]}] }`.
- One account: `GET /v1/accounts/{accountId}/health` [accounts_get-account-health.md]. Response fields:
  - `status` (`healthy`|`warning`|`error`)
  - `tokenStatus { valid, expiresAt, expiresIn, needsRefresh }`. `needsRefresh` means the token expires within 24h.
  - `permissions { posting[], analytics[], optional[], canPost, canFetchAnalytics, missingRequired[] }`
  - `issues[]`
  - Instagram tokens are also probed live.
- Run a health check before each daily batch. Also subscribe to the `account.disconnected` webhook.

### Connecting the Instagram account [guides_connecting-accounts.md, connect_get-connect-url.md, platforms_instagram.md]
- **Requirement: an Instagram Business or Creator account.** Personal accounts cannot post through the API [platforms_instagram.md, platforms_instagram_reference.md].
- Flow:
  1. Create a profile with `POST /v1/profiles`.
  2. Call `GET /v1/connect/instagram?profileId=<id>&redirect_url=<abs url>` (optional `&loginMethod=instagram_login|facebook_login`). Response: `{ "authUrl": "https://..." }`.
  3. Open `authUrl` in a browser and approve as @itsongit. The browser lands on `redirect_url` with `connected`, `profileId`, `accountId`, `username`, `request_id` and `stage` appended. On failure it gets `error` and `platform` plus optional params.
  4. `GET /v1/accounts` to confirm the account.
- `redirect_url` is optional. It must be an absolute http(s) URL or an app scheme, otherwise `400 INVALID_REDIRECT_URL`.
- Login methods:
  - `instagram_login` (default): no Facebook Page and no selection step.
  - `facebook_login`: authorizes through a Facebook Page linked to the IG professional account, with a Page selection step. **Required for** catalog audio (`audioConfiguration`), the paid partnership label, the `reposts` metric and liking comments. Publishing, analytics, comments and the inbox work with either method.
- **Do not pass a reduced `scopes` list.** The default requests everything: `posting`, `analytics`, `comments` and `messaging`. "A `posting`-only account cannot read analytics or the inbox, and it skips first comments (they need `comments`)" [guides_connecting-accounts.md]. Comment-to-DM needs `comments` and `messaging`.
- Useful extras:
  - `expectedUsername=itsongit` refuses a different account (`error=account_mismatch`).
  - `forceReauth=true` (Instagram Login) forces the IG login page when several accounts are logged in on the device.
  - `reconnectAccountId=<id>` refreshes an existing account.
- Gate: `402 PAYMENT_REQUIRED` with `reason: free_tier_exceeded` only when you pass 2 accounts with no card.

---

## 3. Media upload

### Presigned URL flow [guides_media-uploads.md, media_get-media-presigned-url.md]
1. **Request an upload URL.** `POST /v1/media/presign`
   - Body:
     - `filename` (string, required)
     - `contentType` (string enum, required)
     - `size` (integer bytes, optional): pre-validates the 5 GB cap
   - Accepted `contentType` values [openapi.yaml MediaContentType]:
     - images: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`
     - video: `video/mp4`, `video/mpeg`, `video/quicktime`, `video/avi`, `video/x-msvideo`, `video/webm`, `video/x-m4v`
     - other: `application/pdf`, audio types, `application/x-subrip`, `text/vtt`
     - `application/octet-stream` is rejected with `400`.
   - Request example:
     ```json
     {"filename":"reel_001.mp4","contentType":"video/mp4","size":48211234}
     ```
   - Response `200`:
     ```json
     {"uploadUrl":"https://<bucket>.r2.cloudflarestorage.com/temp/1234567890_abc123_reel_001.mp4?X-Amz-Signature=...",
      "publicUrl":"https://media.zernio.com/temp/1234567890_abc123_reel_001.mp4",
      "key":"temp/1234567890_abc123_reel_001.mp4","expiresIn":3600}
     ```
2. **Upload.** `PUT <uploadUrl>` with the header `Content-Type` set to the same value, and the raw file bytes as the body.
   - **Do not send an Authorization header** to storage.
   - Response: empty `200` plus an `ETag` header, no JSON. `uploadUrl` expires after 1 hour.
   - Python:
     ```python
     httpx.put(upload_url, content=open(p,"rb").read(), headers={"Content-Type":"video/mp4"})
     ```
3. **Use `publicUrl`** in `mediaItems[].url` (video) and in `platformSpecificData.instagramThumbnail` (the cover JPG/PNG, uploaded the same way with `image/jpeg` or `image/png`).

- Limits and lifetime:
  - 5 GB per file at presign.
  - **Uploads live in temp storage for 7 days.** Zernio copies them to permanent storage when a post referencing them is created, so a post scheduled weeks ahead is fine. But **create the post within 7 days of uploading**: after that, scheduled, queued or publishNow creates return `400`.
- `mediaItems[].url` must be public HTTPS and return the file bytes. Google Drive, Dropbox, OneDrive and iCloud links fail.
- You can skip presign by hosting the files yourself on a public HTTPS URL with the correct `Content-Type` and no redirect to HTML [platforms_instagram_media.md].
- Zernio auto-compresses files above platform limits. "Videos over 200 MB may not be" compressed [guides_media-uploads.md].

### Instagram Reel media requirements [platforms_instagram_media.md, platforms_instagram.md]
| Property | Reel |
|---|---|
| Formats | MP4, MOV |
| Max file size | 300 MB |
| Duration | **3 s minimum, 90 s maximum** |
| Aspect ratio | 9:16 |
| Resolution | 1080 x 1920 px |
| Codec | H.264 |
| Frame rate | 30 fps |
| Videos per post | 1 |
| Caption | max 2,200 chars. The first 125 chars show before "more" |

- "A plain post becomes ... a Reel when it is a single video." No `contentType` field is needed for a Reel [platforms_instagram_posts.md].
- Audio codec is not specified in the docs. AAC in MP4 is the safe assumption, but it is not stated.

### Cover/thumbnail requirements [platforms_instagram_fields.md, openapi.yaml]
- `platformSpecificData.instagramThumbnail` (string URL): custom Reel cover, **JPEG or PNG, recommended 1080 x 1920 px** (so 9:16), publicly accessible. "Takes priority over `thumbOffset`. Also accepted as `reelCover`."
  - **No max file size for the IG cover is documented.** The 10 MB limit in the docs applies to `mediaItems[].thumbnail`, which covers Facebook, YouTube and LinkedIn only. Keeping covers under 8 MB (the IG image cap) is a reasonable guess, not a documented rule.
- `platformSpecificData.reelCover` (string URL): alias. If both are set, `instagramThumbnail` wins.
- `platformSpecificData.thumbOffset` (integer, **milliseconds**, minimum 0, default 0): frame offset used as the cover. Ignored when `instagramThumbnail` or `reelCover` is set. Example: `5000`.
- `mediaItems[].instagramThumbnail` also exists [openapi.yaml MediaItem]. Resolution order: `mediaItems[].instagramThumbnail` > `platformSpecificData.instagramThumbnail` > `platformSpecificData.reelCover` > `platformSpecificData.thumbnailUrl` (legacy).
- **Do not use `mediaItems[].thumbnail` for Instagram.** It applies to "Facebook video posts, Facebook Reels, YouTube videos, LinkedIn video posts" only [guides_media-uploads.md].

---

## 4. Create an Instagram Reel post

### `POST /v1/posts` [posts_create-post.md, openapi.yaml]
Headers: `Authorization`, `Content-Type: application/json`, and `Idempotency-Key: <uuid per Reel>` (recommended).

**Top-level body fields (all optional individually; the rules are below):**
| Field | Type | Notes |
|---|---|---|
| `content` | string | Caption. Hashtags must go in here, because the `hashtags` field is stored for reference only. Optional when media is attached. Max 2,200 for IG. |
| `mediaItems` | MediaItem[] | Applies to every platform entry. |
| `platforms` | PlatformTarget[] | Required for non-draft posts. |
| `scheduledFor` | string | ISO 8601. With `Z` or an offset it is absolute. **Without one it is local time in `timezone`.** A past value publishes synchronously, like `publishNow`. Required unless `publishNow`, `queuedFromProfile` or draft. |
| `timezone` | string | IANA name. Applies only to a zone-less `scheduledFor`. If omitted, the post takes the profile's `timezone` (or the queue's profile), else UTC. An unknown name returns `400` when `scheduledFor` is set. |
| `publishNow` | boolean | Publish synchronously in this request. Returns `201`, or `207` on failure. Wins over `scheduledFor`. |
| `isDraft` | boolean | Wins over everything else. With no scheduling field at all, the post is a draft. |
| `queuedFromProfile` | string | Profile id. The post takes the next free queue slot. Do not combine with `scheduledFor`. |
| `queueId` | string | Specific queue. Only used with `queuedFromProfile`. Defaults to the profile's default queue. |
| `title` | string | Stored only, not published. |
| `tags`, `hashtags`, `mentions` | array | Stored only for IG. Not published. |
| `metadata` | object | Free-form key/values. Returned on reads and **in webhook payloads**. Use it to store our internal reel id and keyword. |
| `crosspostingEnabled`, `recycling` | | Not needed. |

**MediaItem** [openapi.yaml]:
| Field | Type | Notes |
|---|---|---|
| `type` | `image`\|`video`\|`gif`\|`document` | Inferred from the extension. A contradicting type returns `400`. |
| `url` | uri | Required in practice. A null or empty url drops the item. |
| `instagramThumbnail` | uri | Reel cover; highest priority. |
| `thumbnail` | uri | Not for IG. |
| `altText` | string | IG feed images only, not Reels. |
| `filename`, `size`, `mimeType`, `title` | | Optional. |
| `subtitles` | array | Ignored on IG, with a warning. |

**PlatformTarget (`platforms[]` item)** [openapi.yaml]:
| Field | Type | Notes |
|---|---|---|
| `platform` | string | `"instagram"` |
| `accountId` | string | `SocialAccount._id` |
| `customContent` | string | Per-platform caption override. |
| `customMedia` | MediaItem[] | Per-platform media override. |
| `scheduledFor` | date-time | Per-platform time override. |
| `platformSpecificData` | object | `InstagramPlatformData`, below. |
| Response only | | `status`, `platformPostId`, `platformPostUrl`, `publishedAt`, `errorMessage`, `errorCategory`, `errorSource`, `platformError`, `publishAttempts`, `publishRetries`, `removedFromPlatformAt`, `isTrialReel` |

**`platformSpecificData` for Instagram (`InstagramPlatformData`)** [openapi.yaml, platforms_instagram_fields.md]:
| Field | Type | Default | Reel behaviour |
|---|---|---|---|
| `contentType` | `"story"` | (none) | **Omit for Reels.** "story" publishes a Story. |
| `shareToFeed` | boolean | `true` | Reels only. `false` shows the Reel in the Reels tab only. |
| `instagramThumbnail` | string (uri) | | Custom cover, JPEG/PNG, recommended 1080x1920. Overrides `thumbOffset`. |
| `reelCover` | string (uri) | | Alias of `instagramThumbnail`. |
| `thumbOffset` | integer ms, minimum 0 | `0` | Cover frame offset. Ignored when a cover URL is set. |
| `firstComment` | string | | Posted as the first comment after publishing. See the note below on Reels. Needs the `comments` scope. |
| `collaborators` | string[] | | Up to 3 usernames of public Business/Creator accounts. Feed and Reels only, not Stories. |
| `userTags` | `{username, x?, y?, mediaIndex?}[]` | | Reels and videos: **username only; x/y are ignored**. `@` is stripped. |
| `trialParams` | `{graduationStrategy: "MANUAL"\|"SS_PERFORMANCE"}` | | Trial Reel, shown to non-followers first. |
| `audioName` | string | | Renames the Reel's original audio. Can be set once only, at creation. |
| `audioConfiguration` | `{audioId (required), audioVolume? 0-100, videoVolume? 0-100}` | volumes 100 | Catalog music. **Requires Facebook Login**, else `400 instagram_audio_requires_facebook_login`. `audioId` comes from `GET /v1/accounts/{accountId}/instagram/audio?audioType=music&q=...`. If the track becomes unavailable at publish time, the post fails. |
| `muteAudio` | boolean | `false` | Strips the audio track for good. Fails above 200 MB. |
| `isAiGenerated` | boolean | `false` | IG "AI info" label. |
| `isPaidPartnership` | boolean | `false` | Requires Facebook Login. |
| `brandedContentSponsors` | string[] (max 2) | | Requires Facebook Login. |
| `commentsEnabled` | boolean | `true` | **Keep `true`.** `false` would break comment-to-DM. |
| `locationId` | string of digits | | Facebook Page id with location data. |

**Is `firstComment` allowed on Reels?** The OpenAPI schema says "Optional first comment to add after the post is created (**not applied to Stories**)". The platform-settings guide example puts `firstComment` on an Instagram entry whose media is a single `.mp4`, which is a Reel [guides_platform-settings.md]. But the fields page says "Feed posts and carousels, not Stories" and does not mention Reels [platforms_instagram_fields.md]. **Conclusion: probably supported on Reels (only Stories are excluded), but the docs are ambiguous. Verify on the first live post.**

**Fields placed wrongly** (e.g. `shareToFeed` at top level) are ignored. They are reported in the `201` response `warnings[]` ("a field that was ignored because it sat outside platforms[].platformSpecificData") [posts_create-post.md].

### Full example: scheduled Reel with a custom cover
```http
POST https://zernio.com/api/v1/posts
Authorization: Bearer sk_...
Content-Type: application/json
Idempotency-Key: 4b4986f4-77b5-4c22-a3a7-2c56f7a657e1
```
```json
{
  "content": "Turn your Mac into a dev machine in 60s 🧑‍💻\n\nComment MAC and I'll DM you the repo.\n\n#github #opensource #macos",
  "mediaItems": [
    { "type": "video", "url": "https://media.zernio.com/temp/1234567890_abc123_reel_001.mp4" }
  ],
  "platforms": [
    {
      "platform": "instagram",
      "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
      "platformSpecificData": {
        "shareToFeed": true,
        "instagramThumbnail": "https://media.zernio.com/temp/1234567890_def456_cover_001.jpg",
        "firstComment": "Comment MAC for the GitHub link 👇",
        "isAiGenerated": false
      }
    }
  ],
  "scheduledFor": "2026-10-21T09:00:00",
  "timezone": "Asia/Kolkata",
  "metadata": { "reelId": "reel_001", "dmKeyword": "MAC" }
}
```
Python SDK equivalent:
```python
client.posts.create_post(
    idempotency_key=str(uuid.uuid4()),
    content=caption,
    media_items=[{"type": "video", "url": video_public_url}],
    platforms=[{"platform": "instagram", "accountId": ig_id,
                "platformSpecificData": {"shareToFeed": True, "instagramThumbnail": cover_public_url}}],
    scheduled_for="2026-10-21T09:00:00",
    timezone="Asia/Kolkata",
    metadata={"reelId": "reel_001"},
)
```
Response `201` [guides_timezones.md, guides_idempotency.md]:
```json
{"message":"Post scheduled successfully",
 "post":{"_id":"65f1c0a9e2b5af0012ab34cd","status":"scheduled","scheduledFor":"2026-10-21T03:30:00Z","timezone":"Asia/Kolkata",
         "platforms":[{"platform":"instagram","status":"pending"}]},
 "warnings":[]}
```
Key response fields:
- `post._id`: our Zernio `postId`. Use it to bind the automation.
- `post.status`
- `post.scheduledFor`: stored in UTC.
- `post.platforms[].status`
- `warnings[]`

Other variants:
- **Publish now:** replace `scheduledFor`/`timezone` with `"publishNow": true`. The response is `201` with `post.platforms[0].platformPostUrl`, or `207` with `post.status: "failed"|"partial"|"scheduled"` (`scheduled` means transient errors are retried automatically, which is not a failure).
- **Queue:** replace `scheduledFor` with `"queuedFromProfile": "<profileId>"` (optional `"queueId"`). See section 5.

Error responses for create:
- `400`: validation.
- `401`.
- `403`: `code` is one of `ACCOUNT_DISCONNECTED`, `ACCOUNT_NOT_ENABLED_FOR_POSTING`, `PROFILE_OVER_LIMIT`, or absent when the account is not ours.
- `409`: duplicate content, or `idempotency_conflict`.
- `429`: API rate limit, 25/hour velocity, account cooldown, or daily cap.

### Get a post and its status lifecycle [posts_get-post.md, guides_post-lifecycle.md]
- `GET /v1/posts/{postId}` returns `{ post: Post }`.
- `Post` fields:
  - `_id`, `content`, `mediaItems`, `platforms[]`, `scheduledFor`, `timezone`, `metadata`
  - `queuedFromProfile`, `queueId`, `createdAt`, `updatedAt`
  - `status`: `draft`|`scheduled`|`publishing`|`published`|`partial`|`failed`|`cancelled`
- Per-platform status: `pending`|`processing`|`uploading`|`published`|`failed`|`cancelled`.
- After publishing, `platforms[0].platformPostId` holds **the Instagram media id**, needed for per-post comment APIs. `platformPostUrl` holds the public URL, and `publishedAt` the publish time.
- Lifecycle: `draft` → `scheduled` → `publishing` → `published` | `partial` | `failed`. Then `published`/`partial` → `cancelled` via unpublish.
- `errorCategory` values:
  - `auth_expired`: reconnect.
  - `user_content`: fix the media.
  - `user_abuse`: slow down.
  - `platform_rate_limit`: retried automatically.
  - `quota_exhausted`
  - `account_issue`
  - `platform_rejected`
  - `platform_error`: transient.
  - `system_error`
  - `unknown`
- `errorSource` is one of `user`, `platform`, `system`.
- Instagram-only: `publishRetries`. Zernio auto re-sends `media_publish` 30 min, 2h and 6h after a transient Meta error, at most 3 times [openapi.yaml].
- `removedFromPlatformAt` is set if the Reel later disappears from IG. Detection lags by a few hours.
- `GET /v1/posts` lists posts with filters: `status`, `platform`, `profileId`, `fromDate`, `toDate`, `search`, `tags`, `limit`, `offset`/`page`. **An unknown query param returns `400`** on this endpoint [posts_create-post.md].

### Retry a failed post [posts_retry-post.md]
- `POST /v1/posts/{postId}/retry`, no body. Allowed on `failed` and `partial` posts. Only the failed platforms run again.
- Responses:
  - `200 { message, post }`
  - `207 { message, error, post }`, with no `platformResults`
  - `400`: invalid state
  - `402`: last payment failed
  - `429`: account cooldown

### Update, delete, unpublish
- `PUT /v1/posts/{postId}` [posts_update-post.md]: allowed on draft, scheduled, failed, partial and cancelled posts.
  - Body: same fields as create (`content`, `mediaItems`, `platforms`, `scheduledFor`, `publishNow`, `isDraft`, `timezone`, `queuedFromProfile`, `queueId`, `metadata`, ...).
  - **To promote a draft you must send `isDraft: false`** together with `scheduledFor`. Otherwise the post stays a draft while returning 200.
  - `409 queue_slot_conflict` if the slot is taken. Send `queueId: null` to move the post off the queue.
- `DELETE /v1/posts/{postId}` [posts_delete-post.md]: allowed in any status **except `published`** (`400`, code `invalid_resource_state`).
  - Deleting a scheduled post cancels it, refunds quota and frees the content hash.
  - Deleting does not remove anything already live.
- `POST /v1/posts/{postId}/unpublish` with body `{platform, accountId?}` [posts_unpublish-post.md]: **not supported on Instagram.** The platform enum is threads, facebook, twitter, linkedin, youtube, pinterest, reddit, bluesky, googlebusiness and telegram. **A published Reel must be deleted manually in the Instagram app.**
- Editing a published post: Instagram has no edit API [guides_post-lifecycle.md].

### Instagram publishing limit [instagram_get-instagram-publishing-limit.md]
- `GET /v1/accounts/{accountId}/instagram/publishing-limit`
- Response `200`: `{ quotaUsage: int, quotaTotal: int, quotaDurationSeconds: int }`. This is a rolling window. Compare against `quotaTotal`; do not hardcode 100.
- `400` if the account is not Instagram.

---

## 5. Queue scheduling [guides_queue-scheduling.md, queue_create-queue-slot.md, queue_get-next-queue-slot.md]

There are two options for fixed daily times:

- **(A) Explicit `scheduledFor`.** The script computes "2026-10-21T09:00:00" and sends it with `timezone`. This is simplest and deterministic: one Reel maps to one known time. Recommended when the script already knows which Reel goes in which slot.
- **(B) Queue.** Define recurring slots once, then create each post with `queuedFromProfile` and let Zernio assign the next free slot.

### Create a queue: `POST /v1/queue/slots`
- Body:
  - `profileId` (required)
  - `name` (required)
  - `timezone` (required, IANA)
  - `slots` (required): `{dayOfWeek: 0-6 (0 = Sunday), time: "HH:mm" 24h}[]`
  - `active` (boolean)
- **There is no "daily" shorthand.** Five times a day for 7 days means 35 slot objects.
- Example:
```json
{
  "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
  "name": "Reels 5x daily",
  "timezone": "Asia/Kolkata",
  "slots": [
    {"dayOfWeek":0,"time":"09:00"},{"dayOfWeek":0,"time":"12:00"},{"dayOfWeek":0,"time":"15:00"},{"dayOfWeek":0,"time":"18:00"},{"dayOfWeek":0,"time":"21:00"},
    {"dayOfWeek":1,"time":"09:00"}, "... repeat for dayOfWeek 1-6 ..."
  ]
}
```
- Response `201`: `{ success, schedule: { _id, profileId, name, timezone, slots, active, isDefault }, nextSlots: [ISO strings] }`.
- The first queue on a profile becomes its default.
- `400` if `time` is not `HH:mm` or `dayOfWeek` is outside 0-6.

### Other queue endpoints
- `GET /v1/queue/slots?profileId=...` returns the default queue and its next slots. Add `all=true` for every queue on the profile.
- `PUT /v1/queue/slots`: update a queue.
  - Body: `profileId` (required), `queueId`, `name`, `timezone` (required), `slots` (required), `active`, `setAsDefault`, `reshuffleExisting`.
  - Response: `{ success, schedule, nextSlots, reshuffledCount, skippedDailyLimit, isNewQueue }`.
- `DELETE /v1/queue/slots?profileId=...&queueId=...`. Omit `queueId` to delete every queue on the profile.
- Next slot (preview only): `GET /v1/queue/next-slot?profileId=...&queueId=...` returns `{ profileId, nextSlot, timezone, queueId, queueName }`.
  - `404` if there is no queue or no free slot. `400` if the queue is inactive.
  - **Never pass `nextSlot` as `scheduledFor`.** That skips the queue lock.

### Posting into the queue
`POST /v1/posts` with `"queuedFromProfile": "<profileId>"`, optional `"queueId"`, and **no** `scheduledFor`. The response contains the assigned `post.scheduledFor`, `queuedFromProfile` and `queueId`. Each call takes the slot after the previous one.

---

## 6. Comment-to-DM automations

### Create: `POST /v1/comment-automations` [comment-automations_create-comment-automation.md]
Response `200` (not 201): `{ success: true, automation: {...} }`.

**Request body:**
| Field | Type | Req | Notes |
|---|---|---|---|
| `profileId` | string | **yes** | |
| `accountId` | string | **yes** | IG `SocialAccount._id` |
| `name` | string | **yes** | Label |
| `trigger` | enum `comment`\|`live_comment`\|`story_reply`\|`story_mention` | no | Default `comment` |
| `platformPostId` | string | no | **IG media id** of a live post. Scopes the automation to that post. Omit it for account-wide. |
| `postId` | string (24 hex) | no | **Zernio post id.** Use it *instead of* `platformPostId` to bind to a **not-yet-published** post: "the automation stays pending and arms itself when that post publishes". A platform id here returns `400`. |
| `postTitle` | string | no | Display snippet |
| `keywords` | string[] | no | **Empty means any comment triggers.** |
| `matchMode` | enum `contains` (default)\|`word`\|`exact` | no | `contains` matches anywhere, even inside a word ("app" fires on "happy"). `word` matches a standalone word. `exact` means the whole comment equals the keyword. |
| `excludeKeywords` | string[] | no | Veto words, compared with the same `matchMode`. |
| `typoTolerance` | boolean | no | Only with `matchMode=word`. 1 edit for 4-7 character keywords, 2 for 8 and up. Keywords under 4 characters are never fuzzy-matched, so "MAC" never is. |
| `dmMessage` | string | **yes on IG** | DM text. **Max 640 chars when `buttons` are set, otherwise about 1000.** Missing returns `400 missing_required_field`. |
| `dmMessageVariations` | string[] (max 5) | no | Picked at random together with `dmMessage`. |
| `buttons` | DmButton[] (1-3) | no | Inline buttons in a Meta button_template. `[]` or omit for plain text. |
| `template` | `{type:"generic", elements[] (max 10), imageAspectRatio? (Facebook only; a 400 on IG)}` | no | Product card sent **instead of** the text bubble. Mutually exclusive with `buttons`. `dmMessage` is still required. Elements have `imageUrl`, `title`, `subtitle` and up to 3 `url`/`postback` buttons [platforms_instagram_inbox.md]. Renders on mobile only. |
| `quickReplies` | `{title (max 20), payload, imageUrl?}[]` (max 13) | no | Mutually exclusive with `buttons` and `template`. **Does not render in Message Requests**, so avoid for cold commenters. |
| `dmMedia` | `{type: image\|video\|audio\|file, url}` | no | Sent as a second message after the text. Meta may refuse it until the commenter replies (logged as `mediaError`). |
| `commentReply` | string | no | Public reply under the comment. Optional on IG. |
| `commentReplyVariations` | string[] (max 5) | no | |
| `publicReplyPolicy` | enum `after_dm`\|`always` | no | `after_dm` (the default per the guide) replies publicly only after a successful DM. `always` replies regardless. |
| `linkTracking` | boolean | no | Default **on**. URL buttons are wrapped in a tracked redirect. `false` sends the raw link. |
| `clickTag` | string | no | Tag applied to clickers. Needs `linkTracking`. |
| `dmDelaySeconds` | integer 0-86400 | no | Delay before the DM. Default 0. |
| `commentReplyDelaySeconds` | integer | no | Never earlier than the DM; raised to `dmDelaySeconds` if lower. |
| `alsoMatchInDms` | boolean | no | Also fire when someone DMs the keyword. Needs at least 1 keyword. Dedup is per door. |
| `audience` | CommentAutomationAudience | no | IG only (below). |
| `followGate` | CommentAutomationFollowGate | no | Copy for the verify/unlock DM. |
| `repeatPolicy` | `{mode: "once"\|"every_comment", cooldownHours?: 1-8760}` | no | Default `once`: one DM per person per door, ever. `cooldownHours` only with `every_comment`; with `once` it is a `400`. |
| `dedupeSameTextHours` | integer\|null | no | Skip if this person got the identical text from any automation on this account within N hours. |
| `actions` | `{likeComment?: bool, hideComment?: bool}` | no | Like or hide the matched comment. Like on IG needs Facebook Login plus an allowlist (limited release), otherwise it is skipped and logged. |
| `isActive` | boolean | no | `false` creates it paused. |

**DmButton** (max 3): `type` is required, one of `url`|`postback`|`phone` (`phone` is Facebook only). `title` is required, **max 20 chars**. `url` is required when type is url. `payload` is required when type is postback. A postback payload of `zernio:workflow:<workflowId>` starts that workflow on tap.

**CommentAutomationAudience** (Instagram only):
- `followerStatus`: `any` (default), `follower` or `non_follower`.
- `minFollowerCount`: integer ≥ 0.
- `whenUnknown`: `send` (default), `skip` or `verify`.
  - Instagram reveals the follow relationship only for people who have DMed the account. For a first-time commenter it is unknown.
  - `verify` sends `followGate.message` with a confirm button. The tap counts as a message, which grants consent, then the real DM follows.
- `tapToUnlock`: boolean (default false). Sends the gate button DM to every commenter and delivers the real DM on tap, with no follow check. It cannot be combined with `followerStatus` other than `any` or with `minFollowerCount`.

**CommentAutomationFollowGate**:
- `message` (max 640)
- `buttonLabel` (max 20). Default "I'm following" or "Unlock".
- `notFollowingMessage` (max 1000)

**Personalisation:** `{{first_name}}`, `{{name}}` and `{{username}}` work in `dmMessage`, `commentReply`, their variations and button titles. An unknown value becomes an empty string.

**Example for our use case: a per-Reel automation bound to the Zernio post before it publishes.**
```json
POST /v1/comment-automations
{
  "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
  "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
  "name": "reel_001 MAC -> repo",
  "trigger": "comment",
  "postId": "65f1c0a9e2b5af0012ab34cd",
  "postTitle": "Turn your Mac into a dev machine",
  "keywords": ["MAC", "mac", "Mac"],
  "matchMode": "word",
  "dmMessage": "Hey {{first_name}}! Here's the repo: https://github.com/itsongit/mac-setup ⭐ it if it helps!",
  "buttons": [ { "type": "url", "title": "Open GitHub repo", "url": "https://github.com/itsongit/mac-setup" } ],
  "commentReply": "Sent you a DM, {{first_name}} 📩",
  "commentReplyVariations": ["Check your DMs 👀", "Link sent! 🚀"],
  "publicReplyPolicy": "after_dm",
  "repeatPolicy": { "mode": "once" },
  "isActive": true
}
```
Response `200`:
```json
{"success":true,"automation":{"id":"...","name":"reel_001 MAC -> repo","platform":"instagram","trigger":"comment","platformPostId":null,
 "keywords":["MAC","mac","Mac"],"matchMode":"word","dmMessage":"...","buttons":[...],"commentReply":"...","linkTracking":true,
 "repeatPolicy":{"mode":"once"},"publicReplyPolicy":"after_dm","isActive":true,
 "stats":{"triggered":0,"dmsSent":0,"dmsFailed":0,"uniqueContacts":0,"trackedSends":0,"linkClicks":0,"uniqueClicks":0,"delivered":0,"read":0,"audienceSkipped":0,"followGateSent":0,"followGatePassed":0,"followGateFailed":0},
 "createdAt":"..."}}
```
- **Button warning:** see the gotchas. If @itsongit turns out to be an account where Instagram refuses buttons to non-followers, drop `buttons` and put the link in `dmMessage` as plain text.

Create errors:
- `400`: validation. Codes include `platform_not_supported`, `missing_required_field`, `invalid_field_value`.
- `409`: "Active per-post automation already exists for this platformPostId". Does not apply to account-wide automations.
- `503`.

### Per-post vs account-wide: which do we need?
From the create page:
- **Per-post:** set `platformPostId` (or `postId` before publish). **Only one active per-post automation per post** (`409`). "Per-post automations take priority on their post."
- **Account-wide:** omit both `platformPostId` and `postId`. It "evaluates every comment on every post on the account". You can "stack unlimited account-wide automations, each with its own keyword set, and they all run independently."
- **So one account-wide automation per keyword works** ("MAC" → repo A), with no automation per post needed. That suits keywords reused across many Reels.
- Use **per-post** when the same keyword must map to different repos on different Reels, or to stop a keyword firing on unrelated posts.
- **Polling caveat for account-wide:** the 10-minute backup poll reads only "the 5 newest posts for an account-wide automation, up to 20 Graph reads per account per run". At 5 Reels a day, older Reels drop out of the backup poll within about a day. After that, account-wide automations on older Reels rely **only on the webhook**. Per-post automations poll their bound post.
- **Recommendation:** one per-post automation per Reel, created with `postId` right after `POST /v1/posts` returns. It arms itself on publish, so there is no need to wait for `platformPostId`. Optionally add an account-wide automation per evergreen keyword as a safety net. The per-post one wins on its own post.

### Timing [comment-automations_create-comment-automation.md, guides_manychat-patterns.md]
- Instagram comments arrive **by webhook**, so the response is near real time.
- Every **10 minutes**, Zernio also reads the latest comments (the bound post, or the 5 newest posts for account-wide) and runs any comment the webhook missed.
- A comment is answered at most once.
- `dmDelaySeconds` can add a deliberate delay of up to 24h.

### Limits and Instagram rules
- **One private reply per comment, within 7 days** of the comment [comments_send-private-reply-to-comment.md, platforms_instagram_inbox.md].
- Meta subcode 1545133 (or 2534023, or code 10900) spends the comment's single private reply. It shows as `privateReplyConsumed: true` in logs [comment-automations_list-comment-automation-logs.md].
- The automation's first DM is the private reply. It lands in the commenter's **Message Requests** folder if they have not chatted before. Quick-reply chips do not render there; buttons do [comment-automations_create-comment-automation.md].
- **Non-followers and buttons:** "Instagram can refuse buttons, cards and attachments to commenters who do not follow the account (Meta code 2, subcode 1545133 ...). The refusal is uneven: most accounts do not get it, an affected account gets it on many of its non-followers ... The failed call still consumes the comment's single private reply. On an affected account, send plain text" [comments_send-private-reply-to-comment.md, guides_manychat-patterns.md].
- Text limits:
  - `dmMessage`: ≤640 chars with buttons, about 1000 otherwise.
  - Button title: ≤20 chars. Up to 3 buttons.
  - Up to 13 quick replies.
  - Template: up to 10 elements with up to 3 buttons each.
  - Up to 5 variations.
  - `followGate.message` ≤640.
- 24-hour messaging window: outside 24h after the user's last message, normal DMs need `messageTag: "HUMAN_AGENT"` with `messagingType: "MESSAGE_TAG"` [platforms_instagram_inbox.md]. The private-reply-to-comment path has its own 7-day rule.
- **Keyword case sensitivity is not documented** for comment automations. Only workflow `condition` operators are documented as case-insensitive [workflows.md]. Until tested, list all case variants (`"MAC","mac","Mac"`). With `matchMode: "word"` a variant does not hurt.
- `contains` (the default) fires "MAC" on "macbook" or "imac". Use `matchMode: "word"` for short keywords.
- If a comment automation and a comment-triggered workflow both match, the automation answers [guides_manychat-patterns.md].

### List, get, update, delete, logs
- List: `GET /v1/comment-automations?profileId=...` returns `{ success, automations: [ {id, name, platform, trigger, accountId, platformPostId, postTitle, postId, keywords, matchMode, ..., isActive, stats, createdAt} ] }`.
- Get: `GET /v1/comment-automations/{automationId}` returns `{ success, automation: {... , updatedAt}, logs: CommentAutomationLog[] }`, with the 20 most recent logs [comment-automations_update-comment-automation.md].
- Update: `PATCH /v1/comment-automations/{automationId}`. Every create field is optional except `profileId`/`accountId`, which are not patchable.
  - `buttons: []` clears buttons. With non-empty buttons, `dmMessage` must be ≤640.
  - **`postId`, `platformPostId` and `postTitle` move as a unit.** Sending one replaces all three and clears any omitted. Send all three as `null` to make the automation account-wide. Omit all three to keep the binding.
  - Changing `trigger` detaches the binding.
  - Sending `audience` without `tapToUnlock` clears `tapToUnlock`.
  - `dedupeSameTextHours: null` and `quickReplies: null` clear those fields.
  - Responses: `200 { success, automation }`, `404`, `409` if re-binding to a post that already has an active automation.
- Delete: `DELETE /v1/comment-automations/{automationId}` returns `200`. "Its trigger logs are kept so tracked links already sent in DMs keep redirecting."
- Logs: `GET /v1/comment-automations/{automationId}/logs?status=&limit=&skip=` returns `{ success, logs[], pagination: {total, limit, skip, hasMore}, misses: {total, retentionDays, samples:[{commentText, commenterName, excludedBy, at}]} }`.
  - `misses` lists comments that matched no keyword. It is the only signal that a keyword catches nothing.
  - `CommentAutomationLog` fields:
    - `id`, `commentId`, `commenterId`, `commenterName`, `commenterUsername`, `commentText`
    - `source`: comment|live_comment|story_reply|story_mention|dm
    - **`status`**: `pending`|`sent`|`failed`|`skipped`|`gated`
    - `audienceOutcome`, `gateButtonStatus`, `commenterIsFollower`, `commenterFollowerCount`
    - `error`, `platformError`, `privateReplyConsumed`
    - `commentReplyStatus`, `commentReplyError`, `publicReplyPostedAt`
    - `likeSkipped`, `hideSkipped`, `mediaError`, `nextDueAt`
    - `clickedAt`, `clickCount`, `createdAt`
- Stats (`automation.stats`): `triggered`, `dmsSent`, `dmsFailed`, `uniqueContacts`, `trackedSends` (the CTR denominator), `linkClicks`, `uniqueClicks`, `delivered` (IG emits no delivery receipts), `read`, `audienceSkipped`, `followGateSent`, `followGatePassed`, `followGateFailed`.

---

## 7. Comments and inbox

### Comments [comments_get-inbox-post-comments.md, comments_reply-to-inbox-post.md, comments_hide-inbox-comment.md, comments_send-private-reply-to-comment.md]
- **List post comments:** `GET /v1/inbox/comments/{postId}?accountId=...&limit=&cursor=&commentId=`
  - `postId` is a Zernio post id (auto-resolved) or a platform media id. `commentId` fetches the replies to one comment.
  - Response: `{ status, comments: [{id, message, createdTime, from:{id,name,username,picture,isOwner}, likeCount, replyCount, platform, url, replies[]}], pagination:{cursor} }`.
  - **Cached for up to 10 minutes.** Do not poll it; use the `comment.received` webhook.
  - Hidden comments: Instagram Login accounts return them with `isHidden: true`. Facebook Login accounts omit them.
- **Reply publicly / new comment:** `POST /v1/inbox/comments/{postId}`
  - Body: `accountId` (required), `message` (required), `commentId` (optional; reply to that comment, otherwise a top-level comment).
  - Takes `Idempotency-Key`.
- **Delete a comment:** `DELETE /v1/inbox/comments/{postId}?accountId=...&commentId=...`
- **Hide / unhide:** `POST /v1/inbox/comments/{postId}/{commentId}/hide` with body `{accountId}`. Returns `{status, commentId, hidden, platform}`. `DELETE` on the same path unhides.
- **Private reply (manual comment-to-DM):** `POST /v1/inbox/comments/{postId}/{commentId}/private-reply`
  - Body: `accountId` (required), `message` (required), and `quickReplies` (≤13) or `buttons` (1-3), which are mutually exclusive.
  - Response: `{status:"success", messageId, commentId, platform}`.
  - One reply per comment, within 7 days.
  - `400` with `details.privateReplyConsumed: true`: never retry.
  - `502` with `details.privateReplyOutcome: "unknown"`: check the conversation before retrying.
- Like a comment: limited release. Non-allowlisted accounts get `403 PLATFORM_BETA_RESTRICTED`. Instagram Login accounts get `400 instagram_likes_require_facebook_login` [platforms_instagram_inbox.md].

### DMs [messages_send-inbox-message.md, quickstart.md, platforms_instagram_inbox.md]
- List conversations: `GET /v1/inbox/conversations?status=active&limit=50`. Add `&folder=requests` for Message Requests.
  - Items: `id`, `accountId`, `platform`, `participantName`, `lastMessage`, `instagramProfile{isFollower,isFollowing,followerCount,isVerified}`.
- Read messages: `GET /v1/inbox/conversations/{conversationId}/messages`
- **Send:** `POST /v1/inbox/conversations/{conversationId}/messages`
  - Headers: optional `Idempotency-Key`.
  - Body:
    - `accountId` (required)
    - `message`
    - `attachmentUrl` + `attachmentType` (`image`|`video`|`audio`|`file`)
    - `quickReplies` (≤13) or `buttons` (≤3, `message` ≤640 with buttons). For IG, `buttons` are also mutually exclusive with `template`.
    - `template`
    - `messagingType`/`messageTag` (`HUMAN_AGENT` is the only tag IG accepts, for sends outside 24h)
  - Response: `{ data: { messageId, ... } }`. "The `200` means accepted, not yet delivered."
  - `403`: Meta rejected the send outside the messaging window (`platform_error`).
- Accept a message request: the "Accept a message request" endpoint takes `accountId` and `message`. Replying moves the thread to the inbox [platforms_instagram_inbox.md]. Its exact path was not fetched; see `messages/accept-conversation-request` in llms.txt.
- IG attachment limits: images PNG/JPEG 8 MB. Video MP4/OGG/AVI/MOV/WEBM 25 MB. Audio AAC/M4A/WAV/MP4 25 MB. PDF 25 MB.
- On connect, Zernio replays up to 500 conversations × 500 messages of DM history, with no webhooks fired.

---

## 8. Analytics

All analytics endpoints are rate-limited at **6 req/s** on our tier and cached for 60 min.

- **Post analytics:** `GET /v1/analytics` [analytics_get-analytics.md]
  - Query: `postId` (Zernio or external id), `platform=instagram`, `profileId`, `accountId`, `source` (`late`|`external`|`all`), `fromDate`/`toDate` (YYYY-MM-DD; default 90 days back, max 366 days), `limit` (50), `page`, `sortBy`, `order`, `tags`.
  - Single post: `200`, or `202` (sync pending, `syncStatus: "pending"`), or `424` (all platforms failed).
  - Key fields: `postId`, `status`, `publishedAt`, `platformPostUrl`, `thumbnailUrl` (non-expiring for IG), `mediaProductType` (`REELS`), `isSharedToFeed`, `mediaAudioType`, `syncStatus`, `platformAnalytics[] {platform, platformPostId, accountId, analytics, syncStatus}`.
  - `analytics` metrics:
    - counts: `impressions`, `reach`, `likes`, `comments`, `shares`, `saves`, `views`
    - `follows`: null on Reels
    - **`igReelsAvgWatchTime`** (ms)
    - **`igReelsVideoViewTotalTime`** (ms)
    - **`reelsSkipRate`** (0-100, % skipped in the first 3 s)
    - `reposts`: Facebook Login only, else 0
    - `profileViews`: 0 on Reels
    - `engagementRate`: (likes+comments+shares+saves) / first non-zero of impressions/reach/views × 100
    - `lastUpdated`
- **IG account insights:** `GET /v1/analytics/instagram/account-insights?accountId=...` [analytics_get-instagram-account-insights.md]
  - `metrics`: comma list of `reach`, `views`, `accounts_engaged`, `total_interactions`, `comments`, `likes`, `saves`, `shares`, `replies`, `reposts`, `follows_and_unfollows`, `profile_links_taps`. Default: `reach,views,accounts_engaged,total_interactions`.
  - `fromDate`/`toDate`: default 30 days, max 90.
  - `metricType`: `total_value` (default) or `time_series`. **`time_series` works for `reach` only.**
  - `breakdown`: `media_product_type`|`follow_type`|`follower_type`|`contact_button_type`.
  - Data may lag up to 48h.
  - Response: `{ success, accountId, platform, dateRange{since,until}, metricType, metrics: { <name>: { total, values?[{date,value}], breakdowns?[] } }, unavailableMetrics? }`.
- **Follower history:** `GET /v1/analytics/instagram/follower-history?accountId=...&metricType=time_series` [analytics_get-instagram-follower-history.md]
  - `metrics`: `follower_count`, `followers_gained`, `followers_lost`.
  - Default 30 days, **max 89 days**. Same envelope as account insights.
  - Built from Zernio's daily snapshots, which start when we connect.
- **Best time to post:** `GET /v1/analytics/best-time?platform=instagram&accountId=...&source=` [analytics_get-best-time-to-post.md]
  - Response: `{ slots: [{ day_of_week, hour, avg_engagement, post_count }] }`.
  - **`day_of_week`: 0 = Monday.** **`hour` is UTC.**
- Also available (not fetched in detail): `/v1/analytics/instagram/demographics` (needs ≥100 followers), `/v1/accounts/follower-stats`, `/v1/analytics/daily-metrics`, `/v1/analytics/post-timeline`, `/v1/analytics/content-decay`, `/v1/analytics/posting-frequency` [llms.txt, platforms_instagram_analytics.md].

---

## 9. Webhooks [webhooks.md, webhooks_create-webhook-settings.md, webhooks_posts.md, webhooks_inbox.md, webhooks_automations.md]

### Create a webhook: `POST /v1/webhooks/settings`
- Body:
  - `name` (required, 1-50 chars)
  - `url` (required)
  - `events` (required, at least 1)
  - `secret`: Zernio never generates one, **so send your own**, otherwise deliveries are unsigned
  - `isActive` (default true)
  - `customHeaders` (object)
  - `disabledResourceGroups`, `profileIds`, `accountIds`
- Max 50 per user. Response `200 { success, webhook: { _id, name, url, events, isActive, failureCount } }`.
- Test: `POST /v1/webhooks/test` with body `{webhookId}`. Sends `webhook.test` regardless of `events`.
- Manage: `GET`/`PUT`/`DELETE /v1/webhooks/settings`, logs, redeliver (see llms.txt).

### Relevant events
- **Posts:**
  - `post.scheduled`
  - `post.platform.published`: fastest signal. Carries `account.accountId` and the platforms' `platformPostId`.
  - `post.platform.failed`
  - `post.published`, `post.partial`, `post.failed`, `post.cancelled`
  - `post.platform.deleted`: removed on the platform, poll-driven, roughly hourly.
- **Accounts:** `account.connected`, `account.disconnected`.
- **Inbox:**
  - `comment.received`: payload `comment.author`; carries `instagramProfile` only if the commenter has DMed before.
  - `message.received`
  - **`message.sent`**: carries `sentVia` (`human`|`api`|`broadcast`|`sequence`|`workflow`|**`comment_automation`**|`bulk-api`) and **`automationId`**. This is how automation DMs are observed.
  - `message.delivered`, `message.read`, `message.failed`
  - `conversation.started`, `reaction.received`, `referral.received`
- **Automations:** `workflow.run.*` and `contact.*`. There is **no dedicated comment-automation event**. Use `message.sent` (`sentVia: comment_automation`) and the automation logs endpoint.
- **Analytics:** `analytics.synced`.

### Delivery
- Headers on each delivery:
  - `X-Zernio-Event` (event name)
  - `X-Zernio-Event-Id` (dedupe key, the same as `payload.id`)
  - `X-Zernio-Signature`
  - `User-Agent: Zernio-Webhooks/1.0`
  - Legacy aliases: `X-Late-Event-Id`, `X-Late-Signature`
- Respond **2xx within 5 s**.
- Up to 7 attempts, with backoff of 10s, 1m40s, 16m40s, 2h46m, 24h and 24h, then a dead-letter queue. Delivery is at least once, so dedupe on `payload.id`.
- Auto-disable happens only after 3 days with no success **and** either 20 consecutive terminal failures or 3 days of continuous failure.
- `metadata` from the post is echoed in `post.*` payloads.

### Signature verification
`X-Zernio-Signature` = lowercase hex HMAC-SHA256 of the **raw request body**, keyed by `secret`.
```python
import hmac, hashlib
def verify(raw_body: bytes, sig_header: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig_header or "")
```

---

## 10. MCP server and CLI

### MCP [for-you_mcp.md]
- Hosted URL: `https://mcp.zernio.com/mcp`. Nothing to install. Sign-in is OAuth with your Zernio account, with no API key.
- Claude Code:
  ```bash
  claude mcp add --transport http zernio https://mcp.zernio.com/mcp
  claude /mcp      # pick "zernio" and approve in the browser
  ```
- Alternative plugin: `/plugin marketplace add zernio-dev/zernio-claude-plugin`, then `/plugin install zernio@zernio`.
- Other clients:
  - Cursor: `~/.cursor/mcp.json` with `{"mcpServers":{"zernio":{"url":"https://mcp.zernio.com/mcp"}}}`
  - Codex: `codex mcp add zernio --url https://mcp.zernio.com/mcp`
  - VS Code: `.vscode/mcp.json` with `{"servers":{"zernio":{"type":"http","url":"https://mcp.zernio.com/mcp"}}}`
  - MCP Registry name: `com.zernio/zernio`
  - An API-key and local-bridge config exists at /mcp/setup (not fetched).
- Capabilities: post, schedule, retry failed posts, upload media through a browser link, answer DMs and comments, read analytics, manage ads.
  - In ChatGPT it covers only posts and analytics.
  - Test prompt: "List my connected Zernio accounts."

### CLI [cli.md, for-you_cli.md, cli_posting.md, cli_inbox.md]
- Install and log in:
  ```bash
  npm install -g @zernio/cli
  zernio auth:login                      # browser auth; key saved to ~/.zernio/config.json
  # or: zernio auth:set --key "$ZERNIO_API_KEY"
  zernio auth:check
  ```
- Everyday commands:
  - `zernio accounts:list --pretty`
  - `zernio accounts:health`
  - `zernio posts:create --text ... --accounts <id> --scheduledAt "2026-10-21T09:00:00" --timezone "Asia/Kolkata" [--media ...] [--draft]`
  - `zernio posts:get <id>`
  - `zernio inbox:conversations --accountId <id>`
  - `zernio inbox:messages <conversationId>`
  - `zernio analytics:posts --platform instagram`
- Groups: `profiles:`, `accounts:`, `connect:`, `posts:`, `media:`, `queue:`, `automations:` (comment automations), `inbox:`.
  - Generated commands are `<group>:<operation>` in kebab case. Body and query fields become `--flags` named after the API field.
- Output is JSON. Errors go to stderr with exit code 1.
- Env: `ZERNIO_API_KEY`, `ZERNIO_API_URL`. Legacy `LATE_*` names also work.
- **The `posts:create` flags do not expose `platformSpecificData`** (there is no documented flag for `instagramThumbnail`). Use the Python SDK or raw HTTP for Reels with covers.

---

## 11. Gotchas, contradictions and unknowns

### Contradictions across pages (flagged)
1. **`firstComment` on Reels.**
   - The fields page says "Feed posts and carousels, not Stories" and does not mention Reels [platforms_instagram_fields.md].
   - The OpenAPI spec says only "not applied to Stories" [openapi.yaml].
   - The platform-settings guide shows it on a single-video (Reel) IG entry [guides_platform-settings.md].
   - Probably allowed. Verify live.
2. **Unpublish method.**
   - The endpoint page documents `POST /v1/posts/{postId}/unpublish` [posts_unpublish-post.md].
   - The `Post.status` and `PlatformTarget.status` schema text says `DELETE /v1/posts/{postId}/unpublish` [posts_create-post.md, openapi.yaml].
   - It does not matter for Instagram, which does not support unpublish at all.
3. **Reel cover location.**
   - `guides_media-uploads.md` lists the custom thumbnail platforms without Instagram.
   - The spec's `MediaItem.instagramThumbnail` field accepts an IG Reel cover at media level, with higher priority than `platformSpecificData.instagramThumbnail`.
   - Both are valid. Use one place only (recommended: `platformSpecificData.instagramThumbnail`, as on the IG fields page).
4. **Default timezone.**
   - `guides_timezones.md` says a zone-less `scheduledFor` is read in `timezone`, "which defaults to UTC".
   - `posts_create-post.md` says that when `timezone` is omitted the post uses the profile's `timezone`, then UTC.
   - Always send `timezone` explicitly, or send UTC `Z` timestamps.
5. **Carousel size.**
   - The IG media page and quick reference say 10 items.
   - The `InstagramPlatformData` description says "carousels up to 20 items".
   - Not relevant for Reels.
6. **Add-ons.**
   - `accounts_list-accounts.md` says "Follower data requires analytics add-on". The analytics pages say "Requires the Analytics add-on". `workflows.md` mentions "Inbox addon required".
   - `pricing.md` says every account includes analytics and the inbox.
   - The docs reconcile this themselves: the add-on gates are legacy-plan only [guides_error-handling.md, workflows.md].
7. **Day-of-week numbering differs.**
   - Queue slots use `dayOfWeek` with 0 = **Sunday** [guides_queue-scheduling.md].
   - Best-time uses `day_of_week` with 0 = **Monday**, and `hour` is in **UTC** [analytics_get-best-time-to-post.md].
   - Convert carefully if you feed best-time output into queue slots.
8. **Python SDK idempotency.**
   - `guides_idempotency.md` says the Python SDK takes `idempotency_key=` on `create_post`.
   - `quickstart.md` says "The Python client takes no key, so a retry from Python sends a second message" for `send_inbox_message`.
   - Treat it as supported for posts and unsupported for DMs. Use raw HTTP with the header for DMs if needed.

### Gotchas
- **Instagram Reels cannot be unpublished or edited through the API.** Delete or fix them in the IG app. `DELETE /v1/posts/{id}` on a published post returns `400`.
- **Buttons in the first DM can fail for non-followers** on "affected" accounts (Meta subcode 1545133). The failure **spends the one private reply** for that comment. Check the first days of logs (`status: failed`, `privateReplyConsumed: true`, the error text). If affected, switch to a plain-text `dmMessage` with the URL inline.
- Commenters' DMs land in **Message Requests**. Quick replies do not render there, so use buttons or plain text.
- Keyword **case sensitivity is undocumented**. Use `matchMode: "word"` and list case variants. `contains` with "MAC" would fire on "iMac" or "macbook".
- **Account-wide automation backup polling covers only the 5 newest posts.** At 5 posts a day, older Reels rely on the webhook alone. Per-post automations, bound by `postId` at creation, avoid this.
- **Only one active per-post automation per post** (`409`). Use `PATCH` to change it.
- Content-hash dedup: identical caption plus media to the same account within 24h returns `409`. Every Reel must have unique media or caption, which is naturally true.
- Media uploads expire in 7 days if no post references them. Create the post soon after uploading. Once a post exists, its media is copied to permanent storage.
- A snake_case or misspelled key in a raw JSON body is **silently ignored**. For example, `scheduled_for` makes the post a draft. Check `post.status` in the response.
- `207` responses are 2xx. Check `post.status`.
- Connect with full scopes (the default). A `posting`-only connection skips `firstComment` and cannot run the inbox or automations.
- `commentsEnabled: false` would make comment-to-DM impossible. Leave it at the default `true`.
- `muteAudio`, `audioConfiguration`, the paid partnership label, the `reposts` metric and comment likes need or interact with **Facebook Login**. Choose the login method at connect time. Switching later requires disconnecting first (`instagram_login_method_mismatch`).
- DMs from automations count toward the 10,000 free outbound messages a month. With no card, the 10,001st fails with `403 message_allowance_exceeded`.
- `GET /v1/inbox/comments/{postId}` is cached for up to 10 min. Use the `comment.received` webhook for real time.

### Unknowns (not in the docs)
- Max file size and exact aspect enforcement for the IG Reel cover (`instagramThumbnail`). Only "JPEG or PNG, recommended 1080 x 1920 px" is documented.
- Required audio codec for Reels.
- Keyword case sensitivity in comment automations.
- Whether `firstComment` definitely posts on Reels (see contradiction 1).
- Whether @itsongit is an account affected by the non-follower button refusal. The docs say only its own past refusals show this.
