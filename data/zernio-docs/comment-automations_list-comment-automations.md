# List comment-to-DM automations API Reference

List all comment-to-DM automations for a profile. Returns automations with their stats.

## GET /v1/comment-automations

**List comment-to-DM automations**

List all comment-to-DM automations for a profile. Returns automations with their stats.

### Parameters

- **profileId** (optional) in query: Filter by profile. Omit to list across all profiles

### Responses

#### 200: Automations list

**Response Body:**

- **success** `boolean`: No description
- **automations** `array[object]`: 
  - **id** `string`: No description
  - **name** `string`: No description
  - **platform** `string`: No description - one of: instagram, facebook, tiktok, threads, linkedin, youtube
  - **trigger** `string`: No description - one of: comment, live_comment, story_reply, story_mention
  - **accountId** `string`: No description
  - **platformPostId** `string`: No description
  - **postTitle** `string`: No description
  - **postId** `string`: No description
  - **keywords** `array[string]`: 
  - **matchMode** `string`: How a keyword is compared with the comment. 'contains' (default) matches anywhere, even inside another word (keyword 'app' fires on 'happy'). 'word' matches the keyword only as a standalone word. 'exact' requires the whole comment to be exactly the keyword. - one of: exact, contains, word
  - **excludeKeywords** `array[string]`: Comments containing one of these never trigger the automation, even when a trigger keyword also matches. Compared using the same matchMode.
  - **typoTolerance** `boolean`: Only with matchMode=word: also fire on close misspellings of a keyword (one edit for 4-7 character keywords, two from 8 up). Keywords shorter than 4 characters are never fuzzy-matched.
  - **dmMessage** `string`: Instagram and Facebook only. On reply-only platforms (tiktok, threads, linkedin, youtube) every DM-leg field is omitted: dmMessage, dmMessageVariations, buttons, template, quickReplies, dmMedia, publicReplyPolicy, dedupeSameTextHours, actions, audience, followGate, dmDelaySeconds and alsoMatchInDms.
  - **buttons** `array[DmButton]`: Inline DM buttons (up to 3). Omitted when none are set.
  - **template**: `CommentAutomationTemplate` - See schema definition
  - **commentReply** `string`: No description
  - **dmMessageVariations** `array[string]`: Alternate DM texts rotated at random with dmMessage. Omitted when none.
  - **commentReplyVariations** `array[string]`: Alternate public replies rotated at random with commentReply. Omitted when none.
  - **linkTracking** `boolean`: Whether link buttons in the DM are wrapped in a tracked redirect to count clicks.
  - **clickTag** `string`: Tag applied to a contact when they click a tracked link.
  - **dmDelaySeconds** `integer`: Seconds waited after the trigger before the DM is sent. Absent when the DM goes out immediately.
  - **commentReplyDelaySeconds** `integer`: Seconds waited before the public reply is posted. Absent when it follows the DM immediately.
  - **alsoMatchInDms** `boolean`: Whether these keywords also fire on a plain inbound DM.
  - **repeatPolicy**: `CommentAutomationRepeatPolicy` - See schema definition
  - **dedupeSameTextHours** `integer`: Same-text dedupe window in hours. Omitted when off.
  - **publicReplyPolicy** `string`: No description - one of: after_dm, always
  - **actions**: `CommentAutomationActions` - See schema definition
  - **quickReplies** `array[CommentAutomationQuickReply]`: 
  - **dmMedia**: `CommentAutomationDmMedia` - See schema definition
  - **audience**: `CommentAutomationAudience` - See schema definition
  - **followGate**: `CommentAutomationFollowGate` - See schema definition
  - **isActive** `boolean`: No description
  - **stats**: `CommentAutomationStats` - See schema definition
  - **createdAt** `string` (date-time): No description

#### 400: Invalid request

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

## POST /v1/comment-automations

**Create comment-to-DM automation**

Create a keyword-triggered automation. On Instagram and Facebook, when someone
comments a matching keyword (or, with `trigger: story_reply`, replies to your
Instagram story with one), they automatically receive a DM.

Platforms:
  * `instagram`, `facebook`: the full DM automation (private reply, buttons,
    product card, audience rules, follow gate) plus the optional public reply.
  * `tiktok`, `threads`, `linkedin`, `youtube`: public reply only. These
    platforms have no private reply to a comment, so the automation answers a
    matching comment with `commentReply` and nothing else. `commentReply` is
    required and the DM fields (`dmMessage`, `dmMessageVariations`, `buttons`,
    `template`, `quickReplies`, `alsoMatchInDms`, `audience`, `followGate`,
    `dmDelaySeconds`, `commentReplyDelaySeconds`) are rejected with a 400 naming the
    field. TikTok comments arrive by webhook (TikTok business accounts only); the
    others are read by the comment poll, so a reply follows the comment by up to the
    poll interval (10 minutes on posts from the last 24 hours, longer on older posts).
    `repeatPolicy` applies there too: with the default `once`, a person gets one public
    reply per automation, and their later comments get none.
  * X accounts are refused with a 400 (`platform_not_supported`): X comment polling is
    off, so an X automation could never fire.

