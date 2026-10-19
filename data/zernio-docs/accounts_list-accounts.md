# List accounts API Reference

Returns connected accounts. Only includes accounts within the plan limit by default. Follower data requires analytics add-on.
Supports optional server-side pagination via page/limit params. When omitted, returns all accounts (backward-compatible).
page and limit must be supplied together; out-of-range page/limit values are rejected with 400 rather than silently clamped.


## GET /v1/accounts

**List accounts**

Returns connected accounts. Only includes accounts within the plan limit by default. Follower data requires analytics add-on.
Supports optional server-side pagination via page/limit params. When omitted, returns all accounts (backward-compatible).
page and limit must be supplied together; out-of-range page/limit values are rejected with 400 rather than silently clamped.


### Parameters

- **profileId** (optional) in query: Filter accounts by profile ID. Must be a valid ObjectId.
- **platform** (optional) in query: Filter accounts by platform (e.g. "instagram", "twitter").
- **status** (optional) in query: Filter accounts by connection status. `connected` returns healthy accounts; `disconnected` returns accounts that need reconnection (per the same reconnection check surfaced in the dashboard). Omit to return accounts in any status. When combined with page/limit, pagination totals reflect the filtered result set.

- **search** (optional) in query: Case-insensitive match on the account username, display name or platform user id, or an exact account id. Combine with page/limit to paginate the matches.
- **category** (optional) in query: Only accounts of this kind. ads = ad accounts (Meta, Google, LinkedIn, Pinterest, TikTok, X, OpenAI, Reddit), communication = WhatsApp, Telegram, Discord, Slack and iMessage, blogs = Shopify and WordPress, social = every other platform.
- **sort** (optional) in query: Sort a paginated listing (page/limit) by account name, platform, profile name, status (accounts needing a reconnect first when ascending) or connection date. Ties keep the default order: platform, then newest first.
- **order** (optional) in query: Direction for `sort`.
- **includeOverLimit** (optional) in query: When true, includes accounts from over-limit profiles.
- **excludeHidden** (optional) in query: When true, leaves out accounts the dashboard does not show as connections: posting
accounts with `enabled: false` (ads accounts are always kept, whatever their `enabled`
value) and the internal `sms` and `phone` accounts behind each phone number. Applied
before pagination, so page totals and `statusCounts` count only the remaining accounts.
Sandbox accounts added by `includeSandbox` are appended after this filter. Accepts
`true` or `false` in any letter case; any other value returns 400.

- **includeSandbox** (optional) in query: When true, appends the shared WhatsApp sandbox account and the iMessage sandbox account
to the list when they are active, honouring `platform` but no other filter. Ignored on
a paginated request (page/limit) and together with `perProfile`. Accepts `true` or
`false` in any letter case; any other value returns 400.

- **includeStatusCounts** (optional) in query: When true, the response carries `statusCounts`: how many accounts match every other
filter of the request (with `status` lifted) in total and how many of those need a
reconnection. Accepts `true` or `false` in any letter case; any other value returns 400.

- **page** (optional) in query: Page number (1-based). Must be provided together with limit to enable server-side pagination; sending only one of the two returns 400. Omit both for all accounts.

- **limit** (optional) in query: Page size. Must be provided together with page; sending only one of the two returns 400.

- **profileIds** (optional) in query: Comma-separated profile IDs (up to 50) to preview, together with perProfile. The response then also carries `profileTotals`.
- **perProfile** (optional) in query: Return a preview of each profile in profileIds: the newest account of every platform it has, topped up to at least N. Requires profileIds; cannot be combined with page and limit.

### Responses

#### 200: Accounts (with optional pagination)

**Response Body:**

