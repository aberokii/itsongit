# Send message API Reference

Send a message in a conversation. Supports text, attachments, quick replies,
buttons, templates, and message tags. Attachment and interactive message
support varies by platform.

WhatsApp per-recipient rate limit: WhatsApp caps how many messages you may
send to the same recipient in a short window and rejects the excess with
error code `131056` ("Too many messages sent to this recipient"). Pace
sends to a single recipient at roughly 10 per minute; bursts above that
return a `400` with code `131056`. Sends to other recipients are
unaffected, so parallelise across recipients rather than flooding one.

iMessage pacing: messages to contacts who have not written to the
sender in the last 24 hours must be at least 2 minutes apart per
sender; a send inside that window returns `429` with code
`new_contact_limit` and the time to retry. Replies to contacts who
wrote within the last day are not paced. A thread opened with
`POST /v1/inbox/conversations` takes at most two follow-ups before
the contact replies, at least 24 hours apart (`429
new_contact_limit` sooner, `409 recipient_must_message_first` for a
fourth message). Each such follow-up counts as a new conversation:
no links, emails, phone numbers, prices or attachments (`400
invalid_content`), and it uses the sender's 15-minute spacing and
daily warm-up (`429 new_contact_limit`). Text must be shorter than
10,000 characters.

WhatsApp template messages: to send an approved template into this
conversation (required when the 24-hour customer-service window is
closed), use the `template` field with a single element carrying the
template reference: `{ "elements": [{ "name": ..., "language": ..., "components": [...] }] }`.
See the `template` field below for the exact shape. To send a template
to a phone number you have no conversation with yet, use the
create-conversation endpoint (POST /v1/inbox/conversations) instead.

Zernio resolves the exact APPROVED template name and language before any
WhatsApp template send. A failed lookup or missing exact definition sends
no message and returns code `platform_api_error`, type `platform_error`,
and platform `whatsapp`. Sanitized Meta code, message, and
`error_data.details` are returned in `platformError`; `details` identifies
`phase: template_lookup`, the query-free endpoint, upstream status, and
only safe provider usage or retry headers.

WhatsApp rich interactive messages (list, CTA URL, Flow, location request)
are available via the `interactive` field. Tap events are delivered through
the `message.received` webhook with WhatsApp-specific `metadata` fields
(`interactiveType`, `interactiveId`, `flowResponseJson`, `flowResponseData`).

**Idempotency:** send an `Idempotency-Key` header to make retries safe
(e.g. after a client-side timeout where delivery is unknown): same key +
same body replays the original response (with `Idempotent-Replayed: true`)
instead of sending the message a second time; same key + different body
returns 422; a key still in flight returns 409. Works for JSON and
multipart (file upload) requests alike. Keys are retained for 24 hours.

Only successful (2xx) responses are stored for replay: if the request
throws or returns a non-2xx status, the key is released so the same key
can be retried once the problem is fixed. The header therefore protects
the "request succeeded but the response was lost" case. For an ambiguous
failure (a 5xx or a network timeout), reconcile before retrying: a
failure after the platform already accepted the message also releases
the key, and a blind retry could send it twice. List the conversation's
messages first, and treat an empty result as inconclusive rather than
as proof nothing was sent, since a send that failed while being recorded
leaves no trace on our side.


## GET /v1/inbox/conversations/{conversationId}/messages

**List messages**

Fetch messages for a specific conversation, with cursor-based pagination
and ordering control.

Pagination: pass `pagination.nextCursor` from a prior response back as
the `cursor` query param to fetch the next page. The cursor is opaque;
do not parse or construct it client-side.

Sort order: defaults to `asc` (oldest first, chat style). For the
"show me the latest messages" pattern, pass `?sortOrder=desc&limit=N`.
X, Instagram, Telegram, WhatsApp and Reddit honor the requested
order from the local message store. For Facebook and Bluesky, the
upstream APIs only return newest-first and have no order parameter, so
sort order is best-effort and only reverses items within a single page
(pages still walk newest→oldest). The response field `sortOrderApplied`
tells you what was actually applied.

Reddit threads are paginated client-side because Reddit's API has no
per-thread cursor. Very long threads may be upstream-truncated by
Reddit's inbox/sent windows (~100 most-recent items each); this is a
Reddit platform limitation.

