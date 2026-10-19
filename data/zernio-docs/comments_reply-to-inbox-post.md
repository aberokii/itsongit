# Reply to comment API Reference

Post a reply to a post or specific comment. Requires accountId in request body.

**Idempotency:** send an `Idempotency-Key` header to make retries safe
(e.g. after a client-side timeout where delivery is unknown): same key +
same body replays the original response (with `Idempotent-Replayed: true`)
instead of posting the comment a second time; same key + different body
returns 422; a key still in flight returns 409. Keys are retained for 24
hours and are scoped to the credential and to this exact path, so reusing
a key against a different postId returns 422 rather than replaying the
other post's response.

Only successful (2xx) responses are stored for replay. If the request
throws or returns a non-2xx status the key is released, so the header
protects the "request succeeded but the response was lost" case. After an
ambiguous failure (a 5xx or a network timeout) list the post's comments
before retrying with the same key, and treat an empty result as
inconclusive rather than as proof nothing was posted.


## GET /v1/inbox/comments/{postId}

**Get post comments**

Fetch comments for a specific post. Requires accountId query parameter.

Pass `commentId` (Facebook, Instagram, Reddit, TikTok) to fetch replies to a specific
comment instead of the post's top-level comments. Facebook, Instagram and TikTok return
the comment's replies, paged by `limit`/`cursor`; Reddit returns the focused comment
thread instead. On Facebook and Instagram the requested comment itself comes back in the
top-level `comment` field.

On Facebook, passing a COMMENT id as `postId` (instead of using `commentId`) is also
supported for backwards compatibility and returns that comment's replies the same way.
Prefer `commentId` for new integrations; it also works on Instagram, which rejects a
comment id passed as `postId`. YouTube does not support either form, `postId` must be a
video id.

Responses are cached for up to 10 minutes, so a page may lag new comments by that
window. Do not poll this endpoint for real-time updates: subscribe to the
`comment.received` webhook, which delivers new comments as they arrive. Your own
writes (creating, replying to, or deleting a comment) refresh the cache immediately.

TikTok is served for accounts connected through the TikTok for Business app: `postId`
is the TikTok video id, each top-level comment carries up to three inline replies, and
`commentId` pages the full reply list of one comment. Developer-app TikTok accounts
return 400 with code `PLATFORM_LIMITATION`.

On X (Twitter), when `postId` is itself a reply rather than the thread's root post,
only replies to that specific post are returned, not the whole conversation thread.

Hidden comments: Facebook Pages and Instagram accounts connected through Instagram Login
return them with `isHidden: true`. Instagram accounts connected through Facebook Login do
not return them at all (Meta omits them, together with their replies), so a hidden comment
and a deleted one look the same on this read.


### Parameters

- **postId** (required) in path: Zernio post ID or platform-specific post ID. Zernio IDs are auto-resolved. On LinkedIn, pass the post id exactly as the feed returns it (urn:li:share:<id> or urn:li:ugcPost:<id>). A bare number is read as an activity id (urn:li:activity:<n>, the number in a linkedin.com/feed/update URL); a share or ugcPost number passed bare returns an empty list. On Facebook, a comment ID is also accepted here and returns that comment's replies, kept for backwards compatibility; prefer the `commentId` query parameter, which also works on Instagram.
- **accountId** (required) in query: No description
- **subreddit** (optional) in query: (Reddit only) Subreddit name
- **limit** (optional) in query: Maximum number of comments to return
- **cursor** (optional) in query: Pagination cursor, returned by a previous call as `pagination.cursor`. This is the platform's own opaque paging value passed through verbatim: never construct, decode or validate it client-side.
- **commentId** (optional) in query: (Facebook, Instagram, Reddit and TikTok) Get replies to a specific comment. On Facebook and Instagram, the requested comment is returned in the top-level `comment` field and comments[] holds its replies.

### Responses

#### 200: Comments for the post

**Response Body:**