- **accounts** (required) `array[SocialAccount]`: 
- **hasAnalyticsAccess** (required) `boolean`: Whether user has analytics add-on access
- **pagination**: `Pagination` - Only present when page/limit params are provided
- **profileTotals** `object`: Only with profileIds and perProfile. Accounts matching the filters per profile ID; a profile with none is absent.
- **statusCounts** `object`: Only with includeStatusCounts=true. Counts over every filter of the request except status.
  - **all** (required) `integer`: Accounts matching the filters in any status.
  - **disconnected** (required) `integer`: Of those, the accounts that need reconnection.

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

#### 503: An upstream service or database is temporarily unavailable. Retry after the indicated delay. A timed-out write may have completed upstream; check its outcome before resubmitting.

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


# Related Schema Definitions

## AccountsListResponse

### Properties

- **accounts** (required) `array`: No description
- **hasAnalyticsAccess** (required) `boolean`: Whether user has analytics add-on access
- **pagination**: Only present when page/limit params are provided
- **profileTotals** `object`: Only with profileIds and perProfile. Accounts matching the filters per profile ID; a profile with none is absent.
- **statusCounts** `object`: Only with includeStatusCounts=true. Counts over every filter of the request except status.
  - **all** `integer`: Accounts matching the filters in any status.
  - **disconnected** `integer`: Of those, the accounts that need reconnection.

## SocialAccount

### Properties

- **_id** (required) `string`: No description
- **platform** (required) `string`: No description - one of: tiktok, instagram, facebook, youtube, linkedin, twitter, threads, pinterest, reddit, bluesky, googlebusiness, telegram, snapchat, discord, slack, whatsapp, shopify, wordpress, linkedinads, metaads, pinterestads, tiktokads, xads, googleads, openaiads, redditads, sms, phone, rcs, whopads
- **profileId** (required): No description
- **username** `string`: No description
- **displayName** `string`: No description
- **platformUserId** `string`: The account's id on its platform as the platform reports it to Zernio; stable across reconnects, so it is the key to match an account against your own records. Instagram: the app-scoped user id on Instagram Login accounts (the professional account id is in `metadata.instagramScopedId`), the professional account id (`17841...`) on Facebook Login accounts. TikTok: the open_id of Zernio's TikTok app, which differs from the open_id any other app sees for the same user. Either value can be passed back as `expectedPlatformUserId` on GET /v1/connect/{platform}.
- **tiktokAccountType** `string`: TikTok accounts only. The account type TikTok reported when the account was connected. `personal` accounts cannot use TikTok direct messages through the API (TikTok limits Business Messaging to Business Accounts): skip the inbox for them and tell the user to switch to a Business Account in the TikTok app, then reconnect. `business` is the prerequisite, not a guarantee; messaging also needs the messaging scopes granted and TikTok's regional availability. `unknown` on accounts connected before this was captured or whose grant left out the account-type scope. - one of: business, personal, unknown
- **profilePicture** `string,null`: URL to the account's profile picture on the platform. May be null if the platform does not provide one.
- **profileUrl** `string`: Full profile URL for the connected account on its platform.
- **isActive** (required) `boolean`: No description
- **needsReconnection** `boolean`: The platform definitively reported the stored OAuth token as dead.
While true, GET /v1/connect/{platform}/ads returns a
fresh authUrl (implicit force=true) instead of alreadyConnected,
so re-running the connect flow recovers the account. Cleared
automatically when the account is re-authorized.

- **followersCount** `number`: Follower count (only included if user has analytics add-on)
- **followersLastUpdated** `string`: Last time follower count was updated (only included if user has analytics add-on)
- **parentAccountId** `string,null`: Reference to the parent posting SocialAccount. Set for ads accounts that share
or derive from a posting account's OAuth token. null for standalone ads (Google Ads)
and all posting accounts. Meta ads business-login accounts also have no parent.

- **enabled** `boolean`: Whether the user explicitly activated this account. false means the account was
created as a side effect (e.g., posting account auto-created when user connected
ads first). GET /v1/accounts still returns such accounts unless `excludeHidden=true`
is passed. They cannot be posted to (`ACCOUNT_NOT_ENABLED_FOR_POSTING`) and are not
billed as connected accounts. On an ads account (`metaads`, `googleads`, ...) the value
does not hide the connection: ads accounts are listed whatever their `enabled` value and
keep working for ads.