Instagram and Facebook conversations include history from before the
account was connected, replayed from Meta. That replay covers the 500
most recent messages per conversation: a longer thread keeps its newest
500 and older messages are not retrievable. Messages that arrived after
the account was connected are unaffected. Replayed messages are stored
as already read and emit no webhooks.

X limitation: X's encrypted "X Chat" messages are not accessible via the API. Conversations where the other participant uses encrypted X Chat may only show your outgoing messages. See the list conversations endpoint for more details.

This endpoint is read-only and does NOT mark messages as read or send
read receipts. To mark a conversation read (and send WhatsApp blue ticks
on eligible accounts), call `POST /v1/inbox/conversations/{conversationId}/read`.


### Parameters

- **conversationId** (required) in path: Opaque conversation identifier, accepted verbatim from the list endpoint or from the conversationId on inbox webhooks. Format not to be assumed.
- **accountId** (required) in query: Account ID
- **limit** (optional) in query: Number of messages to return per page. Default 100, max 100.
- **cursor** (optional) in query: Opaque pagination cursor. Pass `pagination.nextCursor` from a prior response verbatim: a cursor we cannot parse returns 400 rather than silently restarting from the first page.
- **sortOrder** (optional) in query: Order of returned messages. Default `asc` (oldest first, chat style).
X, Instagram, Telegram, WhatsApp and Reddit honor this order
across cursor pages. For Facebook and Bluesky, only intra-page
ordering is affected. Pages always walk newest→oldest. See
`sortOrderApplied` in the response.


### Responses

#### 200: Messages in conversation

**Response Body:**

- **status** `string`: No description
- **pagination** `object`: 
  - **hasMore** `boolean`: Whether more messages are available beyond this page.
  - **nextCursor** `string,null`: Opaque cursor to fetch the next page. `null` on the last page.
- **sortOrderApplied** `string`: Sort order actually applied to the returned page. May
differ from the requested `sortOrder` for Facebook and
Bluesky (always `desc` regardless of request).
 - one of: asc, desc
- **messages** `array[object]`: 
  - **id** `string`: The platform's own message id: the `wamid` on WhatsApp, the