To continue into a specific workflow after the recipient taps a button, use
`{"type":"postback","title":"Send it","payload":"zernio:workflow:<workflowId>"}`.
The target must be active and belong to the same account and profile. This also
works for product-card buttons. The tap starts that workflow directly, without
matching its keyword or first-message condition. A tap on a workflow that is
waiting on `wait_for_reply` in that conversation answers that wait and resumes
the run. A tap on a different active workflow starts it and exits the other
live runs. Stale or invalid targets still do nothing. The initial
comment DM alone does not start the workflow: the recipient must tap.

Triggers (`trigger`):
  * `comment` (default): fires on keyword comments on a post or reel.
  * `story_reply`: fires when someone replies to your Instagram story with a keyword,
    and answers them with a DM. Set `platformPostId` to a story media id to scope to
    one story, or omit it to match replies to any story.
  * `live_comment` (Instagram only): fires on keyword comments made during one of
    your Instagram live broadcasts and answers them with a private reply. `comment`
    automations never fire on live comments, and `live_comment` ones never fire on
    post comments. Meta only accepts the private reply while the broadcast is live.
  * `story_mention` (Instagram only): fires when someone mentions your account in
    their story, and answers them with a DM. A mention carries no text and Meta does
    not identify the story, so `keywords` must be empty and `platformPostId` omitted.

Comments on Instagram and Facebook arrive by webhook. Every 10 minutes Zernio also
reads the latest comments and replies back (the bound post, or the 5 newest posts
for an account-wide automation, up to 20 Graph reads per account per run; a post not
fully read is picked up again on the next run) and runs any comment the webhook
did not deliver, so a dropped webhook still fires. A comment is answered at most
once whichever path sees it first.

Targeting (comment trigger):
  * Per-post: set `platformPostId` to scope to one specific post (only one active
    per-post automation is allowed per post).
  * Account-wide ("any post"): omit `platformPostId` (and `postId`). The automation
    evaluates every comment on every post on the account. You can stack unlimited
    account-wide automations, each with its own keyword set, and they all run
    independently. Per-post automations take priority on their post.

Audience (`audience`, Instagram only): restrict the automation to followers or
non-followers, and/or to accounts above a follower count. Instagram only reveals the
follow relationship for people who have messaged the account, so `audience.whenUnknown`
decides what happens for everyone else - including `verify`, which sends a one-tap
confirmation DM (`followGate`) and then delivers the real DM automatically. People we
already know follow you skip the tap entirely. Set `audience.tapToUnlock: true` instead
to send that button DM to every commenter and deliver the real DM on the tap with no
follow check.

Set `alsoMatchInDms: true` on a `comment` automation to also answer people who send
a keyword as a direct message instead of commenting it. One automation then covers
both doors, and each door is deduplicated separately (someone who already got the DM
from their comment still gets it if they later DM the keyword). Requires at least one
keyword.

Links in the DM's buttons can be click-tracked (`linkTracking`, on by default) and
clickers optionally tagged (`clickTag`) for segmentation. Stats returned include
delivered, read, and link clicks.

Personalisation: `{{first_name}}`, `{{name}}` and `{{username}}` in `dmMessage`,
`commentReply`, their variations and button titles resolve from the commenter.
`{{first_name}}` is the first word of the display name and `{{name}}` the display
name; when the platform gives no display name both fall back to the platform
username (unless it is all digits). `{{username}}` is the platform username. A value
still unknown resolves to an empty string and the space before it is dropped.

Behaviour: `repeatPolicy` decides whether a person can get the DM again,
`dedupeSameTextHours` stops two automations sending the same text to one person,
`publicReplyPolicy` decides whether the public reply waits for the DM, and `actions`
likes or hides the matched comment.


### Request Body

