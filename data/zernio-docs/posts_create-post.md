# Create post API Reference

Create a post, and optionally publish it in the same request. A post published immediately (`publishNow: true`) comes back with `platformPostUrl` in the response.

`content` is optional in four cases:

- media is attached
- all platforms have `customContent`
- every platform entry is an X Article (`platformSpecificData.article`)
- every platform entry is a LinkedIn text-free reshare (`platformSpecificData.reshareUrl` with no text)

See each platform's schema for media constraints.

## Scheduling

Pick one of:

- `scheduledFor`: publish at the scheduled time
- `publishNow: true`: publish synchronously, inside this request
- `queuedFromProfile`: publish in the profile's next queue slot

With none of them and `isDraft` unset, the post is saved as a draft. `platforms` is required unless the post is a draft.

Precedence: `isDraft: true` wins over `publishNow` and `scheduledFor` (the post is saved, never published), and `publishNow: true` wins over `scheduledFor`. A `scheduledFor` already in the past is not rejected: the post is published synchronously in the same request, exactly like `publishNow`.

## Idempotency

Three layers of duplicate-protection apply, so safe-to-retry callers (network blips, n8n / Zapier retries, etc.) don't accidentally double-post.

**1. `Idempotency-Key` (recommended for retries, 24-hour window).**
Send an `Idempotency-Key` header (a UUID per logical post, up to 255 characters) and reuse it when you retry after a 5xx, a timeout or a dropped connection. A retry with the same key within 24 hours returns **HTTP 200** with the original post in the `post` field, and no new post is created. The match is on the key alone, not on the body: a retry returns the original post even if its body differs (for example a re-uploaded media URL). It covers drafts, and a post that was saved even though the original response was a 5xx or timed out.

If the first request is still being processed, the retry gets **HTTP 409** with `code: idempotency_conflict` and a `Retry-After` header; retry after that delay. If the first request failed without creating a post, the retry is processed as a new request. Keys are scoped to your user. Never reuse a key for a different post: that post would not be created, and the earlier one would be returned instead.

**2. `x-request-id` retry detection (24-hour window).**
If a request carries the same `x-request-id` as an earlier one AND collides with it on the content fingerprint below (same account, content and media URLs), we return **HTTP 200** with the original post in the `post` field (or **HTTP 202** with `postId` if the original is still being saved) instead of a 409. A request with the same `x-request-id` but different content is a new post. When both headers are sent, `Idempotency-Key` wins and `x-request-id` is ignored for matching.