`mid` on Instagram and Facebook Messenger. This is what
`metadata.quotedMessageId` points at, the value to pass as
`replyTo` on the platforms that support quote-replies, and the
`{messageId}` segment of the attachment-resolve URL. Webhooks
deliver the same value as `message.platformMessageId`; this
response has no field by that name.

  - **conversationId** `string`: No description
  - **accountId** `string`: No description
  - **platform** `string`: No description
  - **message** `string`: No description
  - **senderId** `string`: No description
  - **senderName** `string,null`: No description
  - **senderVerifiedType** `string,null`: X verified badge type. Only present for X messages. - one of: blue, government, business, none
  - **direction** `string`: No description - one of: incoming, outgoing
  - **createdAt** `string` (date-time): No description
  - **attachments** `array[object]`: 
    - **id** `string`: No description
    - **type** `string`: On Instagram and Facebook a shared reel, post or ad reaches Zernio with no type of its own (Meta's `unsupported_type`) and is resolved from the media's Content-Type at ingest into `image`, `video`, `audio` or `file` with `originalType: "unsupported_type"`. `unsupported_type` is returned only when the CDN could not be classified in time. - one of: image, video, audio, file, sticker, share, template, unsupported_type
    - **originalType** `string`: Instagram and Facebook only, and present only when it differs from `type`. Meta's own type before normalization: `ig_reel` and `reel` become `video`, while `ig_post`, `post`, `ig_story` and `story_mention` become `share`. A story mention is `type: "share"` with `originalType: "story_mention"`; render on this field, since `share` alone is ambiguous. `originalType: "unsupported_type"` marks a share Meta did not classify, resolved by content type: `refreshUrl` cannot re-mint it (Meta answers `is_unsupported` with no attachments for the message node), so download it when the `message.received` webhook arrives.
    - **mimeType** `string`: MIME type of the media when Zernio knows it. On Instagram and Facebook it is set for shares resolved by content type (`originalType: "unsupported_type"`).
    - **url** `string`: Direct media link. On Instagram and Facebook this is a signed Meta CDN url that EXPIRES: use it now, do not store it. Persist `refreshUrl` instead.
    - **refreshUrl** `string,null`: Instagram and Facebook only. Endpoint that resolves this attachment to a working url every time, re-minting it from Meta when the stored one has expired. Safe to store and render indefinitely, except for an attachment with `originalType: "unsupported_type"`: Meta cannot re-serve those, so the endpoint answers 404 once the url has expired.
    - **filename** `string,null`: No description
    - **previewUrl** `string,null`: No description
    - **payload** `object`: Template content (title, subtitle, image, buttons) when type is template
  - **subject** `string,null`: Reddit message subject
  - **storyReply** `object`: Instagram only. Present when the message replies to one of the account's stories. Also set on history imported after connecting, read off Meta's `story.reply_to`.
    - **storyId** `string`: The Instagram story ID the user replied to.
    - **storyUrl** `string`: Meta CDN URL for the story media. Expires roughly 24 hours after the story posted; fetch promptly or treat 404s as expected.
  - **isStoryMention** `boolean`: Instagram only. True when the message is the user mentioning the account in their own story. The story itself is the `share` attachment with `originalType: "story_mention"`. Also set on imported history, read off Meta's `story.mention`.
  - **noRenderableContent** `boolean`: Instagram and Facebook Messenger only. True when Meta withholds the content of this message from the API (its `is_unsupported` flag): `message` is empty, `attachments` is empty, and there is nothing to fetch, now or later. Distinguishes such a message from an ordinary empty one such as a story reply with no text. Absent on other platforms.
  - **isEdited** `boolean`: True if the sender has edited this message at least once.
  - **editedAt** `string,null` (date-time): When the most recent edit happened.
  - **editCount** `integer`: Total number of edits applied.
  - **editHistory** `array[InboxMessageEditHistoryEntry]`: Every prior version of the message, oldest first.
  - **isDeleted** `boolean`: True if the sender has deleted (unsent) this message. The original message and attachments fields remain populated.
  - **deletedAt** `string,null` (date-time): No description
  - **deliveryStatus** `string,null`: Lifecycle status for outgoing messages. Not all platforms emit every state (see webhook support matrix). - one of: sent, delivered, read, played, failed, deleted
  - **deliveredAt** `string,null` (date-time): No description
  - **readAt** `string,null` (date-time): No description
  - **sentAt** `string,null` (date-time): Original send time for outgoing messages (used for Messenger watermark queries).
  - **deliveryError** `object,null`: Populated when deliveryStatus === "failed".
  - **reactions** `array[object]`: Emoji reactions on this message (WhatsApp / Telegram). At most one per party in a 1:1 thread.
    - **emoji** `string`: No description
    - **fromMe** `boolean`: true if the connected account reacted, false if the contact did.
    - **reactedAt** `string` (date-time): No description
  - **metadata** `object`: Platform-specific extras. Free-form, but commonly includes:
`quotedMessageId` (the `id` of the message this one replies to,
delivered as `message.platformMessageId` on webhooks),
`waInteractive` (a compact descriptor of WhatsApp interactive
content sent: buttons / list / cta_url / flow / location_request),
`metaInteractive` (outgoing Instagram/Facebook buttons, quickReplies
and template, as sent), and for inbound interactive taps
`interactiveType` / `interactiveId`. It can also carry `source`
(`whatsapp_business_app` / `coexistence_history` on a WhatsApp
Coexistence number, `bulk-api` on a POST /v1/whatsapp/bulk send),
which is where the message reached us from rather than who produced
it: read `sentVia` for that.

  - **sentVia** `string,null`: Which Zernio surface produced this outgoing message: `human` (an
operator in the Zernio inbox), `api` (a call to this API),
`broadcast`, `sequence`, `workflow`, `comment_automation`, or
`bulk-api` (POST /v1/whatsapp/bulk). Same vocabulary as the `source`
filter on the inbox analytics endpoints.

Always present, and `null` whenever the lineage is unknown: every
incoming message, any outgoing message sent from the platform's own
app, and every message stored before this field shipped
(2026-08). Existing messages are NOT backfilled, so treat `null`
as "unknown", never as "sent by a human".
 - one of: human, api, broadcast, sequence, workflow, comment_automation, bulk-api, 
- **lastUpdated** `string` (date-time): No description

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

#### 403: Inbox addon required

#### 502: The platform returned a server error.

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

## POST /v1/inbox/conversations/{conversationId}/messages

**Send message**

Send a message in a conversation. Supports text, attachments, quick replies,
buttons, templates, and message tags. Attachment and interactive message
support varies by platform.

WhatsApp per-recipient rate limit: WhatsApp caps how many messages you may
send to the same recipient in a short window and rejects the excess with
error code `131056` ("Too many messages sent to this recipient"). Pace
sends to a single recipient at roughly 10 per minute; bursts above that
return a `400` with code `131056`. Sends to other recipients are
unaffected, so parallelise across recipients rather than flooding one.

iMessage pacing: messages to contacts who have not written to the
sender in the last 24 hours must be at least 2 minutes apart per
sender; a send inside that window returns `429` with code
`new_contact_limit` and the time to retry. Replies to contacts who
wrote within the last day are not paced. A thread opened with
`POST /v1/inbox/conversations` takes at most two follow-ups before
the contact replies, at least 24 hours apart (`429
new_contact_limit` sooner, `409 recipient_must_message_first` for a
fourth message). Each such follow-up counts as a new conversation:
no links, emails, phone numbers, prices or attachments (`400
invalid_content`), and it uses the sender's 15-minute spacing and
daily warm-up (`429 new_contact_limit`). Text must be shorter than
10,000 characters.

WhatsApp template messages: to send an approved template into this
conversation (required when the 24-hour customer-service window is
closed), use the `template` field with a single element carrying the
template reference: `{ "elements": [{ "name": ..., "language": ..., "components": [...] }] }`.
See the `template` field below for the exact shape. To send a template
to a phone number you have no conversation with yet, use the
create-conversation endpoint (POST /v1/inbox/conversations) instead.

Zernio resolves the exact APPROVED template name and language before any
WhatsApp template send. A failed lookup or missing exact definition sends
no message and returns code `platform_api_error`, type `platform_error`,
and platform `whatsapp`. Sanitized Meta code, message, and
`error_data.details` are returned in `platformError`; `details` identifies
`phase: template_lookup`, the query-free endpoint, upstream status, and
only safe provider usage or retry headers.

WhatsApp rich interactive messages (list, CTA URL, Flow, location request)
are available via the `interactive` field. Tap events are delivered through
the `message.received` webhook with WhatsApp-specific `metadata` fields
(`interactiveType`, `interactiveId`, `flowResponseJson`, `flowResponseData`).

**Idempotency:** send an `Idempotency-Key` header to make retries safe
(e.g. after a client-side timeout where delivery is unknown): same key +
same body replays the original response (with `Idempotent-Replayed: true`)
instead of sending the message a second time; same key + different body
returns 422; a key still in flight returns 409. Works for JSON and
multipart (file upload) requests alike. Keys are retained for 24 hours.

Only successful (2xx) responses are stored for replay: if the request
throws or returns a non-2xx status, the key is released so the same key
can be retried once the problem is fixed. The header therefore protects
the "request succeeded but the response was lost" case. For an ambiguous
failure (a 5xx or a network timeout), reconcile before retrying: a
failure after the platform already accepted the message also releases
the key, and a blind retry could send it twice. List the conversation's
messages first, and treat an empty result as inconclusive rather than
as proof nothing was sent, since a send that failed while being recorded
leaves no trace on our side.


### Parameters

- **conversationId** (required) in path: Opaque conversation identifier, accepted verbatim from the list endpoint or from the conversationId on inbox webhooks. Format not to be assumed.
- **undefined** (optional): No description

### Request Body

- **accountId** (required) `string`: Account ID
- **message** `string`: Message text
- **attachmentUrl** `string`: URL of the attachment to send (image, video, audio, or file). The URL must be publicly accessible. For binary file uploads, use multipart/form-data instead. On WhatsApp, combining an image, video, or file with `buttons` renders the media as the header of one interactive reply-button message; audio cannot be combined with buttons.
- **category** `string`: WhatsApp only (Meta Direct Send). Sends this message as a business-initiated UTILITY message without an approved template, for example outside the 24-hour customer service window; Meta matches or auto-creates a template asynchronously. The WhatsApp Business Account must be eligible for Direct Send, otherwise the send fails with an error telling you to use an approved message template instead. Supported only for text messages (link preview ok) and interactive messages (reply buttons, CTA URL buttons, voice-call button, header of text/image/video/document). Cannot be combined with template, attachments, location, or contacts. Utility messages only; marketing content is not allowed under this category. Accepted on the JSON body only, not on multipart requests. - one of: utility
- **linkPreview** `boolean`: WhatsApp and iMessage. Set false to send the message without a link-preview thumbnail (WhatsApp: the first URL; iMessage: every link renders as plain text). Defaults to true, which is how every WhatsApp text has been sent to date. Ignored on other platforms. Accepted on the JSON body only, not on multipart requests.
- **attachmentType** `string`: Type of attachment. Defaults to file if not specified. - one of: image, video, audio, file
- **attachmentName** `string`: WhatsApp only. Display name for a document sent via attachmentUrl with attachmentType: file (e.g. "Report.pdf"). Maps to the recipient's file name; without it WhatsApp derives the name from the URL and shows "Untitled". Ignored for image/video/audio and for binary uploads (which use the uploaded file's name).
- **voiceNote** `boolean`: WhatsApp only. When `true` on an audio attachment, the message is sent
as a voice message (PTT): the recipient sees the waveform + voice-note
UI instead of a basic audio attachment. The audio file MUST be `.ogg`
encoded with the OPUS codec (mono) per Meta's voice-message contract;
other formats are rejected by WhatsApp. Ignored for non-audio attachments.