- **profileId** (required) `string`: No description
- **accountId** (required) `string`: Instagram, Facebook, TikTok, Threads, LinkedIn or YouTube account ID. On the last four the automation only posts the public reply. X accounts are refused (400, code platform_not_supported) while X comment polling is off.
- **trigger** `string`: What fires the automation. 'comment' (keyword comment on a post), 'live_comment' (keyword comment on an Instagram live broadcast), 'story_reply' (keyword reply to an Instagram story) or 'story_mention' (a story mentioning the Instagram account). For 'story_reply', platformPostId is the story media id (omit for any story). Every trigger but 'comment' is Instagram only; reply-only platforms accept 'comment' only. - one of: comment, live_comment, story_reply, story_mention
- **platformPostId** `string`: Platform media/post ID (or story media id when trigger=story_reply). Omit for an account-wide (any-post / any-story) automation.
- **postId** `string`: Zernio post ID (24 hexadecimal characters); platform IDs return 400. Optional and never required. Use it INSTEAD of platformPostId to bind a per-post automation to a not-yet-published Zernio post: the automation stays pending and arms itself when that post publishes. For a post already live on the platform, pass platformPostId alone and omit this.
- **postTitle** `string`: Post content snippet for display
- **name** (required) `string`: Automation label
- **keywords** `array`: Trigger keywords (empty = any comment triggers)
- **matchMode** `string`: How a keyword is compared with the comment. 'contains' (default) matches anywhere, even inside another word (keyword 'app' fires on 'happy'). 'word' matches the keyword only as a standalone word. 'exact' requires the whole comment to be exactly the keyword. - one of: exact, contains, word
- **excludeKeywords** `array`: Comments containing one of these never trigger the automation, even when a trigger keyword also matches. Compared using the same matchMode.
- **typoTolerance** `boolean`: Only with matchMode=word: also fire on close misspellings of a keyword (one edit for 4-7 character keywords, two from 8 up). Keywords shorter than 4 characters are never fuzzy-matched.
- **dmMessage** `string`: DM text sent to the commenter. Required on Instagram and Facebook (400 missing_required_field when absent). Rejected on TikTok, Threads, LinkedIn and YouTube, which have no private reply (400 invalid_field_value). Max 640 chars when buttons are set, otherwise ~1000.
- **buttons** `array`: Optional inline DM buttons (1-3). Phone buttons are Facebook-only. Omit or pass [] for a plain-text DM.
- **template**: Optional product card sent INSTEAD of the plain dmMessage bubble. Mutually exclusive with buttons. dmMessage stays required: it is what gets sent the moment the card is cleared.
- **commentReply** `string`: Public reply to the comment. Optional on Instagram and Facebook; required on TikTok, Threads, LinkedIn and YouTube, where it is the automation's only action.
- **dmMessageVariations** `array`: Optional alternate DM texts for random rotation. When set, each triggered comment sends one picked at random from [dmMessage, ...dmMessageVariations], so repeat commenters get slightly different DMs (helps avoid identical-message patterns). Up to 5. Buttons are attached to whichever text is picked, not varied.
- **commentReplyVariations** `array`: Optional alternate public replies, rotated at random alongside commentReply (picked independently of the DM). Up to 5.
- **linkTracking** `boolean`: Wrap link buttons in the DM in a tracked redirect so clicks are counted (Link Clicks / CTR). Pass false to send links exactly as written. Defaults to on.
- **clickTag** `string`: Optional tag applied to a contact when they click a tracked link (requires linkTracking). Lets you segment clickers for broadcasts/sequences.
- **dmDelaySeconds** `integer`: Seconds to wait after the trigger before sending the DM. Omit or send 0 to reply immediately (the default). Max 86400 (24h). The trigger is still matched and deduplicated the moment the comment arrives, so a delay only moves when the response is sent.
- **commentReplyDelaySeconds** `integer`: Seconds to wait before posting the public comment reply. Omit or send 0 to post it right after the DM (the default). The reply never goes out before the DM, so a value below dmDelaySeconds is raised to it. Ignored when trigger=story_reply, which has no public reply.
- **alsoMatchInDms** `boolean`: Also fire these keywords on a plain inbound DM, so the automation answers people who message the keyword instead of commenting it. Requires at least one keyword (an empty keyword list means 'match anything', which would answer every inbound message) and is rejected on story_reply automations, which already trigger on DMs. Dedup is per door: a contact who already received the DM from their comment can still receive it from a DM.
- **audience**: No description
- **followGate**: No description
- **repeatPolicy**: No description
- **dedupeSameTextHours** `integer,null`: Skip the DM when this recipient already received identical DM text (after personalisation) from this account, from any automation, within this many hours. The skip is logged with status skipped. 
- **publicReplyPolicy** `string`: 'after_dm' posts commentReply only after a successful DM. 'always' posts it whatever the audience rule, dedupe or DM outcome: the moment a comment matches, or after commentReplyDelaySeconds when set (raised to dmDelaySeconds, so it never precedes the DM attempt). - one of: after_dm, always
- **actions**: No description
- **quickReplies** `array`: Opt-in quick-reply chips on the DM (up to 13). Chips do not render in Message Requests, where a first DM to a cold commenter lands, so prefer buttons for first contact. Mutually exclusive with buttons and template (400). 
- **dmMedia**: Platform-specific settings (see schema definitions below)
- **isActive** `boolean`: Create the automation paused with false.

### Responses

#### 200: Automation created

**Response Body:**

- **success** `boolean`: No description
- **automation** `object`: 
  - **id** `string`: No description
  - **name** `string`: No description
  - **platform** `string`: No description - one of: instagram, facebook, tiktok, threads, linkedin, youtube
  - **trigger** `string`: No description - one of: comment, live_comment, story_reply, story_mention
  - **platformPostId** `string`: No description
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

#### 400: Validation error. Includes an account on an unsupported platform such as X (code platform_not_supported), a DM field (dmMessage, buttons, template, quickReplies, alsoMatchInDms, audience, followGate, a delay, dmMedia, dedupeSameTextHours, actions) sent for a TikTok, Threads, LinkedIn or YouTube account (code invalid_field_value, param names the field), a missing commentReply there or a missing dmMessage on Instagram and Facebook (code missing_required_field), and a live_comment, story_reply or story_mention trigger outside Instagram.

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

#### 409: Active per-post automation already exists for this platformPostId. Does not apply to account-wide automations.

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