- **status** `string`: No description
- **comments** `array[object]`: 
  - **id** `string`: No description
  - **message** `string`: No description
  - **createdTime** `string` (date-time): No description
  - **from** `object`: 
    - **id** `string`: No description
    - **name** `string`: No description
    - **username** `string`: No description
    - **picture** `string,null`: No description
    - **isOwner** `boolean`: No description
    - **verifiedType** `string,null`: X verified badge type. Only present for X comments. - one of: blue, government, business, none
  - **likeCount** `integer`: No description
  - **replyCount** `integer`: The platform's own reply count, which includes hidden and deleted replies. Can exceed replies[].length even when repliesHasMore is false or absent.
  - **platform** `string`: The platform this comment is from
  - **url** `string,null`: Direct link to the comment on the platform (if available)
  - **replies** `array[object]`: 
    Type: `object`
  - **repliesHasMore** `boolean`: Facebook only. True when replies[] (capped at 10) does not hold the comment's full reply thread; fetch the rest by passing the comment id as the `commentId` query parameter to GET /v1/inbox/comments/{postId} (or, for backwards compatibility, as `postId`). Absent (not false) on every other platform, including Instagram, which has no equivalent signal.
  - **canReply** `boolean`: No description
  - **canDelete** `boolean`: No description
  - **canHide** `boolean`: Whether this comment can be hidden (Facebook, Instagram, Threads)
  - **canLike** `boolean`: Whether this comment can be liked (Facebook, X, Bluesky, Reddit, LinkedIn)
  - **isHidden** `boolean`: Whether the comment is currently hidden. On Instagram accounts connected through Facebook Login, Meta leaves hidden comments (and their replies) out of the list entirely, so they never appear with isHidden true; Instagram Login accounts and Facebook Pages return them with isHidden true.
  - **isLiked** `boolean`: Whether the current user has liked this comment
  - **likeUri** `string,null`: Bluesky like URI for unliking
  - **cid** `string,null`: Bluesky content identifier
  - **parentId** `string,null`: ID of the parent comment. Present on entries inside replies[] for Facebook, Instagram and X. On X it is also present on top-level entries, where it holds the ID of the post replied to. Omitted entirely (key absent, not null) on top-level Facebook and Instagram entries and on every other platform, which express the parent relationship only through replies[] nesting.
  - **rootUri** `string,null`: Bluesky root post URI
  - **rootCid** `string,null`: Bluesky root post CID
- **post**: (Reddit, Facebook and Instagram) Metadata for the target post, returned alongside the comments
so integrators can render a preview of the post being commented on without an additional request.

Facebook and Instagram return the Meta shape: the post thumbnail, text and permalink, for any post
the account can read, including the hidden dark posts Meta publishes for each variant of an ad
(dynamic creative, placement asset customization, Advantage+). Facebook posts need the Facebook
Page connection and Instagram media the Instagram connection. `thumbnailUrl` and `mediaUrl` are
Meta CDN URLs that expire: store a copy if you render them later. On Instagram, `productType`
tells an ad (`AD`) from organic media (`FEED`, `REELS`, `STORY`).

Absent on other platforms, when the post cannot be read with the connection's token, and on Reddit
when the upstream response is missing the post listing (deleted post, malformed response).

- **comment** `object`: (Facebook and Instagram only) Present when `commentId` was passed: the requested
comment itself, in the same shape as an entry in comments[]. comments[] then holds
that comment's replies instead of the post's top-level comments.

- **pagination** `object`: 
  - **hasMore** `boolean`: No description
  - **cursor** `string,null`: Only present when hasMore is true. Absent on the last page, so treat its absence as the end of the thread.
- **meta** `object`: 
  - **platform** `string`: No description
  - **postId** `string`: No description
  - **accountId** `string`: No description
  - **subreddit** `string,null`: (Reddit only) Subreddit name
  - **postUrn** `string`: (LinkedIn only) The post URN that was queried, after a bare number is read as urn:li:activity:<n>
  - **lastUpdated** `string` (date-time): No description
  - **adComments** `object,null`: (Facebook/Instagram only) Present when this post has no organic comments but is a boosted post: the engagement lives on the ad. Use the ad-comments endpoint instead.

#### 400: Invalid request, or the postId belongs to a Meta ad creative / ad ID rather than an organic post
(code USE_AD_COMMENTS_ENDPOINT; the response includes `adId` and `adCommentsUrl`), or the upstream
platform rejected the request (type platform_error, code platform_api_error; the provider's own
payload is in platformError). Meta returns code 100 with error_subcode 33 both for a story past
its 24h life and for a deleted post, so the two are indistinguishable from the response.


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

