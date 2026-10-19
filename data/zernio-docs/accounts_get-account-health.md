# Check account health API Reference

Returns detailed health info for a specific account including token status, permissions, and recommendations.

A failing or stalled analytics sync (see `analyticsSync`) raises a healthy account to at least `warning`.

On Facebook, Instagram and Threads the token is also probed live. A probe Meta refuses with a
dead-token error sets `tokenStatus.valid` to `false` and names Meta's code, subcode and
fbtrace in `issues`, unless an analytics sync succeeded with that token in the last six
hours: then the token stays `valid` and `issues` reports the probe as inconclusive, since
Meta answers a transient 190 to live tokens now and then. Neither verdict disconnects the
account; that happens only when a real operation fails, and `account.disconnected` is sent.

For WhatsApp accounts the response also includes `platformConnection`, a live probe of the
Meta link behind the channel (the same read as `GET /v1/whatsapp/number-info`). The OAuth
token can be perfectly valid while Meta refuses to serve the phone-number object (for
example after a phone-side coexistence disconnect), so `tokenStatus` alone is not a
liveness signal for WhatsApp. When the Meta link is dead, `platformConnection.status` is
`disconnected` and the overall `status` is `error`. When Meta reports that the number's
inbound message webhook does not reach Zernio, `platformConnection.inboundWebhookSubscribed`
is `false`, an entry is added to `issues`, and the overall `status` is at least `warning`.

For the standalone ads connections (`googleads`, `redditads`) a connection that cannot serve
requests until a fresh OAuth repairs it adds an entry to `issues` and a recommendation to call
`GET /v1/connect/{platform}/ads`, whose `authUrl` reconnects the same account. On `redditads`
this is a connection authorized before Zernio needed a Reddit permission it now uses (for
example `adsconversions`): Reddit refuses those requests until the user reconnects and allows
every permission on Reddit's consent screen.


## GET /v1/accounts/{accountId}/health

**Check account health**

Returns detailed health info for a specific account including token status, permissions, and recommendations.

A failing or stalled analytics sync (see `analyticsSync`) raises a healthy account to at least `warning`.

On Facebook, Instagram and Threads the token is also probed live. A probe Meta refuses with a
dead-token error sets `tokenStatus.valid` to `false` and names Meta's code, subcode and
fbtrace in `issues`, unless an analytics sync succeeded with that token in the last six
hours: then the token stays `valid` and `issues` reports the probe as inconclusive, since
Meta answers a transient 190 to live tokens now and then. Neither verdict disconnects the
account; that happens only when a real operation fails, and `account.disconnected` is sent.

For WhatsApp accounts the response also includes `platformConnection`, a live probe of the
Meta link behind the channel (the same read as `GET /v1/whatsapp/number-info`). The OAuth
token can be perfectly valid while Meta refuses to serve the phone-number object (for
example after a phone-side coexistence disconnect), so `tokenStatus` alone is not a
liveness signal for WhatsApp. When the Meta link is dead, `platformConnection.status` is
`disconnected` and the overall `status` is `error`. When Meta reports that the number's
inbound message webhook does not reach Zernio, `platformConnection.inboundWebhookSubscribed`
is `false`, an entry is added to `issues`, and the overall `status` is at least `warning`.

For the standalone ads connections (`googleads`, `redditads`) a connection that cannot serve
requests until a fresh OAuth repairs it adds an entry to `issues` and a recommendation to call
`GET /v1/connect/{platform}/ads`, whose `authUrl` reconnects the same account. On `redditads`
this is a connection authorized before Zernio needed a Reddit permission it now uses (for
example `adsconversions`): Reddit refuses those requests until the user reconnects and allows
every permission on Reddit's consent screen.


### Parameters

- **accountId** (required) in path: The account ID to check

### Responses

#### 200: Account health details

**Response Body:**

- **accountId** `string`: No description
- **platform** `string`: No description
- **integrationLane** `string`: TikTok only. The TikTok integration the account is connected through: business (TikTok for Business, Accounts API) or developer (the original integration). Absent on other platforms. - one of: business, developer
- **username** `string`: No description
- **displayName** `string`: No description
- **status** `string`: Overall health status - one of: healthy, warning, error
- **tokenStatus** `object`: 
  - **valid** `boolean`: Whether the token is valid
  - **expiresAt** `string` (date-time): No description
  - **expiresIn** `string`: Human-readable time until expiry
  - **needsRefresh** `boolean`: Whether token expires within 24 hours
- **permissions** `object`: 
  - **posting** `array[object]`: 
    - **scope** `string`: No description
    - **granted** `boolean`: No description
    - **required** `boolean`: No description
  - **analytics** `array[object]`: 
    - **scope** `string`: No description
    - **granted** `boolean`: No description
    - **required** `boolean`: No description
  - **optional** `array[object]`: 
    - **scope** `string`: No description
    - **granted** `boolean`: No description
    - **required** `boolean`: No description
  - **canPost** `boolean`: No description
  - **canFetchAnalytics** `boolean`: No description
  - **missingRequired** `array[string]`: 
- **issues** `array[string]`: List of issues found
- **recommendations** `array[string]`: Actionable recommendations to fix issues
- **analyticsSync** `object`: Absent on platforms without analytics sync. failing: several consecutive sync attempts failed. stalled: a sync was requested over 6 hours ago and never completed. never_synced: no sync has completed yet. Failing and stalled raise the account status to at least warning.
  - **status** `string`: No description - one of: ok, failing, stalled, never_synced
  - **lastSyncedAt** `string,null` (date-time): Last successful sync. Null when never synced or the latest attempt failed.
- **messagingRestriction** `object,null`: Observed from Meta's own errors on our own sends, not a live probe. Facebook/Instagram: error subcodes 2534122, 1893063, 2534029, set on the first refused send and cleared when a later send succeeds. WhatsApp: Cloud API error codes 131042 (payment or eligibility issue), 131031 (Business Account locked) and 368 (policy block), set when a send or a delivery status fails with one and cleared when a later message is delivered. It lags reality by one message in each direction. After subcode 1893063 (Meta refusing the Page's messages), comment automation DMs are held and one is retried at `pausedUntil`: 30 minutes, doubling per refused retry up to 4 hours; held DMs stay pending and are sent once Meta accepts again, within the 7-day private-reply window.
- **platformConnection** `object`: WhatsApp accounts only. Live probe of the Meta link behind the channel, performed at request time (the same read as GET /v1/whatsapp/number-info).
  - **status** `string`: `connected` = Meta served the channel object. `disconnected` = Meta refused to serve it (Graph error 100, subcode 33), which is how a phone-side coexistence disconnect surfaces. `unknown` = the live read failed for another reason (timeout, transient Meta error), not evidence either way. - one of: connected, disconnected, unknown
  - **checkedAt** `string` (date-time): When this live probe ran (always the current request; never cached)
  - **phoneStatus** `string,null`: Meta's own `status` field from the phone-number node (for example CONNECTED), when the object was readable
  - **metaError** `object,null`: Set only when status is `disconnected`
  - **inboundWebhookSubscribed** `boolean,null`: From the phone number's Meta health_status. `false` = Meta says Zernio is not subscribed to the message webhook for this number, so inbound messages are not delivered even though the number is CONNECTED and can still send. Fix by re-subscribing (reconnect the number); if it stays `false`, the number is routed to a different WhatsApp Business Account (typically after linking it to a Facebook Page). `true` = Meta reports no such problem. `null` = Meta did not report it (read failed or no health_status), not evidence either way.

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

#### 404: Resource not found

**Response Body:**

- **error** `string`: No description (example: "Not found")

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