- **subject** `string`: iMessage only (JSON body only). Bold title line rendered above the message text. Rejected with 400 on other platforms; ignored on voice-message sends.
- **effect** `string`: iMessage only (JSON body only). Apple screen/bubble animation played when the message arrives. Rejected with 400 on other platforms. - one of: slam, loud, gentle, invisibleInk, echo, spotlight, balloons, confetti, love, lasers, fireworks, shootingStar, celebration
- **contactCard** `boolean`: iMessage only (JSON body only). When `true`, attaches the sender's contact card (vCard) so the recipient can save the sender. Counts as message content on its own, so `message` becomes optional.
- **channel** `string`: iMessage only (JSON body only). Overrides the delivery channel for this one send; the provider otherwise picks it automatically. The sender must carry the matching add-on (SMS, RCS or WhatsApp), or the send fails. Not a default to set on every request. Rejected with 400 on other platforms. - one of: imessage, sms, rcs, whatsapp
- **quickReplies** `array`: Quick reply buttons. Mutually exclusive with buttons. Max 13 items.
- **buttons** `array`: Action buttons. Mutually exclusive with quickReplies. Max 3 items.

Instagram / Facebook: also mutually exclusive with `template`.
A Meta message carries one body shape, so sending both is a 400
rather than a silent drop of the buttons.
The buttons and `message` render as Meta's button_template (one
bubble with the text and the buttons below it), so `message` must
be 640 characters or less when buttons are attached (400 otherwise).