#### 403: Inbox addon required, or the connected account is not permitted to read this post on the platform (code platform_api_error, type platform_error)

#### 429: The connected account's upstream platform quota is exhausted.

Reddit rate-limits per connected Reddit user (1000 requests per
10-minute window), and that budget is shared by every operation using
that account. Retry after the window resets rather than retrying
immediately; repeated calls while exhausted do not succeed and keep the
budget spent.

Google Ads: writes and reports run on one developer token shared by
every Google Ads account on Zernio. The token holds Standard access
(no daily operations cap), so this only happens when Google throttles
the token or your ad account. The envelope has `code: rate_limited`,
`platform: google`, `details.quotaScope: DEVELOPER` (`ACCOUNT` when it
is your own ad account's quota), `details.resetsAt` (ISO instant when
Google accepts requests again) and `Retry-After` counting down to it.
Retrying earlier cannot succeed.

Meta ads: every Meta throttle (codes 4, 17, 32, 613 and the
business-use-case codes 80000-80014) returns 429 `rate_limited`, even
when Meta itself answers HTTP 400. `Retry-After` comes from Meta's
`x-business-use-case-usage` estimate when Meta sends one, otherwise it
is Meta's documented 60-second minimum (30 seconds for the one-write-per-30-seconds
limit on a single object).

Pinterest ads: Pinterest rate-limits per user and app, per category
(ads_read, ads_write, ads_analytics). `Retry-After` comes from
Pinterest's `x-ratelimit-reset` when it sends one, otherwise 60 seconds.


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

#### 502: Upstream platform error (code platform_api_error, type platform_error)

---

## POST /v1/inbox/comments/{postId}

**Reply to comment**

Post a reply to a post or specific comment. Requires accountId in request body.

**Idempotency:** send an `Idempotency-Key` header to make retries safe
(e.g. after a client-side timeout where delivery is unknown): same key +
same body replays the original response (with `Idempotent-Replayed: true`)
instead of posting the comment a second time; same key + different body
returns 422; a key still in flight returns 409. Keys are retained for 24
hours and are scoped to the credential and to this exact path, so reusing
a key against a different postId returns 422 rather than replaying the
other post's response.

Only successful (2xx) responses are stored for replay. If the request
throws or returns a non-2xx status the key is released, so the header
protects the "request succeeded but the response was lost" case. After an
ambiguous failure (a 5xx or a network timeout) list the post's comments
before retrying with the same key, and treat an empty result as
inconclusive rather than as proof nothing was posted.


### Parameters

- **postId** (required) in path: Zernio post ID or platform-specific post ID. On LinkedIn, pass the post id exactly as the feed returns it (urn:li:share:<id> or urn:li:ugcPost:<id>); a bare number is read as an activity id (urn:li:activity:<n>).
- **undefined** (optional): No description

### Request Body

- **accountId** (required) `string`: No description
- **message** (required) `string`: No description
- **attachmentUrl** `string`: (Facebook only) URL of an image to attach, publishing a photo comment alongside the text. The URL must be publicly accessible so Meta can fetch it. Returns 400 for other platforms.
- **commentId** `string`: Reply to specific comment (optional)
- **parentCid** `string`: (Bluesky only) Parent content identifier
- **rootUri** `string`: (Bluesky only) Root post URI
- **rootCid** `string`: (Bluesky only) Root post CID

### Responses

#### 200: Reply posted

**Response Body:**

- **success** `boolean`: No description
- **data** `object`: 
  - **commentId** `string`: No description
  - **isReply** `boolean`: No description
  - **cid** `string,null`: Bluesky CID

#### 400: Invalid request (e.g. attachmentUrl on a platform other than Facebook, code PLATFORM_NOT_SUPPORTED)

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

#### 403: Inbox addon required, or the connected account is not permitted to comment on this post on the platform (code platform_api_error, type platform_error)

#### 409: Same Idempotency-Key still processing; retry after a short backoff

#### 422: Idempotency-Key reused with a different request, or the platform rejected the comment (for example a locked thread, a deleted parent or a post too old for comments; code platform_api_error)

