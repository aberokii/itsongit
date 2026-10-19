# Inbox webhooks

Receive an event for every DM, delivery receipt, reaction, comment and review that reaches the inbox, and know which platforms send which.

Inbox events cover everything that lands in or leaves the inbox: DMs and their delivery lifecycle, conversations, emoji reactions, comments on tracked posts, and reviews.

Subscribe with `POST /v1/webhooks/settings` and the event names below ([first event](/webhooks#first-event)).

Delivery, retries and signatures are the same for every event ([how webhooks behave](/webhooks#how-it-behaves)).

Message payloads carry an `account` block with `accountId` and `profileId`, so one endpoint can serve many profiles.

## Events

| Event | Description |
| --- | --- |
| [`message.received`](#messagereceived) | A new inbox message arrived. |
| [`message.sent`](#messagesent) | An outgoing message was sent from the inbox. |
| [`conversation.started`](#conversationstarted) | A new conversation began between an account and a contact, on any DM platform. Once per conversation. |
| [`conversation.control_changed`](#conversationcontrol_changed) | Meta's handover protocol moved a conversation: Meta Business Agent or a partner app on WhatsApp, another app such as Page Inbox on Facebook and Instagram. |
| [`message.edited`](#messageedited) | A sender edited a previously sent message. |
| [`message.deleted`](#messagedeleted) | A sender deleted (unsent) a message. |
| [`message.delivered`](#messagedelivered) | An outgoing message was delivered to the recipient. |
| [`message.read`](#messageread) | An outgoing message was read by the recipient. |
| [`message.failed`](#messagefailed) | An outgoing message failed to deliver (WhatsApp, SMS). |
| [`reaction.received`](#reactionreceived) | A participant added or removed an emoji reaction (Instagram, Facebook, WhatsApp, Telegram, Slack, TikTok). |
| [`referral.received`](#referralreceived) | Someone opened an existing Instagram or Messenger conversation through an ig.me or m.me `ref` link or a returning Messenger ad click. |
| [`comment.received`](#commentreceived) | A new comment arrived on a tracked post. |
| [`review.new`](#reviewnew) | A new review was posted on a connected account. |
| [`review.updated`](#reviewupdated) | A review was edited or a reply was added. |

## How it behaves

### Not every platform sends every event

Zernio forwards what each platform exposes:

| Event | Platforms |
| --- | --- |
| `message.edited` | Instagram, Facebook Messenger, Telegram, WhatsApp |
| `message.deleted` | Instagram (incoming unsend), WhatsApp (both directions) |
| `message.delivered` | WhatsApp, Facebook Messenger, SMS |
| `message.read` | WhatsApp, Facebook Messenger, Instagram |
| `message.failed` | WhatsApp, SMS |
| `conversation.control_changed` | WhatsApp, Facebook Messenger, Instagram |
| `reaction.received` | Instagram, Facebook, WhatsApp, Telegram, Slack, TikTok |
| `referral.received` | Instagram, Facebook Messenger |
| `review.new`, `review.updated` | Google Business Profile |

`conversation.started` covers every DM platform (Instagram, Messenger, Telegram, WhatsApp, X, Reddit, Bluesky) with one event.

### A legacy AppSumo plan gates the inbox

Every event on this page except `conversation.control_changed` needs inbox access.

Without it, `POST /v1/webhooks/settings` refuses the subscription itself with a `403` and code `feature_not_available`. It does not accept the subscription and then deliver nothing.

A legacy AppSumo plan keeps the inbox off until support enables it ([pricing](/pricing)).

### Pre-connect history fires nothing

<Callout type="warn">
  When an Instagram or Facebook account connects, Zernio replays the DM history it already holds on Meta into the inbox. That replayed history emits neither `conversation.started` nor `message.received`.
</Callout>

This is the opposite of the [post backfill](/webhooks/posts#postexternalcreated), where every pre-existing native post is reported.

Read replayed DMs from [List inbox conversations](/messages/list-inbox-conversations). They are stored as already read, so they never affect unread counts.

### Reactions arrive as their own event

Zernio sends `reaction.received` as its own event, never as `message.received`. Branch on it separately and a thumbs-up is never treated as an inbound DM.

- `reaction.action` is `added` or `removed`.
- `reaction.platformMessageId` is the platform-native id of the reacted-to message. It is always present.
- `reaction.messageId` is the Zernio message id when it can be resolved.

**Removals.** On WhatsApp, Instagram and Facebook removals the platform does not report which emoji went away. `reaction.emoji` is an empty string when `action` is `removed`. Match on `platformMessageId` to clear a reaction you mirror.

**TikTok.** TikTok sends no unicode for an AI emoji reaction, so `reaction.emoji` can be empty for those too.

### Another app can own the conversation (standby)

Meta's handover protocol lets one app answer a conversation while the others only observe.

Zernio still delivers every inbound message as `message.received`, flagged `metadata.standby: true`. It runs no automation on it: no workflow, no keyword automation.

- **WhatsApp**: on a number with Meta Business Agent enabled, the agent answers from Meta's side. Its replies arrive as `message.sent` with `source: "meta_business_agent"`.
- **Facebook and Instagram**: another app on the Page, such as Page Inbox, owns the thread. A send while you are not the owner answers `409` with code `not_thread_owner` (`details.ownerAppId` names the owner when Meta reports it).

On WhatsApp, sending any message takes control back. A bot that replies to every `message.received` must skip standby ones, or it takes the conversation away from the agent.

On Facebook and Instagram, take control first with [Change who answers a conversation](/messages/set-conversation-thread-control).

`conversation.control_changed` tells you when control moves.

### WhatsApp status events carry Meta's pricing

On WhatsApp, `message.sent`, `message.delivered`, `message.read` and `message.failed` carry two extra keys from Meta's status webhook:

- `pricing` (`billable`, `pricingModel`, `category`, `type`)
- `billingConversation` (`id`, `expiresAt`, `originType`)

Both keys are always present on WhatsApp. They are null when Meta left the object out, which it does on most statuses: Meta sends pricing on `sent` and on one of `delivered` or `read`.

`billingConversation` is Meta's billing window, not the Zernio `conversation` block. The keys are absent on other platforms.

For totals over a period, use `GET /v1/whatsapp/pricing-analytics` ([WhatsApp phone numbers](/platforms/whatsapp/phone-numbers#pricing-analytics)).

### `message.sent` names what sent it

`message.sent` carries `message.sentVia`, one of `human`, `api`, `broadcast`, `sequence`, `workflow`, `comment_automation` or `bulk-api`.

It also carries five attribution keys:

- `automationId`: the comment automation.
- `workflowId` and `executionId`: the workflow and its run.
- `broadcastId` and `sequenceId`.

They are always present. Each is `null` unless that kind of sender produced the message, and on `message.received` all of them are `null`.

`sentVia` is `null` for a message sent from the platform's own app and for messages stored before it shipped. Treat `null` as unknown, never as "sent by a human".

On Instagram and Facebook the attribution can be missing when Meta's echo of a send reaches Zernio before the send itself is recorded.

### Interactive replies ride on `message.received`

Zernio delivers button and list taps, flow responses, orders and referrals that arrive with a message under `metadata` on `message.received` (`interactiveType`, `interactiveId`, `flowResponseData`, `order`, `referral`).

Only a referral that arrives without a message becomes `referral.received`.

---

## `message.received`

A new inbox message arrived. `message.text`, `message.attachments[]` and `message.sender` describe it; `conversation.id` is the `conversationId` for [`POST /v1/inbox/conversations/{conversationId}/messages`](/messages/send-inbox-message).

<br />

**Payload for `message.received`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: message.received
- **message** (required) `object`: 
  - **id** (required) `string`: Internal message ID
  - **conversationId** (required) `string`: Internal conversation ID
  - **platform** (required) `string`: No description - one of: instagram, facebook, telegram, whatsapp, sms, rcs, twitter, bluesky, reddit, slack, tiktok, imessage
  - **platformMessageId** (required) `string`: Platform's message ID
  - **direction** (required) `string`: No description - one of: incoming, outgoing
  - **text** (required) `string,null`: Message text content
  - **attachments** (required) `array[object]`: 
    - **type** (required) `string`: Attachment type (image, video, file, sticker, audio, share).

Instagram and Facebook deliver a shared reel, post or ad with no
type of its own (Meta's `unsupported_type`). Zernio resolves it
from the media's Content-Type at ingest, so it arrives as `image`,
`video`, `audio` or `file` with `originalType: "unsupported_type"`.
`type: "unsupported_type"` itself is emitted only when the CDN
could not be classified in time; the `url` still works.

    - **originalType** `string`: Instagram and Facebook only, and present only when it differs
from `type`. Meta's own attachment type before Zernio normalized
it: `ig_reel` and `reel` become `video`, while `ig_post`, `post`,
`ig_story` and `story_mention` all become `share`.

Read it before rendering, because `type: "share"` alone is
ambiguous. In particular a story mention arrives as
`type: "share"` with `originalType: "story_mention"`; treating an
unrecognized type as a generic document shows your agent
"document received" for what is usually a lead.

`originalType: "unsupported_type"` marks a share Meta did not
classify, resolved by content type. **Download it on receipt**:
Meta answers `is_unsupported` with no attachments when the
message node is read back, so the attachment-resolve endpoint
cannot re-mint this url once it expires.

    - **mimeType** `string`: MIME type of the media when Zernio knows it. On Instagram and
Facebook it is set for shares resolved by content type
(`originalType: "unsupported_type"`).

    - **url** (required) `string`: Where to fetch the attachment. **The contract differs by platform.**

- **WhatsApp**: points at `GET /v1/whatsapp/media/{mediaId}`, an
  authenticated Zernio endpoint. You MUST send
  `Authorization: Bearer <your API key>`; fetching it without that
  header returns `401`. Download and store the bytes when this
  webhook arrives: Meta drops inbound media after a limited
  retention window, after which the endpoint answers `400`
  permanently and the media is unrecoverable.
- **Instagram / Facebook / Telegram**: a direct platform CDN link
  that needs no authentication and expires on the platform's own
  schedule.

**Webhook attachments carry no `refreshUrl`.** That field is
stamped only when you read a message back over REST
(`GET /v1/inbox/conversations/{conversationId}/messages`). On
Instagram and Facebook the url above is a signed Meta CDN link
that expires, so do not persist it: store the message id and
resolve the media through
`GET /v1/inbox/conversations/{conversationId}/messages/{messageId}/attachments/{index}?accountId={accountId}`,
which re-mints it on demand. Every value that URL needs is
already in this payload: `message.conversationId`,
`message.platformMessageId`, `account.accountId`, and the
attachment's zero-based position in this array.

    - **payload** `object`: Additional attachment metadata
      - **voice** `boolean`: WhatsApp audio only. True for a voice note recorded in the WhatsApp client, false for an audio file.
  - **sender** (required) `object`: 
    - **id** (required) `string`: Sender's platform identifier. For WhatsApp this is the phone
number (without leading `+`) when available, otherwise the
`businessScopedUserId`.

    - **contactId** `string`: Zernio CRM Contact id for this sender, when one exists (omitted for outgoing/business sender).
    - **name** `string`: No description
    - **username** `string`: No description
    - **picture** `string`: No description
    - **phoneNumber** `string,null`: WhatsApp only. Sender's phone number in E.164 format (with leading `+`).

**Nullable during the BSUID rollout (April 2026+).** WhatsApp
users who adopt a username can message businesses without
exposing a phone number, so this field is omitted for them.
Match by `businessScopedUserId` instead. See
`libs/whatsapp/docs/whatsapp-bsuid-migration.md`.

    - **businessScopedUserId** `string`: WhatsApp only. Business-scoped user ID (BSUID), Meta's canonical
identifier for a WhatsApp user within your business. Present
when Meta includes it in the inbound payload (rollout in
progress since early April 2026). **Recommended primary identity
anchor** going forward; fall back to `phoneNumber` only when
this field is absent.

    - **parentBusinessScopedUserId** `string`: WhatsApp only. Parent BSUID for businesses with linked business
portfolios. Omitted for standalone portfolios.

    - **whatsappUsername** `string`: WhatsApp only. User's WhatsApp username (e.g. `jane.shop`). Not a
stable identifier, because users can change it. Useful for display,
not recommended as an identity anchor.

    - **instagramProfile** `object`: Instagram profile data for the sender. Only present for Instagram conversations.
      - **isFollower** `boolean,null`: Whether the sender follows your Instagram business account
      - **isFollowing** `boolean,null`: Whether your Instagram business account follows the sender
      - **followerCount** `integer,null`: The sender's follower count on Instagram
      - **isVerified** `boolean,null`: Whether the sender is a verified Instagram user
  - **sentAt** (required) `string` (date-time): When the message was sent, as reported by the platform and passed through unmodified. Full ISO 8601 date-time: Instagram and Facebook carry millisecond precision, while some platforms (for example WhatsApp and Telegram) report whole seconds. Use this field as the chronological ordering key. If two messages share the same value, fetch the conversation messages with sortOrder=desc for the deterministic order.
  - **isRead** (required) `boolean`: No description
  - **sentVia** `string,null`: Which Zernio surface produced the message. Always present and
always `null` on this event, since nobody on our side produced an
inbound message; it is only informative on `message.sent`, which
documents the vocabulary.
 - one of: human, api, broadcast, sequence, workflow, comment_automation, bulk-api, 
  - **automationId** `string,null`: Always null on this event; see message.sent.
  - **workflowId** `string,null`: Always null on this event; see message.sent.
  - **executionId** `string,null`: Always null on this event; see message.sent.
  - **broadcastId** `string,null`: Always null on this event; see message.sent.
  - **sequenceId** `string,null`: Always null on this event; see message.sent.
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **metadata** `object,null`: Platform-specific message context (present when the message is a quick reply tap, postback button tap, inline keyboard callback, a quote-reply to an earlier message, an inbound another app is answering under Meta's handover protocol, or a TikTok DM that is not plain text)
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `message.sent`

An outgoing message was sent from the inbox, through the API or the dashboard.

<br />

**Payload for `message.sent`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: message.sent
- **message** (required) `object`: 
  - **id** (required) `string`: Internal message ID
  - **conversationId** (required) `string`: Internal conversation ID
  - **platform** (required) `string`: Every platform whose outgoing messages Zernio observes. sms is absent on purpose: its carrier receipts update delivery status and never raise message.sent. - one of: instagram, facebook, telegram, whatsapp, twitter, reddit, bluesky, slack, tiktok, imessage
  - **platformMessageId** (required) `string`: Platform's message ID
  - **direction** (required) `string`: No description - one of: incoming, outgoing
  - **text** (required) `string,null`: Message text content
  - **attachments** (required) `array[object]`: 
    - **type** (required) `string`: Attachment type (image, video, file, sticker, audio, share)
    - **originalType** `string`: Instagram and Facebook only, and present only when it differs from `type`. Meta's own attachment type before Zernio normalized it. See the same field on message.received for the full mapping.
    - **url** (required) `string`: Where to fetch the attachment. For outgoing messages this is the
media URL as sent, so for WhatsApp it is the URL you supplied when
publishing (WhatsApp sends media by link), not a Zernio endpoint,
and it needs no Zernio credentials. Contrast the inbound direction:
`message.received` attachment URLs on WhatsApp point at the
authenticated `GET /v1/whatsapp/media/{mediaId}`.

As on `message.received`, webhook attachments carry no
`refreshUrl`: that field is stamped only on the REST read. Resolve
Instagram and Facebook media through
`GET /v1/inbox/conversations/{conversationId}/messages/{messageId}/attachments/{index}?accountId={accountId}`.

    - **payload** `object`: Additional attachment metadata
  - **sender** (required) `object`: **On this event the sender is your own business, not the person you
are talking to.** `id` is the Zernio account id and `name`,
`username` and `picture` are that connected account's own profile.

Do not read these to name or update a contact: doing so on an echo
relabels the customer's record with your business name. The other
party is `conversation.participantId` / `participantName` /
`participantUsername`, which are populated in both directions.

    - **id** (required) `string`: The Zernio account id of the connected account that sent the message, not a contact id.
    - **contactId** `string`: Always omitted on this event: the sender is the business, not a contact. Use conversation.contactId to join back to the CRM Contact.
    - **name** `string`: Display name of your connected account.
    - **username** `string`: Username of your connected account.
    - **picture** `string`: Profile picture of your connected account.
  - **sentAt** (required) `string` (date-time): When the message was sent, as reported by the platform and passed through unmodified. Full ISO 8601 date-time: Instagram and Facebook carry millisecond precision, while some platforms (for example WhatsApp and Telegram) report whole seconds. Use this field as the chronological ordering key. If two messages share the same value, fetch the conversation messages with sortOrder=desc for the deterministic order.
  - **isRead** (required) `boolean`: No description
  - **source** `string`: WhatsApp send origin. whatsapp_business_app when sent from the WhatsApp Business phone app on a Coexistence number; cloud_api when sent through Zernio (dashboard, API, or broadcasts); meta_business_agent when Meta Business Agent answered on the number. Absent on non-WhatsApp platforms. Says where WhatsApp saw the send come from, not which Zernio surface produced it: read sentVia for that. - one of: whatsapp_business_app, cloud_api, meta_business_agent
  - **sentVia** `string,null`: Which Zernio surface produced this message: `human` (an operator
in the Zernio inbox), `api` (a call to this API), `broadcast`,
`sequence`, `workflow`, `comment_automation`, or `bulk-api`
(POST /v1/whatsapp/bulk). Same vocabulary as the `source` filter
on the inbox analytics endpoints, and the same value a later
GET on this message returns.

Always present, and `null` whenever the lineage is unknown: any
outgoing message not sent through Zernio (one typed in the
platform's own app, a Meta automated reply such as an instant
reply or away message, the echo of a click-to-message ad's
greeting), and every message stored before this field shipped
(2026-08). Existing messages
are NOT backfilled, so treat `null` as "unknown", never as
"sent by a human".
 - one of: human, api, broadcast, sequence, workflow, comment_automation, bulk-api, 
  - **automationId** `string,null`: The comment automation that sent this DM (sentVia comment_automation). Null otherwise.
  - **workflowId** `string,null`: The workflow whose run sent this message (sentVia workflow). Null otherwise.
  - **executionId** `string,null`: The workflow run (execution) that sent this message, as returned by the workflow executions endpoints. Null when workflowId is null.
  - **broadcastId** `string,null`: The broadcast that sent this message (sentVia broadcast). Null otherwise.
  - **sequenceId** `string,null`: The sequence whose step sent this message (sentVia sequence). Null otherwise.
- **pricing**: `WhatsAppMessagePricing` - See schema definition
- **billingConversation**: `WhatsAppBillingConversation` - See schema definition
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **metadata** `object`: Platform-specific context for the sent message: a quote-reply reference, a WhatsApp location pin, WhatsApp contact cards, the TikTok message type, or outgoing Instagram/Facebook buttons, quick replies and template. The key is present only when the send carried some context, and absent otherwise: it is never null and never an empty object. Read it to tell a location or contact-card message from a text one without a GET on the message.
  - **metaInteractive** `object`: Instagram/Facebook only. The buttons, quickReplies and/or template this outgoing message carried, as sent (tracked urls included when link tracking wrapped a button). Absent when the send carried none.
  - **location** `object`: WhatsApp only. The location pin this message carries, in the same
shape the inbox send API accepts. Present on API sends that passed
`location`, and on Coexistence echoes of a pin shared from the
WhatsApp Business app. The message `text` is only the emoji
preview (`📍 <name>`); the pin itself lives here.

    - **latitude** `number`: Latitude in decimal degrees.
    - **longitude** `number`: Longitude in decimal degrees.
    - **name** `string`: Location name, when one was given.
    - **address** `string`: Street address, when one was given.
  - **contacts** `array[object]`: WhatsApp only. The contact cards this message carries. On API
sends this is the `contacts` array exactly as given to the inbox
send API (`name`, `phones[].phone` / `type`, `emails[]`); on
Coexistence echoes of a card shared from the WhatsApp Business
app it is Meta's shape (`phones[].wa_id`, `vcard`). The message
`text` is only the emoji preview (`👤 <name>`); the cards live
here.

    Type: `object` with additional properties
  - **quotedMessageId** `string`: `platformMessageId` of the message this send is a quote-reply to.

Present when the reply was sent through Zernio with `replyTo` on
the inbox send API (WhatsApp and Telegram). A WhatsApp API send
fires its `message.sent` off the delivery status, and the quote
reference is forwarded from the stored send there, so it arrives
on the same `message.sent` as any other WhatsApp send.

Not delivered on Instagram echoes. Zernio forwards
`reply_to.mid` whenever Meta puts it on an echo, but on
Instagram Meta does not send it, so a reply the operator quoted
in the Instagram app arrives with no `quotedMessageId`.
Facebook Messenger rides a separate subscription
(`message_echoes`) and has not been measured, so treat it as
unverified rather than supported.

Absent on WhatsApp Coexistence echoes. Meta omits the quote
context from `smb_message_echoes`, so a reply the operator sent
from the WhatsApp Business app arrives with no `quotedMessageId`
even though WhatsApp shows it as a quote-reply. Do not read the
absence of this field as "not a reply".

  - **threadTs** `string`: Slack only. Parent thread ts of the sent message. Pass it back as
`replyTo` on the inbox send API to keep replying inside the thread.

  - **tiktokMessageType** `string`: TikTok only. The message type as TikTok reports it, forwarded verbatim (for example image, video, sticker, share_post, emoji, reaction, template). Present on every TikTok DM that is not plain text; those arrive with text empty and, for image, video, share_post, sticker and emoji, an attachment (share_post as type share with the embed url and payload.videoId; sticker/emoji as type sticker, url signed and expiring). Absent on image sends made through the Zernio API, which carry the image in attachments.
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `conversation.started`

A new conversation began between one of your connected accounts and a contact, in either direction, on any DM platform. A given conversation fires it once, the first time it appears. Pre-connect history never fires it ([why](#pre-connect-history-fires-nothing)).

<br />

**Payload for `conversation.started`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: conversation.started
- **conversation** (required): `InboxWebhookConversationDetail` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **startedAt** (required) `string` (date-time): When the conversation document was created.
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `conversation.control_changed`

Control of a conversation moved under Meta's handover protocol (`messaging_handovers`).

`control.owner` is who answers now:

- `ai_agent`: Meta Business Agent, WhatsApp.
- `app`: you.
- `other`: a WhatsApp partner app, or a Messenger or Instagram receiver such as Page Inbox.

`control.previousOwner` is who answered before. It is `null` when no handover had touched the thread.

`control.ownerAppId` is the Meta app id of the new owner when Meta names it (Page Inbox is `263902037430900`).

`control.metadata` is the note the transferring app attached, forwarded verbatim.

- **WhatsApp**: Meta Business Agent took the conversation over or handed it to you, or another partner app took it. While the owner is `ai_agent`, the agent's replies arrive on `message.sent` with `source: "meta_business_agent"`.
- **Facebook and Instagram**: another app on the Page passed the thread to you, or took or received it. While you are not the owner, sends answer `409` `not_thread_owner`.

**WhatsApp control.** Sending any message through the inbox takes control back. To hand it to the agent without sending, call [Change who answers a conversation](/messages/set-conversation-thread-control) with `action: "release"`.

**Facebook and Instagram control.** Call [Change who answers a conversation](/messages/set-conversation-thread-control) with `action: "take"`, or `"request"` to ask the owner to pass it.

A repeat report of the same owner fires nothing. A `request` changes nothing until the owner passes the thread.

While another app owns the conversation, inbound messages arrive on `message.received` with `metadata.standby: true`.

<br />

**Payload for `conversation.control_changed`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: conversation.control_changed
- **conversation** (required): `InboxWebhookConversationDetail` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **control** (required) `object`: 
  - **owner** (required) `string`: Who answers now. ai_agent: Meta Business Agent (WhatsApp); app: you; other: another app (a WhatsApp partner, or a Messenger / Instagram receiver such as Page Inbox). - one of: app, ai_agent, other
  - **previousOwner** (required) `string,null`: Owner before this change, null when no handover had touched the thread. - one of: app, ai_agent, other, 
  - **ownerAppId** `string`: Meta app id of the new owner, when Meta names it (Facebook and Instagram handovers, WhatsApp partner apps). Page Inbox is 263902037430900.
  - **metadata** `string`: Free-form string the transferring app attached to the handover, forwarded verbatim.
- **changedAt** (required) `string` (date-time): No description
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `message.edited`

The sender edited a previously sent message on Instagram, Facebook Messenger, Telegram or WhatsApp.

The payload carries the full `editHistory`, oldest prior version first. `message.text` is the latest version.

<br />

**Payload for `message.edited`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: message.edited
- **message** (required): `InboxWebhookMessage` - See schema definition
- **editHistory** (required) `array[InboxMessageEditHistoryEntry]`: Prior versions of the message, oldest first.
- **editCount** (required) `integer`: Total number of edits applied to this message.
- **editedAt** (required) `string` (date-time): When the most recent edit happened.
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `message.deleted`

The sender deleted (unsent) a message: on Instagram an incoming unsend, on WhatsApp in both directions. `message.direction` tells the business's deletions from the customer's.

The payload keeps the pre-delete `text` and `attachments` for moderation, compliance or archival. The Zernio dashboard does not show this content.

<br />

**Payload for `message.deleted`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: message.deleted
- **message** (required): `InboxWebhookMessage` - See schema definition
- **deletedAt** (required) `string` (date-time): No description
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `message.delivered`

An outgoing message was delivered to the recipient on WhatsApp, Facebook Messenger or SMS.

<br />

**Payload for `message.delivered`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: message.delivered, message.read, message.played, message.failed
- **message** (required): `InboxWebhookMessage` - See schema definition
- **statusAt** (required) `string` (date-time): When the platform reported this status.
- **error** `object,null`: Populated only on message.failed.
- **pricing**: `WhatsAppMessagePricing` - See schema definition
- **billingConversation**: `WhatsAppBillingConversation` - See schema definition
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `message.read`

An outgoing message was read by the recipient on WhatsApp, Facebook Messenger or Instagram.

<br />

**Payload for `message.read`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: message.delivered, message.read, message.played, message.failed
- **message** (required): `InboxWebhookMessage` - See schema definition
- **statusAt** (required) `string` (date-time): When the platform reported this status.
- **error** `object,null`: Populated only on message.failed.
- **pricing**: `WhatsAppMessagePricing` - See schema definition
- **billingConversation**: `WhatsAppBillingConversation` - See schema definition
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `message.failed`

An outgoing message failed to deliver on WhatsApp or SMS.

`error` carries `code`, `title` and `message` from the platform, for example `131026` for a WhatsApp recipient that is not reachable. On SMS it carries the carrier's error code.

<br />

**Payload for `message.failed`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: message.delivered, message.read, message.played, message.failed
- **message** (required): `InboxWebhookMessage` - See schema definition
- **statusAt** (required) `string` (date-time): When the platform reported this status.
- **error** `object,null`: Populated only on message.failed.
- **pricing**: `WhatsAppMessagePricing` - See schema definition
- **billingConversation**: `WhatsAppBillingConversation` - See schema definition
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `reaction.received`

A participant added or removed an emoji reaction on a message, on Instagram, Facebook, WhatsApp, Telegram, Slack or TikTok.

**TikTok.** A like or emoji reaction on a DM arrives only as this event, never as an empty `message.received`. `reaction.platformMessageId` is set to the TikTok id of the liked message.

**Telegram.** The bot must be an administrator in the chat. Reactions in private chats are never delivered to bots.

<Callout type="warn">
Instagram and Facebook accounts connected before August 2026 do not receive this event until their webhook subscription is refreshed. Reconnect an account that sends reactions but never receives them.
</Callout>

Meta only applies the reactions field when an account is connected and does not backfill it. Sending a reaction is unaffected.

For a Facebook Page, [Re-subscribe a Page to webhooks](/connect/resync-page-webhook-subscription) re-sends the full field set without a reconnect.

<br />

**Payload for `reaction.received`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: reaction.received
- **reaction** (required) `object`: 
  - **emoji** (required) `string`: The emoji reacted with. May be an empty string when `action` is
`removed` on WhatsApp (Meta does not report which emoji was removed),
and on TikTok for an AI emoji reaction (TikTok sends no unicode for it).

  - **action** (required) `string`: No description - one of: added, removed
  - **messageId** `string`: Internal Zernio message ID of the reacted-to message, when resolvable from the platform ID.
  - **platformMessageId** (required) `string`: Platform-native ID of the reacted-to message (e.g. WhatsApp wamid).
  - **sender** (required) `object`: Whoever added or removed the reaction. Usually the participant, but on WhatsApp, Slack, Instagram, Facebook Messenger and TikTok it is the business own platform id when the business reacted from the native app or via the reactions API: compare it with conversation.participantId.
    - **id** (required) `string`: No description
    - **contactId** `string`: Zernio CRM Contact id for this sender, when one exists.
    - **name** `string`: No description
    - **username** `string`: No description
    - **picture** `string`: No description
    - **phoneNumber** `string,null`: WhatsApp only. Sender's phone number in E.164 format (with leading `+`), when available.
  - **reactedAt** (required) `string` (date-time): No description
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `referral.received`

Someone opened an existing Instagram or Facebook Messenger conversation through an ig.me or m.me `ref` link or a returning Messenger ad click.

The payload forwards Meta's referral object verbatim: `ref` and `source` for links, `ad_id` and `ads_context_data` for ad clicks.

A referral that rides an inbound message arrives on `message.received` under `metadata.referral` instead.

<br />

**Payload for `referral.received`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: referral.received
- **referral** (required) `object`: Meta's referral object, forwarded verbatim. Same shape as
`metadata.referral` on `message.received`: `ref` + `source` for
ig.me / m.me links, `ad_id` + `ads_context_data` for returning
Messenger ad clicks.

  - **ref** `string`: The `ref` parameter of the clicked ig.me / m.me link or ad.
  - **source** `string`: Meta-supplied source (`SHORTLINK`, `SHORTLINKS`, `IGME-SOURCE-LINK`, `ADS` - treat as opaque).
  - **type** `string`: Meta-supplied referral type (e.g. `OPEN_THREAD`).
  - **referer_uri** `string`: URI of the originating site, when Meta supplies one. Facebook Messenger only.
  - **ad_id** `string`: The Meta ad ID, on returning ad clicks. Facebook Messenger only.
  - **ads_context_data** `object`: Snapshot of the ad's public context at click time.
    - **ad_title** `string`: No description
    - **photo_url** `string`: No description
    - **video_url** `string`: No description
    - **post_id** `string`: No description
    - **product_id** `string`: No description
    - **flow_id** `string`: No description
- **sender** (required) `object`: Who clicked - the conversation participant.
  - **id** (required) `string`: Platform-scoped user ID (IGSID / PSID).
  - **contactId** `string`: Zernio CRM Contact id for this sender, when one exists.
- **conversation** (required): `InboxWebhookConversation` - See schema definition
- **account** (required): `InboxWebhookAccount` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `comment.received`

A new comment arrived on a tracked post. On Instagram, `comment.isLive: true` marks a comment made during a live broadcast; the key is absent on every other comment.

`comment.ad` is present when the comment was made on paid content:

- **Instagram:** it carries `ad.id` and `ad.title` from the Meta webhook.
- **Facebook:** it carries `ad.promotionStatus`, `"active"` for boosted organic posts and `"ineligible"` for dark post creatives.

It is absent for comments on organic posts that are not currently promoted, so `if (comment.ad)` filters ad-driven comments.

Instagram comments may carry `comment.author.instagramProfile` (`isFollower`, `isFollowing`, `followerCount`, `isVerified`).

Meta reveals the follow relationship only for people who have messaged the account, and commenting does not grant that consent. The object is absent for most first-time commenters.

An absent object means unknown, never "not a follower".

To resolve it on demand, call [Instagram follow status](/accounts/get-instagram-follow-status). To gate an auto-DM on it, use a comment automation's [audience rules](/platforms/instagram/inbox#comment-to-dm-automations).

<br />

**Payload for `comment.received`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: comment.received
- **comment** (required) `object`: 
  - **id** (required) `string`: Platform comment ID
  - **postId** (required) `string,null`: Internal post ID (null for posts not published through Zernio)
  - **platformPostId** (required) `string`: Platform's post ID
  - **platform** (required) `string`: No description - one of: instagram, facebook, threads, youtube, linkedin, bluesky, reddit, tiktok
  - **text** (required) `string`: Comment text content
  - **author** (required) `object`: 
    - **id** (required) `string`: Author's platform ID
    - **username** `string`: No description
    - **name** `string`: No description
    - **picture** `string,null`: No description
    - **isOwnAccount** `boolean`: True when this comment was authored by the connected account itself. Populated on the Instagram and Facebook realtime webhooks (Meta re-delivers the account's own replies as comments events) and on TikTok, where it is inferred: comments created through this API are always flagged, and once the account's own author identifier is known (from one of those or from a comments listing) every author is compared against it. Absent means not evaluated, never "not the account".
    - **instagramProfile** `object`: Instagram only, best-effort. Present ONLY for commenters who have
messaged the account before: Meta gates the follow relationship behind
messaging consent, and commenting does not grant it. Absent otherwise -
treat a missing object as "unknown", never as "not a follower". To check
on demand, call GET /v1/accounts/{accountId}/follow-status/{userId}.

      - **isFollower** `boolean,null`: The commenter follows this account.
      - **isFollowing** `boolean,null`: This account follows the commenter.
      - **followerCount** `integer,null`: No description
      - **isVerified** `boolean,null`: No description
  - **createdAt** (required) `string` (date-time): No description
  - **isReply** (required) `boolean`: Whether this is a reply to another comment
  - **parentCommentId** (required) `string,null`: Parent comment ID if this is a reply
  - **isLive** `boolean`: Instagram only: true when the comment was made on a live broadcast (the live_comments webhook field). Absent on every other comment.
  - **ad** `object`: Ad context. Present only when the comment was made on paid content.
Instagram: populated from the webhook payload's value.media.ad_id, value.media.ad_title and value.media.original_media_id, each only when Meta includes it.
Facebook: populated from a Graph API lookup of the parent post. Present when the post is an
ad dark post (isDarkPost true, whatever its promotionStatus) or an organic post that is or was
boosted (promotionStatus "active", "extendable" or "finished"). Meta does not link a dark post
back to its ad, so on Facebook id is set only when exactly one ad on the Page, created before the
dark post, carries the same copy as the post. title is never set on Facebook.
Absent for comments on organic posts that are not promoted.

    - **id** `string`: Meta ad ID. Instagram: from the webhook. Facebook: only on a dark post matched to a single ad by its copy.
    - **title** `string`: Ad creative title (Instagram only).
    - **originalMediaId** `string`: Original media ID that Meta reports for the ad (Instagram only).
    - **promotionStatus** `string`: Facebook only. The parent post's promotion_status as the Graph API returns it, for example
"active" (organic post currently boosted). Ad dark posts usually report "inactive" and
sometimes "ineligible", so use isDarkPost, not this value, to tell an ad comment apart.

    - **isDarkPost** `boolean`: Facebook only: true when the post is an unpublished ad creative (dark post), false for a boosted organic post.
  - **attachment** `object`: Facebook only. Present on graphic-only comments (sticker, GIF, photo) that
carry no text. URLs are ephemeral and may expire for Meta platforms (oe= expiry),
so fetch promptly. Instagram comments do not support attachments.

    - **type** (required) `string`: Attachment type: sticker, animated_image_share, or photo.
    - **imageUrl** `string`: Rendered image/preview URL (from attachment.media.image.src).
    - **url** `string`: Source URL (from attachment.url). For GIFs this is an l.facebook.com redirect.
- **post** (required) `object`: 
  - **id** (required) `string,null`: Internal post ID (null for posts not published through Zernio)
  - **platformPostId** (required) `string`: Platform's post ID
  - **content** (required) `string,null`: Post text, from our synced copy. No platform call is made on the comment path, so null when the post was never synced.
  - **imageUrl** (required) `string,null`: Post thumbnail or first media item URL. Platform CDN URLs expire, fetch promptly.
  - **permalink** (required) `string,null`: Public URL of the post. Null when no URL was ever stored for it, for example a platform draft or a post recovered without one.
- **account** (required) `object`: 
  - **id** (required) `string`: Account ID
  - **accountId** `string`: Account ID (same as id); canonical field for account filtering.
  - **platform** (required) `string`: No description
  - **username** (required) `string`: No description
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `review.new`

A new review was posted on a connected Google Business Profile account, in real time through Pub/Sub.

<br />

**Payload for `review.new`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: review.new
- **review** (required): `ReviewWebhookReview` - See schema definition
- **account** (required) `object`: 
  - **id** (required) `string`: No description
  - **accountId** `string`: Account ID (same as id); canonical field for account filtering.
  - **platform** (required) `string`: No description
  - **username** (required) `string`: No description
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

---

## `review.updated`

A review changed: the reviewer edited their text or rating, or a reply was added through the API or the Google Business Profile dashboard.

The payload has the same shape as `review.new`. When a reply is present, `review.hasReply` is `true` and `review.reply` is populated.

<br />

**Payload for `review.updated`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **profiles**: `WebhookProfiles` - See schema definition
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: review.updated
- **review** (required): `ReviewWebhookReview` - See schema definition
- **account** (required) `object`: 
  - **id** (required) `string`: No description
  - **accountId** `string`: Account ID (same as id); canonical field for account filtering.
  - **platform** (required) `string`: No description
  - **username** (required) `string`: No description
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

## Related

- [Webhooks](/webhooks): create an endpoint, retries, signatures.
- [Send a message](/messages/send-inbox-message): reply to `message.received` with `accountId` and `message`.
- [List inbox conversations](/messages/list-inbox-conversations): the same conversations on demand.
- [Comment automations](/comment-automations/list-comment-automations): DM people who comment a keyword.
- [Automation webhooks](/webhooks/automations): contact, sequence and workflow run events.
- [Chat SDK](/resources/integrations/chat-sdk): a bot framework that consumes these events.