WhatsApp: buttons always render as interactive reply buttons.
Only `title` and `payload` are used; `type`, `url`, and `phone`
are ignored (WhatsApp has no URL/phone button in this field; use
the `interactive` field with `type: cta_url` for a link button).
`payload` becomes the button reply ID delivered on the
`message.received` webhook when the user taps. To send a simple
reply-button message, provide `title` + `payload` and set
`type: postback`, e.g.
`{ "type": "postback", "title": "Yes", "payload": "yes" }`.

Combine `buttons` with `attachmentUrl` and `attachmentType`
`image`, `video`, or `file` to render one WhatsApp message with
a media header, body text, and reply buttons. Audio is not a
supported interactive header and returns 400 when combined
with buttons.

- **template** `object`: Platform-dependent template payload. Ignored on Telegram.

Instagram / Facebook: a generic template (carousel). Set `type: generic`
and provide up to 10 `elements`, each with a `title` (required) and
optional `subtitle`, `imageUrl`, and `buttons`. Mutually exclusive with
the top-level `buttons` field (sending both is a 400); put the card's
buttons on its `elements` instead. On Facebook, `imageAspectRatio`
(`horizontal`, the default, or `square`) sets how Messenger renders the
element images; Instagram has no such setting and rejects it.

WhatsApp: sends an approved WhatsApp template message, the only message
type WhatsApp accepts when the 24-hour customer-service window is closed.
Provide exactly one element carrying the template reference:
`{ "elements": [{ "name": "order_update", "language": "en_US", "components": [...] }] }`
(`type` is ignored on WhatsApp). `components` is optional and is forwarded
unchanged as the `template.components` array of Meta's Cloud API send
payload; use it to fill body/header variables and button parameters, e.g.
`[{ "type": "body", "parameters": [{ "type": "text", "text": "John" }] }]`.
Templates with media headers (image, video, document) must include the
header component with its media link here at send time. To send a template
to a phone number with no existing conversation, or to have media headers
filled in automatically from the template definition, use the
create-conversation endpoint (POST /v1/inbox/conversations) instead.

