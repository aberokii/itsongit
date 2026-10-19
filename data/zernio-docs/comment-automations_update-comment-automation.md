# Update automation settings API Reference

Update an automation's keywords, DM message, inline buttons, comment reply, post binding, or active status.
Pass `buttons: []` to clear all buttons. When `buttons` is non-empty, `dmMessage` (the new
one if you're changing it, otherwise the stored one) must be 640 characters or less.
On a TikTok, Threads, LinkedIn or YouTube automation (public reply only) the DM fields
are rejected with a 400 naming the field (`code` invalid_field_value, `param` the field),
and `commentReply` cannot be cleared.


## GET /v1/comment-automations/{automationId}

**Get automation details**

Returns an automation with its configuration, stats, and recent trigger logs.

### Parameters

- **automationId** (required) in path: No description

### Responses

#### 200: Automation details with stats and recent trigger logs

**Response Body:**

- **success** `boolean`: No description
- **automation** `object`: 
  - **id** `string`: No description
  - **name** `string`: No description
  - **platform** `string`: No description - one of: instagram, facebook, tiktok, threads, linkedin, youtube
  - **trigger** `string`: No description - one of: comment, live_comment, story_reply, story_mention
  - **accountId** `string`: No description
  - **platformPostId** `string`: No description
  - **postId** `string`: No description
  - **postTitle** `string`: No description
  - **keywords** `array[string]`: 
  - **matchMode** `string`: How a keyword is compared with the comment. 'contains' (default) matches anywhere, even inside another word (keyword 'app' fires on 'happy'). 'word' matches the keyword only as a standalone word. 'exact' requires the whole comment to be exactly the keyword. - one of: exact, contains, word
  - **excludeKeywords** `array[string]`: Comments containing one of these never trigger the automation, even when a trigger keyword also matches. Compared using the same matchMode.
  - **typoTolerance** `boolean`: Only with matchMode=word: also fire on close misspellings of a keyword (one edit for 4-7 character keywords, two from 8 up). Keywords shorter than 4 characters are never fuzzy-matched.
  - **dmMessage** `string`: Omitted on reply-only platforms (tiktok, threads, linkedin, youtube), together with every other DM-leg field.
  - **buttons** `array[DmButton]`: Inline DM buttons (up to 3). Omitted when none are set.
  - **template**: `CommentAutomationTemplate` - See schema definition
  - **commentReply** `string`: No description
  - **dmMessageVariations** `array[string]`: Alternate DM texts rotated at random with dmMessage. Omitted when none.
  - **commentReplyVariations** `array[string]`: Alternate public replies rotated at random with commentReply. Omitted when none.
  - **linkTracking** `boolean`: No description
  - **clickTag** `string`: No description
  - **dmDelaySeconds** `integer`: Seconds waited after the trigger before the DM is sent. Absent when the DM goes out immediately.
  - **commentReplyDelaySeconds** `integer`: Seconds waited before the public reply is posted. Absent when it follows the DM immediately.
  - **audience**: `CommentAutomationAudience` - See schema definition
  - **followGate**: `CommentAutomationFollowGate` - See schema definition
  - **alsoMatchInDms** `boolean`: Whether these keywords also fire on a plain inbound DM.
  - **repeatPolicy**: `CommentAutomationRepeatPolicy` - See schema definition
  - **dedupeSameTextHours** `integer`: Same-text dedupe window in hours. Omitted when off.
  - **publicReplyPolicy** `string`: No description - one of: after_dm, always
  - **actions**: `CommentAutomationActions` - See schema definition
  - **quickReplies** `array[CommentAutomationQuickReply]`: 
  - **dmMedia**: `CommentAutomationDmMedia` - See schema definition
  - **isActive** `boolean`: No description
  - **stats**: `CommentAutomationStats` - See schema definition
  - **createdAt** `string` (date-time): No description
  - **updatedAt** `string` (date-time): No description
- **logs** `array[CommentAutomationLog]`: The 20 most recent trigger logs.

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

## PATCH /v1/comment-automations/{automationId}

**Update automation settings**

Update an automation's keywords, DM message, inline buttons, comment reply, post binding, or active status.
Pass `buttons: []` to clear all buttons. When `buttons` is non-empty, `dmMessage` (the new
one if you're changing it, otherwise the stored one) must be 640 characters or less.
On a TikTok, Threads, LinkedIn or YouTube automation (public reply only) the DM fields
are rejected with a 400 naming the field (`code` invalid_field_value, `param` the field),
and `commentReply` cannot be cleared.


### Parameters

- **automationId** (required) in path: No description

### Request Body

- **name** `string`: No description
- **trigger** `string`: What fires the automation. Changing it detaches the automation from its bound post or story (a post id and a story id are different objects), unless this same request sets a new binding. Every trigger but 'comment' is Instagram only; 'story_mention' also requires no keywords and no binding. - one of: comment, live_comment, story_reply, story_mention
- **keywords** `array`: No description
- **matchMode** `string`: How a keyword is compared with the comment. 'contains' (default) matches anywhere, even inside another word (keyword 'app' fires on 'happy'). 'word' matches the keyword only as a standalone word. 'exact' requires the whole comment to be exactly the keyword. - one of: exact, contains, word
- **excludeKeywords** `array`: Comments containing one of these never trigger the automation, even when a trigger keyword also matches. Compared using the same matchMode.
- **typoTolerance** `boolean`: Only with matchMode=word: also fire on close misspellings of a keyword (one edit for 4-7 character keywords, two from 8 up). Keywords shorter than 4 characters are never fuzzy-matched.
- **platformPostId** `string,null`: Re-binds the automation to another post: the platform media/post ID (or story media id when trigger=story_reply). postId, platformPostId and postTitle move as a unit: sending any of them replaces all three, and an omitted one is cleared. Send all three as null (or empty) to make it account-wide (any post / any story). Omit all three to keep the current binding. 409 when another active automation already owns the new post.
- **postId** `string,null`: Zernio post ID (24 hexadecimal characters); platform IDs return 400. Use it INSTEAD of platformPostId to bind to a not-yet-published Zernio post: the automation stays pending and arms itself when that post publishes. Moves as a unit with platformPostId and postTitle (see platformPostId).
- **postTitle** `string,null`: Post content snippet for display. Moves as a unit with platformPostId and postId (see platformPostId).
- **dmMessage** `string`: No description
- **buttons** `array`: Inline DM buttons (1-3). Pass [] to clear all buttons.
- **template**: Platform-specific settings (see schema definitions below)
- **commentReply** `string`: No description
- **dmMessageVariations** `array`: Alternate DM texts for random rotation (see create). Pass [] to clear.
- **commentReplyVariations** `array`: Alternate public replies for random rotation. Pass [] to clear.
- **linkTracking** `boolean`: Wrap link buttons in a tracked redirect to count clicks. Pass false to send links untouched.
- **clickTag** `string`: Tag applied to a contact when they click a tracked link (requires linkTracking). Empty string clears it.
- **alsoMatchInDms** `boolean`: Also fire these keywords on a plain inbound DM. Enabling it requires the automation to end up with at least one keyword (this request's keywords if you send them, otherwise the stored ones) and is rejected on story_reply automations.
- **dmDelaySeconds** `integer`: Seconds to wait after the trigger before sending the DM. Send 0 to clear the delay and reply immediately.
- **commentReplyDelaySeconds** `integer`: Seconds to wait before posting the public comment reply. Send 0 to clear it. The reply never goes out before the DM.
- **audience**: No description
- **followGate**: No description
- **isActive** `boolean`: No description
- **repeatPolicy**: No description
- **dedupeSameTextHours** `integer,null`: Skip the DM when this recipient already received identical DM text (after personalisation) from this account, from any automation, within this many hours. The skip is logged with status skipped. Send null to clear.
- **publicReplyPolicy** `string`: 'after_dm' posts commentReply only after a successful DM. 'always' posts it whatever the audience rule, dedupe or DM outcome: the moment a comment matches, or after commentReplyDelaySeconds when set (raised to dmDelaySeconds, so it never precedes the DM attempt). - one of: after_dm, always
- **actions**: No description
- **quickReplies** `array,null`: Opt-in quick-reply chips on the DM (up to 13). Chips do not render in Message Requests, where a first DM to a cold commenter lands, so prefer buttons for first contact. Mutually exclusive with buttons and template (400). Send null to clear.
- **dmMedia**: Platform-specific settings (see schema definitions below)

### Responses

#### 200: Automation updated

**Response Body:**

- **success** `boolean`: No description
- **automation** `object`: 
  - **id** `string`: No description
  - **name** `string`: No description
  - **keywords** `array[string]`: 
  - **matchMode** `string`: How a keyword is compared with the comment. 'contains' (default) matches anywhere, even inside another word (keyword 'app' fires on 'happy'). 'word' matches the keyword only as a standalone word. 'exact' requires the whole comment to be exactly the keyword. - one of: exact, contains, word
  - **excludeKeywords** `array[string]`: Comments containing one of these never trigger the automation, even when a trigger keyword also matches. Compared using the same matchMode.
  - **typoTolerance** `boolean`: Only with matchMode=word: also fire on close misspellings of a keyword (one edit for 4-7 character keywords, two from 8 up). Keywords shorter than 4 characters are never fuzzy-matched.
  - **dmMessage** `string`: Omitted on reply-only platforms (tiktok, threads, linkedin, youtube), together with every other DM-leg field.
  - **buttons** `array[DmButton]`: Inline DM buttons (up to 3). Omitted when none are set.
  - **template**: `CommentAutomationTemplate` - See schema definition
  - **commentReply** `string`: No description
  - **dmMessageVariations** `array[string]`: Alternate DM texts rotated at random with dmMessage. Omitted when none.
  - **commentReplyVariations** `array[string]`: Alternate public replies rotated at random with commentReply. Omitted when none.
  - **audience**: `CommentAutomationAudience` - See schema definition
  - **followGate**: `CommentAutomationFollowGate` - See schema definition
  - **alsoMatchInDms** `boolean`: Whether these keywords also fire on a plain inbound DM.
  - **repeatPolicy**: `CommentAutomationRepeatPolicy` - See schema definition
  - **dedupeSameTextHours** `integer`: Same-text dedupe window in hours. Omitted when off.
  - **publicReplyPolicy** `string`: No description - one of: after_dm, always
  - **actions**: `CommentAutomationActions` - See schema definition
  - **quickReplies** `array[CommentAutomationQuickReply]`: 
  - **dmMedia**: `CommentAutomationDmMedia` - See schema definition
  - **isActive** `boolean`: No description
  - **stats**: `CommentAutomationStats` - See schema definition
  - **updatedAt** `string` (date-time): No description

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

#### 409: An active automation already exists for the post this request re-binds to

---

## DELETE /v1/comment-automations/{automationId}

**Delete automation**

Delete an automation. Its trigger logs are kept so tracked links already sent in DMs keep redirecting; they are removed with the account.

### Parameters

- **automationId** (required) in path: No description

### Responses

#### 200: Automation deleted

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

## DmButton

A single inline button rendered inside an auto-DM via Meta's button_template.
Up to 3 buttons per automation. `url` and `postback` work on Instagram and
Facebook; `phone` is Facebook-only. When buttons are set, `dmMessage` becomes
the button_template text and must be 640 characters or less.


### Properties

- **type** (required) `string`: No description - one of: url, postback, phone
- **title** (required) `string`: Button label (20 chars max) (max: 20)
- **url** `string`: Target URL (required when type is url)
- **payload** `string`: Postback payload delivered via the messaging_postbacks webhook (required when type is postback)
- **phone** `string`: Phone number, e.g. +14155551234 (required when type is phone; Facebook only)

## CommentAutomationTemplate

A Meta generic template (product card) sent as the automation's first DM.
It REPLACES the plain `dmMessage` bubble: a Meta message carries one body
shape, and a comment gets exactly one private reply, so the card and the
text cannot both be delivered. Put your selling copy in `subtitle`.
Mutually exclusive with `buttons` (sending both is a 400). Works on every
Instagram and Facebook trigger.
Up to 10 elements, rendered as a horizontally swipeable carousel.
Rendering confirmed on the Instagram and Messenger mobile apps.


### Properties

- **type** (required) `string`: No description - one of: generic
- **imageAspectRatio** `string`: Facebook only. How Messenger renders each element imageUrl: horizontal (1.91:1, the default) or square (1:1). Instagram has no such setting, so an Instagram automation carrying it is a 400. - one of: horizontal, square
- **elements** (required) `array`: No description

## CommentAutomationAudience

Who a comment automation answers. Instagram only - Meta exposes the follow
relationship on no other platform, and only for people who have MESSAGED the
account (a comment grants no consent). `whenUnknown` is therefore the important
setting: it decides what happens for a first-time commenter.


### Properties

- **followerStatus** `string`: No description - one of: any, follower, non_follower (default: any)
- **minFollowerCount** `integer`: Skip commenters with fewer followers than this. Omit for no size rule. (min: 0)
- **whenUnknown** `string`: What to do when Instagram will not reveal the follow relationship.
  * `send` (default) - deliver the DM anyway (fails open).
  * `skip` - stay silent.
  * `verify` - send `followGate.message` with a confirm button. Tapping it is a
    message, which grants consent, so the re-check on the tap resolves and the
    real DM (or `followGate.notFollowingMessage`) follows automatically.
 - one of: send, skip, verify (default: send)
- **tapToUnlock** `boolean`: Send `followGate.message` with its button to EVERY commenter and deliver the real
DM when they tap it, with no follow check at any point. Cannot be combined with a
`followerStatus` other than `any` or with `minFollowerCount` (400); `whenUnknown`
is ignored. Instagram only. A PATCH that sends `audience` without this field clears it.
 (default: false)

## CommentAutomationFollowGate

Copy for the follow gate. Sensible defaults are used for any field left empty.

### Properties

- **message** `string`: Confirmation DM sent when whenUnknown=verify or tapToUnlock=true. The default copy asks for a follow under whenUnknown=verify and only for the tap under tapToUnlock. (max: 640)
- **buttonLabel** `string`: Confirm button label. Defaults to "I'm following" (whenUnknown=verify) or "Unlock" (tapToUnlock). (max: 20)
- **notFollowingMessage** `string`: Sent to a commenter we know does not follow (followerStatus=follower), and after a confirm tap that does not unlock the DM. When following is what would unlock it, the message carries the confirm button so they can re-check once they follow; above 640 characters it goes out as plain text without the button. Omit to stay silent on a keyword comment; a confirm tap always gets an answer (a default message is used). (max: 1000)

## CommentAutomationRepeatPolicy

Whether a commenter can receive this automation's DM more than once.
  * `once` (default) - one DM per person per door, ever.
  * `every_comment` - every new matching comment is eligible again. One comment
    is still answered at most once. `cooldownHours` suppresses a repeat sent to the
    same person within that many hours.


### Properties

- **mode** (required) `string`: No description - one of: once, every_comment (default: once)
- **cooldownHours** `integer`: every_comment only (400 with once). Hours after a DM during which the same person is not DMed again. (min: 1) (max: 8760)

## CommentAutomationActions

Actions taken on the matched comment itself (comment trigger only; ignored on the
story-reply and DM doors). They never block or fail the DM: when one cannot run,
the log row says why (`likeSkipped`, `hideSkipped`).


### Properties

- **likeComment** `boolean`: Like the comment as the account. Facebook always; Instagram only for accounts connected through Facebook Login and allowlisted for likes while Meta reviews the permission. Otherwise the like is skipped and logged.
- **hideComment** `boolean`: Hide the comment once the first DM has been attempted, so the private reply is never sent to an already hidden comment.

## CommentAutomationQuickReply

### Properties

- **title** (required) `string`: No description (max: 20)
- **payload** (required) `string`: Delivered back via the messaging webhook when tapped.
- **imageUrl** `string`: No description

## CommentAutomationDmMedia

An image, video, audio clip or file sent right after the DM text as a second message
(a Meta message carries one body, so text and attachment are two sends). On the comment
trigger Meta may refuse the second message until the commenter replies; the DM then
still counts as sent and the log row carries `mediaError`.


### Properties

- **type** (required) `string`: No description - one of: image, video, audio, file
- **url** (required) `string`: Publicly reachable http(s) URL Meta downloads the media from.

## CommentAutomationStats

Running counters for the automation.

### Properties

- **triggered** `integer`: Matched triggers that reached the audience or send stage.
- **dmsSent** `integer`: No description
- **dmsFailed** `integer`: No description
- **uniqueContacts** `integer`: No description
- **trackedSends** `integer`: DMs sent with a trackable (wrapped) link. CTR denominator: divide clicks by this, not dmsSent. Lags dmsSent for campaigns that predate click tracking.
- **linkClicks** `integer`: Total clicks on tracked links (bots/prefetch excluded).
- **uniqueClicks** `integer`: Distinct people who clicked a tracked link.
- **delivered** `integer`: DMs confirmed delivered (Messenger; IG emits no delivery receipt).
- **read** `integer`: DMs confirmed read (IG messaging_seen / Messenger message_reads).
- **audienceSkipped** `integer`: Triggers the audience rule did not answer with the DM.
- **followGateSent** `integer`: No description
- **followGatePassed** `integer`: No description
- **followGateFailed** `integer`: No description

## CommentAutomationLog

### Properties

- **id** `string`: No description
- **commentId** `string`: No description
- **commenterId** `string`: No description
- **commenterName** `string,null`: No description
- **commenterUsername** `string,null`: No description
- **commentText** `string,null`: No description
- **source** `string,null`: Which door triggered this send. Null on rows written before this field existed (all of those are comment-triggered). - one of: comment, live_comment, story_reply, story_mention, dm, 
- **status** `string`: DM outcome. 'pending' = the automation has a dmDelaySeconds and the response is queued but not sent yet. 'gated' = the follow-gate confirmation DM went out and we are waiting for the tap; it flips to 'sent' or 'skipped' when they tap. 'skipped' also covers repeatPolicy, cooldown and dedupeSameTextHours suppressions, with the reason in error. - one of: pending, sent, failed, skipped, gated
- **audienceOutcome** `string,null`: How the audience rule resolved. Null on automations without one. - one of: passed, blocked, gate_sent, gate_passed, gate_failed, 
- **gateButtonStatus** `string,null`: Whether the follow-gate button reached the commenter: 'rejected' = Meta refused the gate DM, 'omitted' = the prompt went out as plain text because it was over 640 characters. Null when no gate DM was sent. - one of: delivered, rejected, omitted, 
- **commenterIsFollower** `boolean,null`: Follow relationship at decision time. Null when Instagram would not tell us (the commenter never messaged the account).
- **commenterFollowerCount** `integer,null`: No description
- **gateResolvedAt** `string,null`: When the follow-gate tap was claimed.
- **error** `string,null`: DM error message when status is failed, or the reason when it is skipped.
- **platformError** `object,null`: Platform error codes of the failed DM (Meta `code` and `error_subcode`), when the platform sent them. Null on successful rows and on rows written before this field existed.
- **privateReplyConsumed** `boolean,null`: True when the failed send spent the comment's single private reply (Instagram subcode 1545133 or 2534023, or Meta code 10900 on Instagram and Facebook), the same rule as `details.privateReplyConsumed` on the private-reply endpoint. Null on direct DMs and on rows written before this field existed.
- **commentReplyStatus** `string,null`: Outcome of the optional public reply on the triggering comment. With publicReplyPolicy after_dm, 'skipped' if no commentReply was configured or if the DM failed (the public reply is not attempted in that case). - one of: pending, sent, failed, skipped, 
- **commentReplyError** `string,null`: Public-reply error message if commentReplyStatus is failed
- **publicReplyPostedAt** `string,null`: When the public reply was posted. Null when it was not.
- **likeSkipped** `string,null`: Why actions.likeComment did not like the comment. Null when it did or was not configured.
- **hideSkipped** `string,null`: Why actions.hideComment did not hide the comment. Null when it did or was not configured.
- **mediaError** `string,null`: Why the dmMedia follow-up was not delivered. The DM itself still counts as sent.
- **nextDueAt** `string,null`: When the next queued send fires. Present only while something is still pending.
- **clickedAt** `string,null`: This recipient's first click on a tracked link (what uniqueClicks counts).
- **clickCount** `integer`: This recipient's total clicks on tracked links.
- **createdAt** `string`: No description

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