- **rateLimitedUntil** `string,null`: End of the account's publishing cooldown. Compare it with the current time: a value
in the past means the cooldown has ended (the field is cleared on the next successful
publish), null means no cooldown since the last successful publish. A cooldown starts
when a post to the account fails with `errorCategory` `user_abuse` (spam, abuse or
rate-limit errors), or when 10 or more posts to it fail within an hour with
`user_content`, `platform_error`, `platform_rate_limit` or `unknown`. It doubles with
each start inside a 24-hour window that opens at the first one (10, 20, 40, 80 minutes
and so on, capped at 24 hours). On a YouTube account with a recorded successful upload
it instead runs until 24 hours after that upload, or 1 hour when that upload is older
than 24 hours. While it is in the future, POST /v1/posts (drafts excepted) and
POST /v1/posts/{postId}/retry return 429 for this account, and this account's pending
targets on posts scheduled before the cooldown ends are failed when it starts.

- **metadata** `object`: Platform-specific metadata. Fields vary by platform. For WhatsApp accounts, includes:
- qualityRating: Phone number quality rating from Meta (GREEN, YELLOW, RED, or UNKNOWN)
- nameStatus: Display name review status (APPROVED, PENDING_REVIEW, DECLINED, or NONE). A declined or pending display name does not by itself block sending; sendability is reported separately via health_status (can_send_message).
- messagingLimitTier: Maximum unique business-initiated conversations per 24h rolling window (TIER_250, TIER_1K, TIER_10K, TIER_100K, or TIER_UNLIMITED). Scales automatically as quality rating improves.
- verifiedName: Meta-verified business display name
- displayPhoneNumber: Formatted phone number (e.g., "+1 555-123-4567")
- wabaId: WhatsApp Business Account ID
- phoneNumberId: Meta phone number ID

For Meta ads business-login accounts:
- tokenType: system-user
- businessId: The owning Business Manager ID when there is one owner; null for multiple owners.
- businessIds: Owning Business Manager IDs discovered from granted ad accounts.
- grantedAdAccountIds: Ad-account IDs granted to the token.
- adAccountBusinesses: Map from ad-account ID to its owning business ID or null.
- availablePages: Granted Page IDs and names. No Page tokens are exposed.
- selectedPageId: The Page selected for creatives and lead forms, or null.
- scopedAdAccountIds: Existing sync scope preserved on reconnect.
Non-expiring tokens have no tokenExpiresAt field. Parent posting reconnects do not replace this token.

For LinkedIn accounts, profileData carries the profile details refreshed on each daily snapshot:
- profileData.bio: The member's headline for personal accounts, or the organization description for organization accounts. null when the member has not set one.
- profileData.extraData.vanityName: The member's profile slug, i.e. the /in/{vanityName} segment of profileUrl. Personal accounts only; an organization's own slug is in metadata.organizationInfo.vanityName.

For Instagram accounts:
- loginMethod: "facebook_login" when the account was connected through Facebook Login. Absent on accounts connected with Instagram Login. On facebook_login accounts, comment reads leave hidden comments out entirely instead of returning them with isHidden true.
- instagramScopedId: the Instagram professional account id (`17841...`). On Instagram Login accounts this is the id that is the same whichever app connected the account, while platformUserId is app-scoped; Facebook Login accounts hold this id as platformUserId.

For X (Twitter) accounts:
- profileData.extraData.isPremium: Whether X reports a paid subscription (Basic, Premium, Premium+, or a blue verified badge), which raises the post length limit from 280 to 25,000 characters. Read live at connect and reconnect and refreshed by the daily follower snapshot; because X intermittently reports no subscription for subscribed accounts, a cancellation is stored on the fourth consecutive daily snapshot that reports it (about four days). Accounts connected before the extraData layout carry the same flag at profileData.isPremium.


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