- **interactive** `object`: WhatsApp-only. Rich interactive payload for list messages, CTA URL
buttons, Flow prompts, location requests, voice-call buttons, and
commerce messages (single product, product list, catalog, and
carousel). When set, takes priority over `buttons` and
`quickReplies`. The shape mirrors Meta's Cloud API `interactive`
object for the types in the enum below.

Use `buttons` / `quickReplies` for simple button replies
(WhatsApp's `interactive.type: "button"`): the abstraction caps at
3 buttons and handles the auto-conversion for you. Use this field
only for the types listed in the enum below.

All interactive messages are session messages: they can only be
sent inside the 24-hour customer service window opened by the
user's last inbound message.

Commerce types (`product`, `product_list`, `catalog_message`, and
product carousels) require a Meta catalog connected to the
WhatsApp Business Account in Commerce Manager. Media carousels
(image/video cards) do not need a catalog.

For `product`, `body` is optional (WhatsApp renders the product
card itself) and `header` is not allowed (the product image is
the header). For `product_list`, a `header` with `type: "text"`
is required. For `carousel`, top-level `header`/`footer` are not
supported; media goes on each card instead.

For `voice_call`, the message renders WhatsApp's native call
button; tapping it starts a voice call to your business number.
Requires WhatsApp Business Calling to be enabled on the sending
number. The optional `parameters.payload` string is echoed back on
the `calls` webhook (as `cta_payload`) for attribution.

For `location_request_message`, `action` may be omitted (we default
it to `{ "name": "send_location" }`). WhatsApp renders a localized
"Send location" button; the user's reply arrives as a regular
location message in the conversation.

For `request_contact_info`, `action` may be omitted (we default it
to `{ "name": "request_contact_info" }`). WhatsApp renders a
localized share button that cannot be relabelled, so put the reason
for asking in `body.text`: this is a consent prompt, and a bare
request converts badly. The reply arrives as an inbound `contacts`
message with `metadata.contactsOrigin` set to `contact_request`,
and we fold the shared number back into the contact automatically.
A `contacts` message with origin `other` is a card the user picked
from their address book and is NOT proof of their own number.

For `catalog_message`, `action` may also be omitted (we default it
to `{ "name": "catalog_message" }`).

For `address_message`, `parameters.country` is required (Meta
rejects the whole send without it); everything else in
`parameters` (`values`, `saved_addresses`, `validation_errors`)
is forwarded to Meta as-is. This is Meta's native structured
shipping-address capture, generally available in India as of
2026-08; check Meta's documentation for current country
availability before relying on it elsewhere. The submitted
address arrives as an `nfm_reply` on the `message.received`
webhook, same as a Flow submission, but with
`metadata.nfmReplyName` set to `address_message` so you can
tell the two apart.

Tap events come back via the `message.received` webhook with
`metadata.interactiveType` set to `list_reply` or `nfm_reply`.
Carts submitted from commerce messages arrive as `metadata.order`;
product inquiries arrive as `metadata.referredProduct`.

- **replyMarkup** `object`: Telegram-native keyboard markup. Ignored on other platforms.
- **messagingType** `string`: Facebook messaging type. Required when using messageTag. - one of: RESPONSE, UPDATE, MESSAGE_TAG
- **messageTag** `string`: Facebook message tag for messaging outside 24h window. Requires messagingType MESSAGE_TAG. Instagram only supports HUMAN_AGENT. - one of: CONFIRMED_EVENT_UPDATE, POST_PURCHASE_UPDATE, ACCOUNT_UPDATE, HUMAN_AGENT
- **replyTo** `string`: Platform message ID to quote-reply to. For WhatsApp, pass the wamid; for Telegram, the Telegram message ID (delivered as message.platformMessageId on webhooks, and as `id` on each entry of the list-messages endpoint). On Slack it threads the reply (thread_ts) instead of quoting. Instagram and Facebook Messenger do not support send-side quote replies: the message is sent without a quote and the successful response includes a warnings entry with code ignored_field and param replyTo. Other platforms without send-side reply support ignore this field.
- **location** `object`: WhatsApp and iMessage. Send a location pin (on iMessage it renders as a native map bubble).
- **contacts** `array`: WhatsApp-only. Send one or more contact cards.

### Responses

#### 200: Message sent

**Response Body:**

- **success** `boolean`: No description
- **warnings** `array[object]`: Present when a successful send ignored replyTo on Instagram or Facebook Messenger. The message was sent without a quote; do not retry it to apply the reply.
  - **code** (required) `string`: No description - one of: ignored_field
  - **param** (required) `string`: No description - one of: replyTo
  - **message** (required) `string`: Human-readable explanation of the ignored field.
- **data** `object`: 
  - **messageId** `string`: Platform id of the sent message (not returned for Reddit). For WhatsApp this is the raw Meta wamid, the same id delivered as message.platformMessageId on webhooks and delivery-status updates, and the value to pass as replyTo to quote-reply.
  - **conversationId** `string`: Zernio conversation id, echoed so the thread can be read back or replied to. It equals the id the list-conversations endpoint returns for Telegram, WhatsApp, SMS and Slack; for Facebook, Instagram, Bluesky and Reddit that endpoint returns the platform thread id instead, so do not correlate the two by equality. For X, when the request addressed the conversation by its Twitter dm_conversation_id, that platform id is echoed back instead. Omitted when the send succeeded but the conversation could not be resolved to a stored record.
  - **attachments** `array[object]`: Echo of the sent attachment with its resolved public URL, when one is available (Facebook, Instagram, Telegram, WhatsApp).
    - **type** `string`: No description
    - **url** `string`: No description
  - **messageIds** `array[string]`: Facebook/Instagram only. Present when an attachment and text were both requested: Meta has no single body shape for both, so the send is two Meta messages under the hood. First element === messageId (the attachment); second is the follow-up text.
  - **partialFailure** `object`: Facebook/Instagram only. The attachment was delivered but the follow-up text message was rejected by Meta and was not stored; the response is still a 200 because the attachment send succeeded.
    - **part** `string`: No description - one of: text
    - **error** `string`: No description
    - **platformError** `object`: Meta's own diagnostic fields for the rejected follow-up, same shape as the 400 response's platformError.
      - **code** `integer`: Meta error code
      - **subcode** `integer`: Meta error_subcode
      - **fbtraceId** `string`: Meta fbtrace_id, quote this in a Meta bug report
      - **type** `string`: Meta error type (e.g. OAuthException)

#### 400: Bad request (e.g., attachment not supported for platform, validation error, category combined with a template or attachment, category used on a non-WhatsApp account, or the WhatsApp Business Account is not eligible for Direct Send). Meta rejections (e.g. sending outside the messaging window) and TikTok business-account rejections arrive with code platform_api_error, type platform_error, and platform + platformError set.

**Response Body:**

- **error** `string`: No description
- **type** `string`: Present on Meta and TikTok pass-through rejections: platform_error when the platform rejected the send (see platform/platformError below), invalid_request_error for validation failures. - one of: platform_error, invalid_request_error
- **code** `string`: Stable machine-readable reason. PLATFORM_LIMITATION covers a capability the platform does not offer (e.g. Bluesky and Reddit DMs reject media); MISSING_PARTICIPANT means the stored conversation has no recipient to send to; DIRECT_SEND_NOT_ELIGIBLE and DIRECT_SEND_BLOCKED mean the WhatsApp Business Account needs Meta to grant or restore Direct Send access; DIRECT_SEND_LIMITED is temporary, Meta lifts it on its own; platform_api_error means the platform itself rejected the send (see platformError). - one of: PLATFORM_LIMITATION, MISSING_PARTICIPANT, INVALID_TEMPLATE_HEADER, DIRECT_SEND_NOT_ELIGIBLE, DIRECT_SEND_LIMITED, DIRECT_SEND_BLOCKED, platform_api_error
- **platform** `string`: Present alongside code platform_api_error. The platform that rejected the send (e.g. instagram, facebook, whatsapp, tiktok).
- **platformError** `object`: Instagram, Facebook, WhatsApp, or TikTok. The platform's diagnostic fields for the rejected send or template lookup. WhatsApp lookup errors retain only code, message, and error_data.details. On TikTok only code, message, and request_id are set. Absent when the failure did not come from the platform.
  - **code** `integer`: Meta or TikTok error code
  - **subcode** `integer`: Meta error_subcode
  - **fbtraceId** `string`: Meta fbtrace_id, quote this in a Meta bug report
  - **type** `string`: Meta error type (e.g. OAuthException)
  - **message** `string`: TikTok error message
  - **request_id** `string`: TikTok request_id, quote this in a TikTok support ticket

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

#### 403: Inbox addon required, or Meta rejected the send outside the messaging window (type platform_error, code platform_api_error, platform, platformError with code/subcode/fbtraceId/type)

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

#### 409: The same Idempotency-Key is still processing (retry after a short backoff), or, on Facebook and Instagram, another app owns the thread under Meta's handover protocol (code not_thread_owner, Meta subcode 2534037 in platformError, `details.ownerAppId` names the owner when Meta reports it). Take control with POST /v1/inbox/conversations/{conversationId}/thread-control (accounts connected through a Facebook Page only; an Instagram Login connection cannot take), then resend.

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

#### 422: Idempotency-Key reused with a different request, or the audio at attachmentUrl could not be downloaded (code attachment_fetch_failed, param attachmentUrl, the upstream HTTP status in the message): the URL is private, expired or gone. Nothing was sent.

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

#### 429: Rate limited. Either the connected account's upstream platform quota is exhausted (code rate_limited, see Retry-After; Reddit allows 1000 requests per 10 minutes per connected user; TikTok code 40100 also lands here with platform and platformError set), or Meta rejected the WhatsApp template-definition lookup (code platform_api_error). No message was sent.

**Response Body:**


#### 500: The platform rejected or failed the send. Zernio does NOT retry a send internally: a message send is not idempotent, and an opaque upstream failure (for example WhatsApp 131000) does not say whether the message was delivered. Retrying this request may deliver the message twice. Retry only if your use case tolerates a duplicate. Meta 5xx failures also arrive as a platform_error envelope (code platform_api_error, with platform and platformError set).

#### 502: The WhatsApp account has no Business Account ID, or the platform returned an upstream failure (a template with no approved variant in that language is a 400). No WhatsApp template message is sent when definition lookup fails.

**Response Body:**


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

#### default: Meta rejected the WhatsApp template-definition lookup with another upstream status. No message was sent.

**Response Body:**

- **error** (required) `string`: No description
- **type** (required) `string`: No description - one of: platform_error
- **code** (required) `string`: No description - one of: platform_api_error
- **platform** (required) `string`: No description - one of: whatsapp
- **platformError** `object`: Sanitized Meta lookup error fields, present when Meta returned them.
  - **code** `integer`: No description
  - **message** `string`: No description
  - **error_data** `object`: 
    - **details** `string`: No description
- **details** (required) `object`: 
  - **phase** (required) `string`: No description - one of: template_lookup
  - **endpoint** (required) `string`: Meta endpoint path without query parameters or access tokens
  - **upstreamStatus** `integer`: No description
  - **providerHeaders** `object`: Safe provider headers retained from the lookup response.
    - **retry-after** `string`: No description
    - **x-app-usage** `string`: No description
    - **x-business-use-case-usage** `string`: No description

---


# Related Schema Definitions

## InboxMessageEditHistoryEntry

One prior version of an edited message.

### Properties

- **text** (required) `string,null`: No description
- **attachments** (required) `array`: No description
- **editedAt** (required) `string`: No description

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

## WhatsAppTemplateLookupError

### Properties

- **error** (required) `string`: No description
- **type** (required) `string`: No description - one of: platform_error
- **code** (required) `string`: No description - one of: platform_api_error
- **platform** (required) `string`: No description - one of: whatsapp
- **platformError** `object`: Sanitized Meta lookup error fields, present when Meta returned them.
  - **code** `integer`: 
  - **message** `string`: 
  - **error_data** `object`: 
- **details** (required) `object`: 
  - **phase** `string`:  - one of: template_lookup
  - **endpoint** `string`: Meta endpoint path without query parameters or access tokens
  - **upstreamStatus** `integer`: 
  - **providerHeaders** `object`: Safe provider headers retained from the lookup response.