#### 429: The connected account's upstream platform quota is exhausted.

Reddit rate-limits per connected Reddit user (1000 requests per
10-minute window), and that budget is shared by every operation using
that account. Retry after the window resets rather than retrying
immediately; repeated calls while exhausted do not succeed and keep the
budget spent.

Google Ads: writes and reports run on one developer token shared by
every Google Ads account on Zernio. The token holds Standard access
(no daily operations cap), so this only happens when Google throttles
the token or your ad account. The envelope has `code: rate_limited`,
`platform: google`, `details.quotaScope: DEVELOPER` (`ACCOUNT` when it
is your own ad account's quota), `details.resetsAt` (ISO instant when
Google accepts requests again) and `Retry-After` counting down to it.
Retrying earlier cannot succeed.

Meta ads: every Meta throttle (codes 4, 17, 32, 613 and the
business-use-case codes 80000-80014) returns 429 `rate_limited`, even
when Meta itself answers HTTP 400. `Retry-After` comes from Meta's
`x-business-use-case-usage` estimate when Meta sends one, otherwise it
is Meta's documented 60-second minimum (30 seconds for the one-write-per-30-seconds
limit on a single object).

Pinterest ads: Pinterest rate-limits per user and app, per category
(ads_read, ads_write, ads_analytics). `Retry-After` comes from
Pinterest's `x-ratelimit-reset` when it sends one, otherwise 60 seconds.


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

#### 502: Upstream platform error (code platform_api_error, type platform_error)

---

## DELETE /v1/inbox/comments/{postId}

**Delete comment**

Delete a comment on a post. Supported by Facebook, Instagram, Threads, LinkedIn, Reddit, Bluesky, X (Twitter), YouTube, and TikTok (accounts connected through the TikTok for Business app). Not supported on Google Business (reviews only).
Requires accountId and commentId query parameters.


### Parameters

- **postId** (required) in path: Zernio post ID or platform-specific post ID. On LinkedIn, pass the post id exactly as the feed returns it (urn:li:share:<id> or urn:li:ugcPost:<id>); a bare number is read as an activity id (urn:li:activity:<n>).
- **accountId** (required) in query: No description
- **commentId** (required) in query: For LinkedIn, accepts either the numeric comment ID or the composite comment URN returned by the comments listing (e.g. urn:li:comment:(threadUrn,id))

### Responses

#### 200: Comment deleted

**Response Body:**

- **success** `boolean`: No description
- **data** `object`: 
  - **message** `string`: No description

#### 400: Platform rejected the operation (e.g., comment already deleted)

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

#### 403: Inbox addon required, or the connected account is not permitted to delete this comment on the platform (code platform_api_error, type platform_error)

#### 429: The connected account's upstream platform quota is exhausted.

Reddit rate-limits per connected Reddit user (1000 requests per
10-minute window), and that budget is shared by every operation using
that account. Retry after the window resets rather than retrying
immediately; repeated calls while exhausted do not succeed and keep the
budget spent.

Google Ads: writes and reports run on one developer token shared by
every Google Ads account on Zernio. The token holds Standard access
(no daily operations cap), so this only happens when Google throttles
the token or your ad account. The envelope has `code: rate_limited`,
`platform: google`, `details.quotaScope: DEVELOPER` (`ACCOUNT` when it
is your own ad account's quota), `details.resetsAt` (ISO instant when
Google accepts requests again) and `Retry-After` counting down to it.
Retrying earlier cannot succeed.

Meta ads: every Meta throttle (codes 4, 17, 32, 613 and the
business-use-case codes 80000-80014) returns 429 `rate_limited`, even
when Meta itself answers HTTP 400. `Retry-After` comes from Meta's
`x-business-use-case-usage` estimate when Meta sends one, otherwise it
is Meta's documented 60-second minimum (30 seconds for the one-write-per-30-seconds
limit on a single object).

Pinterest ads: Pinterest rate-limits per user and app, per category
(ads_read, ads_write, ads_analytics). `Retry-After` comes from
Pinterest's `x-ratelimit-reset` when it sends one, otherwise 60 seconds.


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

#### 502: Upstream platform error (code platform_api_error, type platform_error)

---


# Related Schema Definitions

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