The official Zernio SDKs auto-generate a unique `x-request-id` per call. On a generic HTTP client (curl, n8n's HTTP node, Zapier, custom code), either:

- Set a unique `x-request-id` per logical call (UUIDv4 is fine)
- Or omit the header, and we'll treat each request as new

**3. Content-hash dedup (24-hour window).**
Independently, we hash `(platform, accountId, content + media URLs)` and reject duplicates within 24 hours with **HTTP 409**. This catches genuine "same content posted twice to the same account" cases regardless of `x-request-id`. The response carries `error`, `accountId`, `platform`, and `existingPostId` so you can find the original.

To intentionally re-post identical content within 24h, change something (the caption, the media, the account), because the dedup is keyed on the full content fingerprint.

Order: an `Idempotency-Key` match (200) is checked first, then same-`x-request-id` retries (200), then the content-hash dedup (409).


## GET /v1/posts

**List posts**

Returns a paginated list of posts. Published posts include platformPostUrl with the public URL on each platform. A query parameter that is not listed here returns 400 naming it and the accepted parameters, so a misspelled filter never silently returns the unfiltered list.

### Parameters

- **undefined** (optional): No description
- **limit** (optional) in query: Page size. Values above the maximum return 400 rather than being clamped.
- **offset** (optional) in query: Row offset. Takes precedence over page when both are sent; the response pagination.page is derived from it.
- **source** (optional) in query: Which collection to read. `zernio` (default) returns posts authored through Zernio. `external` returns posts synced from the platform (existing/historical posts that were published outside Zernio). Combine with `accountId` and paginate via `page`/`limit` to walk the full synced history (we keep up to the last ~12 months per account).
- **status** (optional) in query: No description
- **platform** (optional) in query: No description
- **profileId** (optional) in query: Filter posts to a specific profile (24-char hex ObjectId). Omit it, or send `all` or an empty value, to list posts across every profile.
- **createdBy** (optional) in query: Filter posts to those created by a specific team user (24-char hex ObjectId).
- **fromDate** (optional) in query: Zero-padded YYYY-MM-DD, or a full ISO 8601 datetime. An empty value means no date filter; any other malformed value returns 400. The same name the other date-window filters use (ads, analytics).
- **toDate** (optional) in query: Zero-padded YYYY-MM-DD, or a full ISO 8601 datetime. An empty value means no date filter; any other malformed value returns 400. The same name the other date-window filters use (ads, analytics).
- **dateFrom** (optional) in query: Alias of fromDate, kept for existing callers
- **dateTo** (optional) in query: Alias of toDate, kept for existing callers
- **includeHidden** (optional) in query: No description
- **search** (optional) in query: Search posts by text content.
- **tags** (optional) in query: Comma-separated tags (at most 20). Returns only posts carrying every listed tag, matched exactly and case-sensitively against the tags set when the post was created. An empty value means no tag filter. `tag` is accepted as an alias.
- **sortBy** (optional) in query: Sort order for results.
- **accountId** (optional) in query: Filter posts to those published via a specific account (24-char hex ObjectId).

### Responses

#### 200: Paginated posts

**Response Body:**

- **posts** `array[Post]`: 
- **pagination**: `Pagination` - See schema definition

#### 400: Invalid request

**Response Body:**

- **error** `string`: Human-readable error message.
- **type** `string`: Error class for programmatic handling. - one of: invalid_request_error, authentication_error, permission_error, not_found, rate_limit_error, platform_error, api_error
- **code** `string`: Stable machine-readable error code.
- **param** `string`: The request field that caused the error, when applicable.
- **docUrl** `string`: Documentation page for resolving the error, when one applies.
- **platform** `string`: Upstream platform (e.g. meta, google, tiktok), present when type is platform_error.
- **platformError** `object`: Raw error payload from the upstream platform, passed through verbatim so
integrators can read provider-specific codes. For Meta this includes
error_subcode, error_user_title, and error_user_msg.

- **details** `object`: Additional structured context (e.g. field-level validation errors), for example
`privateReplyConsumed` on the private-reply endpoint's 400 when the comment's
single reply is already spent, and `privateReplyOutcome: "unknown"` on its 502 when Meta
answered a server error and the reply may have been delivered.

On a Google Ads 429 it carries `quotaExhausted: true`, which marks the failure as
Google's own ads quota rather than a Zernio rate limit, so you can keep calling
other platforms instead of backing off everywhere. When Google names the scope it
also carries `quotaScope`: `DEVELOPER` means the shared developer-token budget
(every Google account is affected and there is nothing to change on your side),
`ACCOUNT` means your own ad account. A Meta 429 carries neither field.

A Zernio Google Ads burst-limit 429 carries `budgetScope` instead, and never
`quotaExhausted`: these are Zernio's own limits, applied before the call
reaches Google, and both clear within a minute. `account` is the limit of 15
requests per minute per connected Google Ads account; `user` is the ceiling of
120 requests per minute per Zernio user across all their Google Ads accounts.
Both are separate axes from `quotaScope`, not the same pool named twice.

A failed Meta ad create (`POST /v1/ads/create`, `POST /v1/ads/boost`,
`POST /v1/ads/ctwa`) carries `stage`, `adAccountId` and `createdObjects`: where
it failed, on which ad account, and every object this request had already
created with what cleanup did to it. `left_behind` objects still exist on the
ad account (Meta refused the delete, typically on a held account), so delete
them yourself or reuse them. `unconfirmedWrite` is set when Meta answered a
create with a 5xx or dropped the connection and Zernio could not confirm
whether the object exists: check that parent before creating it again.

When Meta refuses a write because the ad account's status is ineligible to manage
ads (Meta subcode 2490592 or 4841021, on the write itself or on a cleanup delete),
any Meta ads write (create, boost, CTWA, campaign / ad set / ad updates and status
changes) answers 422 `ad_account_unusable`. The message names the ad account when
known, links Meta's fix (https://www.facebook.com/business/help/422289316306981),
lists the objects left behind and ends with Meta's original error, which also stays
verbatim in `platformError`. Meta often reports the first failure under an
unrelated code (e.g. 1487194 on the creative), so branch on `code`, not on
`platformError`.

  - **stage** `string`: Meta ad create failures only. The step that failed: `media` (image/video download or upload), `campaign`, `adset`, `creative`, `ad` (the ad POST itself, where Meta's code 31 / 3858385 hold and 100 / 1359188 payment rejections land), `activation` (switching the created objects on), or `other` (a read or check before any write). - one of: media, campaign, adset, creative, ad, activation, other
  - **adAccountId** `string`: Meta ad create failures only. The ad account the request wrote to (`act_...`).
  - **createdObjects** `array[object]`: Meta ad create failures only. Every object this request created before failing, in creation order. Objects you referenced (an existing campaign, ad set, creative or video) are never listed and never deleted.
    - **type** `string`: No description - one of: campaign, adset, creative, ad, video, image
    - **id** `string`: Meta object id; for `image` the image hash.
    - **cleanup** `string`: `deleted`: Zernio deleted it. `left_behind`: Meta refused the delete, so it still exists. `kept`: deliberately not deleted (image hashes are shared by every upload of the same file). - one of: deleted, left_behind, kept
  - **unconfirmedWrite** `object`: Meta ad create failures only, when Meta answered a create with a 5xx or dropped the connection and the object could not be looked up. Zernio did not retry it.
    - **type** `string`: No description - one of: campaign, adset, creative, ad
    - **parentId** `string`: Where to look for it: the ad set for an ad, the campaign for an ad set, the ad account otherwise.
  - **quotaExhausted** `boolean`: Google Ads 429 only. True when the upstream Google Ads quota is spent rather than a Zernio limit.
  - **quotaScope** `string`: Google Ads 429 only, when Google names the scope. DEVELOPER is the shared developer-token budget; ACCOUNT is your ad account. - one of: DEVELOPER, ACCOUNT
  - **budgetScope** `string`: Zernio Google Ads burst-limit 429 only (never set alongside `quotaExhausted`). `account` is the limit of 15 requests per minute per connected Google Ads account; `user` is the ceiling of 120 requests per minute per Zernio user across all their Google Ads accounts. Both clear within a minute. - one of: account, user

#### 401: Missing or invalid API key. `code` is `missing_credentials` when no Authorization header was sent and `invalid_credentials` when the key is unknown, revoked or expired.

**Response Body:**

- **error** `string`: Human-readable error message.
- **type** `string`: Error class for programmatic handling. - one of: invalid_request_error, authentication_error, permission_error, not_found, rate_limit_error, platform_error, api_error
- **code** `string`: Stable machine-readable error code.
- **param** `string`: The request field that caused the error, when applicable.
- **docUrl** `string`: Documentation page for resolving the error, when one applies.
- **platform** `string`: Upstream platform (e.g. meta, google, tiktok), present when type is platform_error.
- **platformError** `object`: Raw error payload from the upstream platform, passed through verbatim so
integrators can read provider-specific codes. For Meta this includes
error_subcode, error_user_title, and error_user_msg.

- **details** `object`: Additional structured context (e.g. field-level validation errors), for example
`privateReplyConsumed` on the private-reply endpoint's 400 when the comment's
single reply is already spent, and `privateReplyOutcome: "unknown"` on its 502 when Meta
answered a server error and the reply may have been delivered.

On a Google Ads 429 it carries `quotaExhausted: true`, which marks the failure as
Google's own ads quota rather than a Zernio rate limit, so you can keep calling
other platforms instead of backing off everywhere. When Google names the scope it
also carries `quotaScope`: `DEVELOPER` means the shared developer-token budget
(every Google account is affected and there is nothing to change on your side),
`ACCOUNT` means your own ad account. A Meta 429 carries neither field.

A Zernio Google Ads burst-limit 429 carries `budgetScope` instead, and never
`quotaExhausted`: these are Zernio's own limits, applied before the call
reaches Google, and both clear within a minute. `account` is the limit of 15
requests per minute per connected Google Ads account; `user` is the ceiling of
120 requests per minute per Zernio user across all their Google Ads accounts.
Both are separate axes from `quotaScope`, not the same pool named twice.

A failed Meta ad create (`POST /v1/ads/create`, `POST /v1/ads/boost`,
`POST /v1/ads/ctwa`) carries `stage`, `adAccountId` and `createdObjects`: where
it failed, on which ad account, and every object this request had already
created with what cleanup did to it. `left_behind` objects still exist on the
ad account (Meta refused the delete, typically on a held account), so delete
them yourself or reuse them. `unconfirmedWrite` is set when Meta answered a
create with a 5xx or dropped the connection and Zernio could not confirm
whether the object exists: check that parent before creating it again.

When Meta refuses a write because the ad account's status is ineligible to manage
ads (Meta subcode 2490592 or 4841021, on the write itself or on a cleanup delete),
any Meta ads write (create, boost, CTWA, campaign / ad set / ad updates and status
changes) answers 422 `ad_account_unusable`. The message names the ad account when
known, links Meta's fix (https://www.facebook.com/business/help/422289316306981),
lists the objects left behind and ends with Meta's original error, which also stays
verbatim in `platformError`. Meta often reports the first failure under an
unrelated code (e.g. 1487194 on the creative), so branch on `code`, not on
`platformError`.

  - **stage** `string`: Meta ad create failures only. The step that failed: `media` (image/video download or upload), `campaign`, `adset`, `creative`, `ad` (the ad POST itself, where Meta's code 31 / 3858385 hold and 100 / 1359188 payment rejections land), `activation` (switching the created objects on), or `other` (a read or check before any write). - one of: media, campaign, adset, creative, ad, activation, other
  - **adAccountId** `string`: Meta ad create failures only. The ad account the request wrote to (`act_...`).
  - **createdObjects** `array[object]`: Meta ad create failures only. Every object this request created before failing, in creation order. Objects you referenced (an existing campaign, ad set, creative or video) are never listed and never deleted.
    - **type** `string`: No description - one of: campaign, adset, creative, ad, video, image
    - **id** `string`: Meta object id; for `image` the image hash.
    - **cleanup** `string`: `deleted`: Zernio deleted it. `left_behind`: Meta refused the delete, so it still exists. `kept`: deliberately not deleted (image hashes are shared by every upload of the same file). - one of: deleted, left_behind, kept
  - **unconfirmedWrite** `object`: Meta ad create failures only, when Meta answered a create with a 5xx or dropped the connection and the object could not be looked up. Zernio did not retry it.
    - **type** `string`: No description - one of: campaign, adset, creative, ad
    - **parentId** `string`: Where to look for it: the ad set for an ad, the campaign for an ad set, the ad account otherwise.
  - **quotaExhausted** `boolean`: Google Ads 429 only. True when the upstream Google Ads quota is spent rather than a Zernio limit.
  - **quotaScope** `string`: Google Ads 429 only, when Google names the scope. DEVELOPER is the shared developer-token budget; ACCOUNT is your ad account. - one of: DEVELOPER, ACCOUNT
  - **budgetScope** `string`: Zernio Google Ads burst-limit 429 only (never set alongside `quotaExhausted`). `account` is the limit of 15 requests per minute per connected Google Ads account; `user` is the ceiling of 120 requests per minute per Zernio user across all their Google Ads accounts. Both clear within a minute. - one of: account, user

---

## POST /v1/posts

**Create post**

Create a post, and optionally publish it in the same request. A post published immediately (`publishNow: true`) comes back with `platformPostUrl` in the response.

`content` is optional in four cases:

- media is attached
- all platforms have `customContent`
- every platform entry is an X Article (`platformSpecificData.article`)
- every platform entry is a LinkedIn text-free reshare (`platformSpecificData.reshareUrl` with no text)

See each platform's schema for media constraints.

## Scheduling

Pick one of:

- `scheduledFor`: publish at the scheduled time
- `publishNow: true`: publish synchronously, inside this request
- `queuedFromProfile`: publish in the profile's next queue slot

With none of them and `isDraft` unset, the post is saved as a draft. `platforms` is required unless the post is a draft.

Precedence: `isDraft: true` wins over `publishNow` and `scheduledFor` (the post is saved, never published), and `publishNow: true` wins over `scheduledFor`. A `scheduledFor` already in the past is not rejected: the post is published synchronously in the same request, exactly like `publishNow`.

## Idempotency

Three layers of duplicate-protection apply, so safe-to-retry callers (network blips, n8n / Zapier retries, etc.) don't accidentally double-post.

**1. `Idempotency-Key` (recommended for retries, 24-hour window).**
Send an `Idempotency-Key` header (a UUID per logical post, up to 255 characters) and reuse it when you retry after a 5xx, a timeout or a dropped connection. A retry with the same key within 24 hours returns **HTTP 200** with the original post in the `post` field, and no new post is created. The match is on the key alone, not on the body: a retry returns the original post even if its body differs (for example a re-uploaded media URL). It covers drafts, and a post that was saved even though the original response was a 5xx or timed out.

If the first request is still being processed, the retry gets **HTTP 409** with `code: idempotency_conflict` and a `Retry-After` header; retry after that delay. If the first request failed without creating a post, the retry is processed as a new request. Keys are scoped to your user. Never reuse a key for a different post: that post would not be created, and the earlier one would be returned instead.

**2. `x-request-id` retry detection (24-hour window).**
If a request carries the same `x-request-id` as an earlier one AND collides with it on the content fingerprint below (same account, content and media URLs), we return **HTTP 200** with the original post in the `post` field (or **HTTP 202** with `postId` if the original is still being saved) instead of a 409. A request with the same `x-request-id` but different content is a new post. When both headers are sent, `Idempotency-Key` wins and `x-request-id` is ignored for matching.

The official Zernio SDKs auto-generate a unique `x-request-id` per call. On a generic HTTP client (curl, n8n's HTTP node, Zapier, custom code), either:

- Set a unique `x-request-id` per logical call (UUIDv4 is fine)
- Or omit the header, and we'll treat each request as new

**3. Content-hash dedup (24-hour window).**
Independently, we hash `(platform, accountId, content + media URLs)` and reject duplicates within 24 hours with **HTTP 409**. This catches genuine "same content posted twice to the same account" cases regardless of `x-request-id`. The response carries `error`, `accountId`, `platform`, and `existingPostId` so you can find the original.

To intentionally re-post identical content within 24h, change something (the caption, the media, the account), because the dedup is keyed on the full content fingerprint.

Order: an `Idempotency-Key` match (200) is checked first, then same-`x-request-id` retries (200), then the content-hash dedup (409).


### Parameters

- **Idempotency-Key** (optional) in header: Optional client-generated key (a UUID per logical post) that makes retries safe. Reuse it on every retry of the same post, especially after a 5xx or a timeout. A retry with the same key within 24 hours returns the original post (HTTP 200) whatever its body; while the original is still being processed it returns 409 `idempotency_conflict` with `Retry-After`. Longer than 255 characters returns 400. Takes precedence over `x-request-id`. See the operation description for the full contract.

- **x-request-id** (optional) in header: Optional client-generated request identifier. A request with the same value as an earlier one within 24 hours that also matches its content fingerprint (same account, content and media URLs) returns the original post (HTTP 200) instead of a duplicate-content 409. It does not protect a retry whose body differs; use `Idempotency-Key` for that. SDKs set it automatically. See the operation description for the full idempotency contract.


### Request Body

- **title** `string`: Stored on the post for reference/display only. This field is NOT used as the video title when publishing. To set a YouTube video title, use platformSpecificData.title on the youtube platform target (falls back to the first line of content when omitted).
- **content** `string`: Post caption/text. Optional when media is attached, all platforms have customContent, every platform entry is an X Article (platformSpecificData.article), or every platform entry is a LinkedIn text-free reshare (platformSpecificData.reshareUrl with no text). Required for other text-only posts.
- **mediaItems** `array`: Media attached to every platform in the request (a platform entry can override it with `customMedia`). Each entry needs a publicly reachable HTTPS `url`; `type` (image, video, gif, document) is inferred from the URL extension when omitted and a `type` that contradicts the extension is rejected with 400. Upload files with `POST /v1/media/presign` first; per-platform size, duration and format limits are listed on each platform schema.
- **platforms** `array`: Target platforms and accounts for this post. Required for non-draft posts (returns 400 if empty). Drafts can omit platforms.
- **scheduledFor** `string`: When to publish. Required unless `publishNow` is true, `queuedFromProfile` is set, or the post is a draft. An ISO 8601 value with a `Z` or offset (`2026-01-15T10:00:00Z`, `2026-01-15T11:00:00+01:00`) is taken as-is; a value without one (`2026-01-15T10:00:00` or `2026-01-15 10:00`) is read as local time in `timezone`. A value already in the past is published synchronously in the same request. Ignored when `publishNow` is true.
- **publishNow** `boolean`: Publish to every platform synchronously in this request instead of scheduling; the response then carries each platform result and `platformPostUrl`, with HTTP 207 when some platforms failed. Takes precedence over `scheduledFor`; ignored when `isDraft` is true.
- **isDraft** `boolean`: When true, saves the post as a draft. When none of scheduledFor, publishNow, or queuedFromProfile are provided, the post defaults to draft automatically.
- **dryRun** `boolean`: TikTok only. Preview whether each `tiktok` entry in `platforms` could publish right now under the TikTok Direct Post daily limits, without creating, scheduling or publishing anything: no post is persisted and no upload slot is claimed, so it can be repeated freely. The request still goes through auth, the payment gate and body validation, then returns HTTP 200 with `{ dryRun: true, canPublish, tiktok: [...] }` instead of 201. Only `tiktok` entries are evaluated; other platforms in the body are ignored, and a body with no `tiktok` entry is rejected with 400 `invalid_field_value` on `platforms`. An entry with `platformSpecificData.tiktokSettings.draft: true` (Creator Inbox upload) is not subject to the limit and always reports `canPublish: true`. Accounts connected through the TikTok for Business app do not go through these limits at all and also always report `canPublish: true`, so on those accounts a dry run confirms the request is well-formed rather than gating it.
- **timezone** `string`: IANA timezone (`Europe/Madrid`, `America/New_York`) used to interpret a `scheduledFor` (root or per-platform) that carries no `Z` or offset, and stored on the post. Has no effect on values that already carry one. When omitted, the post takes its profile's `timezone` (the queue's profile for a queued post, else the profile its accounts share), and UTC when there is none or the accounts sit on profiles with different timezones. An unknown name returns 400 when `scheduledFor` is set.
- **tags** `array`: Tags/keywords. YouTube constraints: each tag max 100 chars, combined max 500 chars, duplicates auto-removed.
- **hashtags** `array`: Stored for reference only. Hashtags are NOT automatically appended to the caption when publishing. Include hashtags directly in the content field (platforms like Instagram only support hashtags as caption text). For YouTube keywords, use the tags field instead.
- **mentions** `array`: Stored for reference only. This field does NOT automatically create @mentions when publishing. For LinkedIn @mentions, use the /v1/accounts/{accountId}/linkedin-mentions endpoint to resolve profile URLs to URNs, then embed the returned mentionFormat directly in the post content field.
- **crosspostingEnabled** `boolean`: Stored on the post and echoed back on reads. Publishing does not branch on it: every entry in `platforms` is published regardless, so treat it as a label for your own tooling.
- **metadata** `object`: Free-form key/value pairs of your own, stored on the post and returned on reads and in webhook payloads. Zernio also writes the bookkeeping keys `usageCounted`, `usageRefunded` and `hidden` into this object; do not set them, and they are stripped from webhook payloads.
- **tiktokSettings**: Root-level TikTok settings applied to the TikTok platforms sent in the same request. Merged into each platform's platformSpecificData, with platform-specific settings taking precedence.
- **facebookSettings**: Root-level Facebook settings applied to the Facebook platforms sent in the same request. Merged into each platform's platformSpecificData.facebookSettings, with platform-specific settings taking precedence.
- **recycling**: No description
- **queuedFromProfile** `string`: Profile ID to schedule via queue. When provided without scheduledFor, the post is auto-assigned to the next available slot. Do not call /v1/queue/next-slot and use that time in scheduledFor, as that bypasses queue locking.
- **queueId** `string`: Specific queue ID to use when scheduling via queue.
Only used when queuedFromProfile is also provided.
If omitted, uses the profile's default queue.


### Responses

#### 200: Nothing was created. Either a dryRun preview (TikTok only), which deliberately carries no
numeric cap detail, only a per-account go/no-go and a reason; or a retry matched by
`Idempotency-Key` or `x-request-id`, which returns the original post
(`PostCreateResponse`, with `message: "Post already exists (idempotent retry)"`).

A newly created post is always a 201.


**Response Body:**

*One of the following:*
- `TikTokDryRunVerdict`
- `PostCreateResponse`

#### 201: Post created

**Response Body:**

- **message** `string`: No description
- **post**: `Post` - See schema definition
- **warnings** `array[string]`: Advisory notices about a post that was still created: media truncated for a platform, a recycling caveat, or a field that was ignored because it sat outside platforms[].platformSpecificData. Absent when there are none.

#### 207: The post was created, but the inline publish (`publishNow: true`, or a `scheduledFor` that is already due) did not fully succeed.

**207 is a 2xx status.** `fetch(...).ok` is `true` and axios' default `validateStatus` resolves, so a client that only checks for success will read this as a published post. Branch on the status code explicitly.

Tell the outcomes apart with `post.status`:
- `partial` - at least one platform published and at least one failed. Per-platform detail is in `platformResults` and in `post.platforms[]`.
- `failed` - no platform published. Terminal; nothing will be retried. Read `platforms[].errorMessage`, `platforms[].errorCategory` and `platforms[].errorSource` to decide whether the caller, the platform or Zernio must act.
- `scheduled` - every platform hit a transient error and was reset to `pending`. Zernio retries automatically. This is **not** a failure and must not be surfaced to an end user as one.

A publish attempt that aborted before it started (for example the post was already being processed) reports none of the three: `post.status` is whatever it already was and `platformResults` is absent. Read `error` and `post.platforms[]`, which is always present.


**Response Body:**

- **post**: `Post` - See schema definition
- **message** `string`: Human-readable summary of the publish outcome.
- **error** `string`: Present when no platform published. Absent on a partial success. Informational only; the per-platform detail is in `platformResults` and in `post.platforms[]`.
- **platformResults** `array[object]`: Per-platform outcome of the publish attempt. Omitted when the attempt aborted before producing per-platform results (for example the post was already being processed); read `post.platforms[]` in that case.
  - **platform** (required) `string`: Platform slug, matching `post.platforms[].platform`.
  - **status** (required) `string`: Per-platform status: pending, processing, published, failed, cancelled, uploading. (example: "failed")
  - **error** (required) `string,null`: Failure detail for this platform, or null when it did not fail.
- **warnings** `array[string]`: Advisory notices about the post that was still created. Absent when there are none.

#### 400: Validation error

**Response Body:**

- **error** `string`: No description

#### 401: Missing or invalid API key. `code` is `missing_credentials` when no Authorization header was sent and `invalid_credentials` when the key is unknown, revoked or expired.

**Response Body:**

- **error** `string`: Human-readable error message.
- **type** `string`: Error class for programmatic handling. - one of: invalid_request_error, authentication_error, permission_error, not_found, rate_limit_error, platform_error, api_error
- **code** `string`: Stable machine-readable error code.
- **param** `string`: The request field that caused the error, when applicable.
- **docUrl** `string`: Documentation page for resolving the error, when one applies.
- **platform** `string`: Upstream platform (e.g. meta, google, tiktok), present when type is platform_error.
- **platformError** `object`: Raw error payload from the upstream platform, passed through verbatim so
integrators can read provider-specific codes. For Meta this includes
error_subcode, error_user_title, and error_user_msg.

- **details** `object`: Additional structured context (e.g. field-level validation errors), for example
`privateReplyConsumed` on the private-reply endpoint's 400 when the comment's
single reply is already spent, and `privateReplyOutcome: "unknown"` on its 502 when Meta
answered a server error and the reply may have been delivered.

On a Google Ads 429 it carries `quotaExhausted: true`, which marks the failure as
Google's own ads quota rather than a Zernio rate limit, so you can keep calling
other platforms instead of backing off everywhere. When Google names the scope it
also carries `quotaScope`: `DEVELOPER` means the shared developer-token budget
(every Google account is affected and there is nothing to change on your side),
`ACCOUNT` means your own ad account. A Meta 429 carries neither field.

A Zernio Google Ads burst-limit 429 carries `budgetScope` instead, and never
`quotaExhausted`: these are Zernio's own limits, applied before the call
reaches Google, and both clear within a minute. `account` is the limit of 15
requests per minute per connected Google Ads account; `user` is the ceiling of
120 requests per minute per Zernio user across all their Google Ads accounts.
Both are separate axes from `quotaScope`, not the same pool named twice.

A failed Meta ad create (`POST /v1/ads/create`, `POST /v1/ads/boost`,
`POST /v1/ads/ctwa`) carries `stage`, `adAccountId` and `createdObjects`: where
it failed, on which ad account, and every object this request had already
created with what cleanup did to it. `left_behind` objects still exist on the
ad account (Meta refused the delete, typically on a held account), so delete
them yourself or reuse them. `unconfirmedWrite` is set when Meta answered a
create with a 5xx or dropped the connection and Zernio could not confirm
whether the object exists: check that parent before creating it again.

When Meta refuses a write because the ad account's status is ineligible to manage
ads (Meta subcode 2490592 or 4841021, on the write itself or on a cleanup delete),
any Meta ads write (create, boost, CTWA, campaign / ad set / ad updates and status
changes) answers 422 `ad_account_unusable`. The message names the ad account when
known, links Meta's fix (https://www.facebook.com/business/help/422289316306981),
lists the objects left behind and ends with Meta's original error, which also stays
verbatim in `platformError`. Meta often reports the first failure under an
unrelated code (e.g. 1487194 on the creative), so branch on `code`, not on
`platformError`.

  - **stage** `string`: Meta ad create failures only. The step that failed: `media` (image/video download or upload), `campaign`, `adset`, `creative`, `ad` (the ad POST itself, where Meta's code 31 / 3858385 hold and 100 / 1359188 payment rejections land), `activation` (switching the created objects on), or `other` (a read or check before any write). - one of: media, campaign, adset, creative, ad, activation, other
  - **adAccountId** `string`: Meta ad create failures only. The ad account the request wrote to (`act_...`).
  - **createdObjects** `array[object]`: Meta ad create failures only. Every object this request created before failing, in creation order. Objects you referenced (an existing campaign, ad set, creative or video) are never listed and never deleted.
    - **type** `string`: No description - one of: campaign, adset, creative, ad, video, image
    - **id** `string`: Meta object id; for `image` the image hash.
    - **cleanup** `string`: `deleted`: Zernio deleted it. `left_behind`: Meta refused the delete, so it still exists. `kept`: deliberately not deleted (image hashes are shared by every upload of the same file). - one of: deleted, left_behind, kept
  - **unconfirmedWrite** `object`: Meta ad create failures only, when Meta answered a create with a 5xx or dropped the connection and the object could not be looked up. Zernio did not retry it.
    - **type** `string`: No description - one of: campaign, adset, creative, ad
    - **parentId** `string`: Where to look for it: the ad set for an ad, the campaign for an ad set, the ad account otherwise.
  - **quotaExhausted** `boolean`: Google Ads 429 only. True when the upstream Google Ads quota is spent rather than a Zernio limit.
  - **quotaScope** `string`: Google Ads 429 only, when Google names the scope. DEVELOPER is the shared developer-token budget; ACCOUNT is your ad account. - one of: DEVELOPER, ACCOUNT
  - **budgetScope** `string`: Zernio Google Ads burst-limit 429 only (never set alongside `quotaExhausted`). `account` is the limit of 15 requests per minute per connected Google Ads account; `user` is the ceiling of 120 requests per minute per Zernio user across all their Google Ads accounts. Both clear within a minute. - one of: account, user

#### 403: Forbidden. Distinguish by the `code` field:
- `ACCOUNT_DISCONNECTED`: a target account exists but its platform connection is no longer active (token expired or revoked, or the account was disconnected). Reconnect the account, then refresh account IDs from `GET /v1/accounts` (accounts report their connection state via `isActive`). The disconnect itself is also emitted as the `account.disconnected` webhook event.
- `ACCOUNT_NOT_ENABLED_FOR_POSTING`: a target account was connected for ads only (`enabled: false`) and cannot be posted to. Connect it as a posting account (it then counts as a connected account), then refresh account IDs from `GET /v1/accounts`.
- `PROFILE_OVER_LIMIT`: a target account belongs to a profile beyond the plan's profile limit.
- No `code`: a target `accountId` does not belong to the authenticated user (or is outside the API key's profile scope).


**Response Body:**

- **error** `string`: No description (example: "Account 6a0f6d2e520992756d96bb6c (facebook \"My Page\") is disconnected and cannot be posted to. Facebook tokens expired. Please reconnect your Facebook account. After reconnecting, refresh your account IDs from GET /v1/accounts.")
- **code** `string`: Stable machine-readable cause. Absent for ownership failures. - one of: ACCOUNT_DISCONNECTED, ACCOUNT_NOT_ENABLED_FOR_POSTING, PROFILE_OVER_LIMIT

#### 409: Duplicate content detected. Returned when the requested post matches an existing one on `(platform, accountId, content-hash)` within the last 24 hours, AND the request was NOT an `x-request-id` retry. Distinct from same-`x-request-id` retries (which return HTTP 200 with the original post; see operation description for the idempotency contract).

Also returned with `code: idempotency_conflict` and a `Retry-After` header when a request with the same `Idempotency-Key` is still being processed. Retry after the delay to get the original post.

Body fields:
- `error`: human-readable message
- `details.accountId`: the account that already has this content
- `details.platform`: the platform that already has this content
- `details.existingPostId`: Zernio `_id` of the original post

To intentionally re-post identical content within 24h, vary the content fingerprint (change the caption, swap a media item, or use a different account). To avoid 409s caused by retry loops, set a unique `x-request-id` per logical request. See `parameters.x-request-id` above.


**Response Body:**

- **error** `string`: No description (example: "This exact content is already scheduled, publishing, or was posted to this account within the last 24 hours.")
- **details** `object`: 
  - **accountId** `string`: No description
  - **platform** `string`: No description
  - **existingPostId** `string`: No description

#### 429: Rate limit exceeded. Possible causes: API rate limit, velocity limit (25 posts/hour per account), account cooldown, or daily platform limits.

**Response Body:**

- **error** `string`: No description
- **details** `object`: Additional context about the rate limit

---


# Related Schema Definitions

## PostsListResponse

### Properties

- **posts** `array`: No description
- **pagination**: No description

## Post

### Properties

- **_id** `string`: No description
- **userId**: No description
- **title** `string`: Stored on the post for reference/display only. This field is NOT used as the video title when publishing. To set a YouTube video title, use platformSpecificData.title on the youtube platform target (falls back to the first line of content when omitted).
- **content** `string`: No description
- **mediaItems** `array`: No description
- **platforms** `array`: No description
- **scheduledFor** `string`: No description
- **timezone** `string`: No description
- **status** `string`: `cancelled` is set by DELETE /v1/posts/{postId}/unpublish once every platform entry has been removed from its platform (a post with published entries left becomes `partial`); cancelled posts can be edited and rescheduled like drafts. - one of: draft, scheduled, publishing, published, partial, failed, cancelled
- **tags** `array`: YouTube constraints: each tag max 100 chars, combined max 500 chars, duplicates removed.
- **hashtags** `array`: Stored for reference only. Hashtags are NOT automatically appended to the caption when publishing. Include hashtags directly in the content field (platforms like Instagram only support hashtags as caption text). For YouTube keywords, use the tags field instead.
- **mentions** `array`: Stored for reference only. This field does NOT automatically create @mentions when publishing. For LinkedIn @mentions, use the /v1/accounts/{accountId}/linkedin-mentions endpoint to resolve profile URLs to URNs, then embed the returned mentionFormat directly in the post content field.
- **visibility** `string`: No description - one of: public, private, unlisted
- **metadata** `object`: No description
- **recycling**: No description
- **recycledFromPostId** `string`: ID of the original post if this post was created via recycling
- **queuedFromProfile** `string`: Profile ID if the post was scheduled via the queue
- **queueId** `string`: Queue ID if the post was scheduled via a specific queue
- **createdAt** `string`: No description
- **updatedAt** `string`: Last change to the post or to any of its platforms (a publish, a failure, a resolved URL).

## Pagination

### Properties

- **page** `integer`: No description
- **limit** `integer`: No description
- **total** `integer`: No description
- **pages** `integer`: No description

## ErrorResponse

Canonical error envelope. `error` is the human-readable message; `type`,
`code`, `param`, `platform`, and `platformError` are top-level siblings
for programmatic handling. For upstream platform failures (`type:
platform_error`), `platformError` carries the provider's raw payload
verbatim (for Meta: `error_subcode`, `error_user_title`, `error_user_msg`).


### Properties

- **error** `string`: Human-readable error message.
- **type** `string`: Error class for programmatic handling. - one of: invalid_request_error, authentication_error, permission_error, not_found, rate_limit_error, platform_error, api_error
- **code** `string`: Stable machine-readable error code.
- **param** `string`: The request field that caused the error, when applicable.
- **docUrl** `string`: Documentation page for resolving the error, when one applies.
- **platform** `string`: Upstream platform (e.g. meta, google, tiktok), present when type is platform_error.
- **platformError** `object`: Raw error payload from the upstream platform, passed through verbatim so
integrators can read provider-specific codes. For Meta this includes
error_subcode, error_user_title, and error_user_msg.

- **details** `object`: Additional structured context (e.g. field-level validation errors), for example
`privateReplyConsumed` on the private-reply endpoint's 400 when the comment's
single reply is already spent, and `privateReplyOutcome: "unknown"` on its 502 when Meta
answered a server error and the reply may have been delivered.

On a Google Ads 429 it carries `quotaExhausted: true`, which marks the failure as
Google's own ads quota rather than a Zernio rate limit, so you can keep calling
other platforms instead of backing off everywhere. When Google names the scope it
also carries `quotaScope`: `DEVELOPER` means the shared developer-token budget
(every Google account is affected and there is nothing to change on your side),
`ACCOUNT` means your own ad account. A Meta 429 carries neither field.

A Zernio Google Ads burst-limit 429 carries `budgetScope` instead, and never
`quotaExhausted`: these are Zernio's own limits, applied before the call
reaches Google, and both clear within a minute. `account` is the limit of 15
requests per minute per connected Google Ads account; `user` is the ceiling of
120 requests per minute per Zernio user across all their Google Ads accounts.
Both are separate axes from `quotaScope`, not the same pool named twice.

A failed Meta ad create (`POST /v1/ads/create`, `POST /v1/ads/boost`,
`POST /v1/ads/ctwa`) carries `stage`, `adAccountId` and `createdObjects`: where
it failed, on which ad account, and every object this request had already
created with what cleanup did to it. `left_behind` objects still exist on the
ad account (Meta refused the delete, typically on a held account), so delete
them yourself or reuse them. `unconfirmedWrite` is set when Meta answered a
create with a 5xx or dropped the connection and Zernio could not confirm
whether the object exists: check that parent before creating it again.

When Meta refuses a write because the ad account's status is ineligible to manage
ads (Meta subcode 2490592 or 4841021, on the write itself or on a cleanup delete),
any Meta ads write (create, boost, CTWA, campaign / ad set / ad updates and status
changes) answers 422 `ad_account_unusable`. The message names the ad account when
known, links Meta's fix (https://www.facebook.com/business/help/422289316306981),
lists the objects left behind and ends with Meta's original error, which also stays
verbatim in `platformError`. Meta often reports the first failure under an
unrelated code (e.g. 1487194 on the creative), so branch on `code`, not on
`platformError`.

  - **stage** `string`: Meta ad create failures only. The step that failed: `media` (image/video download or upload), `campaign`, `adset`, `creative`, `ad` (the ad POST itself, where Meta's code 31 / 3858385 hold and 100 / 1359188 payment rejections land), `activation` (switching the created objects on), or `other` (a read or check before any write). - one of: media, campaign, adset, creative, ad, activation, other
  - **adAccountId** `string`: Meta ad create failures only. The ad account the request wrote to (`act_...`).
  - **createdObjects** `array`: Meta ad create failures only. Every object this request created before failing, in creation order. Objects you referenced (an existing campaign, ad set, creative or video) are never listed and never deleted.
  - **unconfirmedWrite** `object`: Meta ad create failures only, when Meta answered a create with a 5xx or dropped the connection and the object could not be looked up. Zernio did not retry it.
  - **quotaExhausted** `boolean`: Google Ads 429 only. True when the upstream Google Ads quota is spent rather than a Zernio limit.
  - **quotaScope** `string`: Google Ads 429 only, when Google names the scope. DEVELOPER is the shared developer-token budget; ACCOUNT is your ad account. - one of: DEVELOPER, ACCOUNT
  - **budgetScope** `string`: Zernio Google Ads burst-limit 429 only (never set alongside `quotaExhausted`). `account` is the limit of 15 requests per minute per connected Google Ads account; `user` is the ceiling of 120 requests per minute per Zernio user across all their Google Ads accounts. Both clear within a minute. - one of: account, user

## TikTokPlatformData

Photo carousels up to 35 images. Video titles up to 2200 chars, photo titles truncated to 90 chars.
privacyLevel must match creator_info options. Both camelCase and snake_case accepted.

Creator Inbox (draft mode): Set draft: true to send content to the TikTok Creator Inbox
instead of publishing immediately. The creator receives an inbox notification and completes
the post using TikTok's editing flow. This maps to TikTok's post_mode: "MEDIA_UPLOAD" internally.

Important: The field publish_type is NOT supported. Use draft: true for Creator Inbox flow.

Photo drafts use the /v2/post/publish/content/init/ endpoint with post_mode: "MEDIA_UPLOAD".
Video drafts use the dedicated /v2/post/publish/inbox/video/init/ endpoint.

When draft: true, the video.upload scope is required. When draft is false or omitted
(direct post), the video.publish scope is required. For Creator Inbox, TikTok app version
must be 31.8 or higher.


### Properties

- **draft** `boolean`: When true, sends the post to the TikTok Creator Inbox as a draft instead of publishing
immediately. The creator receives an inbox notification to complete posting via TikTok's
editing flow. Maps to TikTok API post_mode: "MEDIA_UPLOAD" (photos) or the dedicated
inbox endpoint (videos). When false or omitted, publishes directly via post_mode: "DIRECT_POST".
Note: publish_type is not a supported field. Use this field instead.

- **privacyLevel** `string`: One of the values returned by the TikTok creator info API for the account. Accounts connected through the TikTok for Business app publish videos as public only: a non-public value on a video post is rejected at creation unless draft is true (photo posts keep every level).
- **allowComment** `boolean`: Allow comments on the post
- **allowDuet** `boolean`: Allow duets (required for video posts)
- **allowStitch** `boolean`: Allow stitches (required for video posts)
- **commercialContentType** `string`: Type of commercial content disclosure. Sufficient on its own: "brand_organic"
("Your Brand") implies isBrandOrganicPost and "brand_content" ("Branded Content",
paid partnership) implies brandPartnerPromote, so you don't need to send the
boolean flags separately. Branded content cannot be posted with privacyLevel
SELF_ONLY.
 - one of: none, brand_organic, brand_content
- **brandPartnerPromote** `boolean`: Whether the post promotes a brand partner (branded content / paid partnership).
Only needed to disclose BOTH types at once (set it alongside
commercialContentType "brand_organic"), or to override the value implied by
commercialContentType.

- **isBrandOrganicPost** `boolean`: Whether the post promotes the creator's own brand (brand organic). Only needed
to disclose BOTH types at once (set it alongside commercialContentType
"brand_content"), or to override the value implied by commercialContentType.

- **contentPreviewConfirmed** `boolean`: User has confirmed they previewed the content
- **expressConsentGiven** `boolean`: User has given express consent for posting
- **mediaType** `string`: Optional override. Defaults based on provided media items. - one of: video, photo
- **videoCoverTimestampMs** `integer`: Optional for video posts. Timestamp in milliseconds to select which frame to use as thumbnail (defaults to 1000ms/1 second). Ignored when videoCoverImageUrl is provided. (min: 0)
- **videoCoverImageUrl** `string`: Optional for video posts. URL of a custom thumbnail image (JPG, PNG, or WebP, max 20MB). Any downloadable URL works: we rehost it ourselves. The image is stitched as a single frame at the start of the video to serve as the cover. Accounts connected through the TikTok for Business app hand it to TikTok as the cover instead, with no stitching, falling back to videoCoverTimestampMs without it. Overrides videoCoverTimestampMs when provided.
- **photoCoverIndex** `integer`: Optional for photo carousels. Index of image to use as cover, 0-based (defaults to 0/first image). (min: 0)
- **autoAddMusic** `boolean`: When true, TikTok may add recommended music (photos only). With the brand-organic or branded-content toggle on, TikTok allows Commercial Music Library tracks only, so this attaches nothing there; use musicSoundInfo instead.
- **musicSoundInfo** `object`: Commercial Music Library track to attach. Accounts connected through the TikTok for Business app only: a developer-app account rejects the post at publish time with a message that says so. Pick musicSoundId from GET /v1/accounts/{accountId}/tiktok/commercial-music. Ignored on drafts, where TikTok ignores every post_info field.
  - **musicSoundId** `string`: The clip.id of a track from GET /v1/accounts/{accountId}/tiktok/commercial-music (its id publishes too, but viewers may see the sound as unavailable in their country; observed from Germany). TikTok fails the publish with a generic 51065 when given the commercial music id instead.
  - **musicSoundVolume** `integer`: Track volume. TikTok defaults an omitted volume to 0, which publishes the track silently, so we default to the app's 50. Video posts only.
  - **musicSoundStart** `integer`: Start point of the track in milliseconds (default 0). Video posts only.
  - **musicSoundEnd** `integer`: End point of the track in milliseconds (default: the video length). Must be greater than musicSoundStart. Video posts only.
- **videoOriginalSoundVolume** `integer`: Volume of the video's own sound when a commercial track is attached (0 to 100). Requires musicSoundInfo. Video posts only. Omitted, TikTok keeps its API default of 0 and the video's own audio is muted under the track (the TikTok app uses 50). (min: 0) (max: 100)
- **videoMadeWithAi** `boolean`: Set true to disclose AI-generated content. Accounts connected through the TikTok for Business app carry the disclosure on video posts only: the business photo endpoint has no AI disclosure field, so true on a direct photo post is rejected at creation rather than published undisclosed. Send draft true to publish such a photo post and set the disclosure in the TikTok app.
- **locationId** `string`: Location tag to attach, as the id of a result from GET /v1/accounts/{accountId}/tiktok/locations. Accounts connected through the TikTok for Business app and video posts only: a developer-app account rejects the post at publish time with a message that says so, and a direct photo post is rejected at creation since the business photo endpoint has no location field. Requires locationName. Ignored on drafts, where TikTok ignores every post_info field.
- **locationName** `string`: Display name of the location tag, as returned next to its id. Required with locationId; a locationId without it is rejected at creation.
- **isAdsOnly** `boolean`: Set true to publish the video as an "Only show in ads" post: it is kept off the profile and exists to be used as a Spark Ad. Accounts connected through the TikTok for Business app and video posts only, with the same rejections as locationId. Ignored on drafts.
- **description** `string`: Optional long-form caption for photo posts (max 4000 chars). Recommended when content exceeds 90 chars, as photo titles are auto-truncated. Falls back to the post content when omitted. (max: 4000)

## FacebookSettings

Facebook options that must be nested under platformSpecificData.facebookSettings, or sent at the request root as facebookSettings. The remaining Facebook options sit directly on platformSpecificData, see FacebookPlatformData.


### Properties

- **draft** `boolean`: When true, creates the post as a draft in Facebook Publishing Tools instead of publishing immediately. Supported for feed posts (text, link, image, video) and reels. Not supported for stories. Drafts expire after ~30 days. (default: false)
- **carouselCards** `array`: Renders the post as a multi-link carousel (organic Page post). When set, mediaItems must be provided with the same length and all items must be images (no videos). Each cards[i] adds the click-through link and headline for the image at mediaItems[i]. Mutually exclusive with contentType=story|reel. Facebook display truncates name at ~35 chars and description at ~30 chars; longer strings are accepted but get truncated on render.

- **carouselLink** `string`: Optional top-level "See more" destination shown on the carousel end card. Defaults to the first card's link when omitted. Only used together with carouselCards.

- **textFormatPresetId** `string`: Facebook-defined preset ID that renders the post as large text on a colored background (Graph `text_format_preset_id`). Supply the raw numeric ID from Meta; we do not publish a catalog of presets and Facebook may change the available set. Pages only (ignored on personal profiles and groups) and text-only feed posts only: the request is rejected with 400 when mediaItems or carouselCards are present, when contentType is story or reel, or when content is empty. An attachment makes Facebook drop the background silently, so those are rejected up front. Length is NOT rejected: Facebook's composer stops offering a background at around 130 characters, but Meta documents no API limit, so longer content publishes and returns a warning instead. A URL detected in the content is NOT attached as a link preview while a preset is set, because a link attachment also makes Facebook drop the background.


## TikTokDryRunVerdict

### Properties

- **dryRun** (required) `boolean`: Always true on this response
- **canPublish** (required) `boolean`: True only when every evaluated TikTok account can publish now
- **tiktok** (required) `array`: One verdict per `tiktok` entry in the request, in request order

## PostCreateResponse

### Properties

- **message** `string`: No description
- **post**: No description
- **warnings** `array`: Advisory notices about a post that was still created: media truncated for a platform, a recycling caveat, or a field that was ignored because it sat outside platforms[].platformSpecificData. Absent when there are none.

## PostPublishIncompleteResponse

Body of the 207 returned by createPost and updatePost when the post was saved but the inline publish did not fully succeed. Read `post.status` to tell the three outcomes apart.

### Properties

- **post**: No description
- **message** `string`: Human-readable summary of the publish outcome.
- **error** `string`: Present when no platform published. Absent on a partial success. Informational only; the per-platform detail is in `platformResults` and in `post.platforms[]`.
- **platformResults** `array`: Per-platform outcome of the publish attempt. Omitted when the attempt aborted before producing per-platform results (for example the post was already being processed); read `post.platforms[]` in that case.
- **warnings** `array`: Advisory notices about the post that was still created. Absent when there are none.