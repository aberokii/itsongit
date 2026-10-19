# Inbox

Instagram direct messages, ice breakers, the persistent menu, comments and inbox webhooks.

Instagram supports DMs and comments. New comments, replies, hiding and deleting all work.

Liking a comment is a limited release described under [Comments](#comments).

## Direct messages

| Feature | Supported |
|---------|-----------|
| List conversations | <Yes /> |
| Fetch messages | <Yes /> |
| Send text messages | <Yes /> |
| Send attachments | <Yes /> (images, videos, audio via URL) |
| Quick replies | <Yes /> (up to 13, Meta quick_replies) |
| Buttons | <Yes /> (up to 3; with `message`, sent as Meta's button template, text up to 640 characters) |
| Carousels | <Yes /> (generic template, up to 10 elements) |
| React to a message | <Yes /> (any emoji) via [Add message reaction](/messages/add-message-reaction) and [Remove message reaction](/messages/remove-message-reaction) |
| Message tags | <Yes /> (`HUMAN_AGENT` only) |
| Archive and unarchive | <Yes /> |
| Message requests | <Yes /> (list and accept) |
| Handover (thread control) | <Yes /> |

**Reactions** a customer adds or removes arrive on the [`reaction.received`](/webhooks/inbox#reactionreceived) webhook.

Accounts connected before August 2026 need their Meta webhook registration refreshed first. Sending is unaffected.

**Outside the 24-hour window**, send `messageTag: "HUMAN_AGENT"` with `messagingType: "MESSAGE_TAG"`.

**Buttons.** `buttons` with `message` go out as one button-template bubble: the text and up to 3 buttons under it.

The text must be 640 characters or less when buttons are attached. A longer `message` answers `400` `Text must be 640 characters or less when buttons are attached`.

Attachments:

| Type | Formats | Max size |
|------|---------|----------|
| Image | PNG, JPEG | 8 MB |
| Video | MP4, OGG, AVI, MOV, WEBM | 25 MB |
| Audio | AAC, M4A, WAV, MP4 | 25 MB |
| File | PDF | 25 MB |

Instagram rejects every other container, including MP3 and OGG/Opus audio.

Attachment URLs must be public HTTPS with no authentication or redirects. They must return a `Content-Type` matching the file, for example `audio/mp4` for M4A.

### Message requests

DMs from people the account has not accepted wait in Meta's Message Requests folder.

`GET /v1/inbox/conversations?folder=requests` lists them live from Meta (first page only), each item with `folder: "requests"`.

Meta has no accept call: replying moves a thread into the inbox. That is what [Accept a message request](/messages/accept-conversation-request) does with your `accountId` and `message`.

When Meta will not list the folder for the one account asked, the list answers `400` `PLATFORM_LIMITATION`.

### Handover with another app

Meta's handover protocol lets another app, such as Page Inbox, own a thread. While it does:

- Inbound messages arrive on `message.received` with `metadata.standby: true`.
- No Zernio automation answers them.
- A send answers `409` with code `not_thread_owner`.

[Change who answers a conversation](/messages/set-conversation-thread-control) moves the thread: `pass` with `targetAppId` (Page Inbox is `263902037430900`), `take`, `request` or `release`.

[`conversation.control_changed`](/webhooks/inbox#conversationcontrol_changed) fires when Meta reports a change, with `control.ownerAppId` naming the new owner.

### Instagram profile data

Participants and webhook senders can carry an `instagramProfile` object: `isFollower`, `isFollowing`, `followerCount`, `isVerified` and, on conversations only, `fetchedAt`.

It appears in:

- `GET /v1/inbox/conversations` and `GET /v1/inbox/conversations/{id}`
- `message.sender` in `message.received`
- `comment.author` in `comment.received`, when the commenter has messaged you before
- `GET /v1/accounts/{accountId}/follow-status/{userId}`, on demand for any Instagram-scoped user id

<Callout type="warn">
Treat a missing follower value as unknown, never as "not a follower". To follower-gate a comment automation, use its [audience rules](#comment-to-dm-automations) instead.
</Callout>

Meta reveals the follow relationship only for people who have messaged you, and commenting does not grant that consent. For someone who has never sent your account a DM:

- `follow-status` returns `200` with `isFollower: null` and `unavailableReason: "consent_required"`.
- `comment.received` omits `instagramProfile`.

## Ice breakers

Ice breakers are the prompts shown when someone starts a new DM conversation: up to 4, each question at most 80 characters.

Manage them with `GET`, `PUT` and `DELETE /v1/accounts/{accountId}/instagram-ice-breakers` ([Account settings](/account-settings/get-instagram-ice-breakers)).

## Persistent menu

The persistent menu shown in the conversation takes at most 3 top-level items and 5 nested items.

Manage it with `GET`, `PUT` and `DELETE /v1/accounts/{accountId}/messenger-menu` ([Set persistent menu](/account-settings/set-messenger-menu)), the same endpoint as Facebook.

An account connected through Facebook Login is set through its linked Page. An Instagram Login account is set through the Instagram API.

A postback item whose payload is `zernio:workflow:<workflowId>` starts that workflow when tapped. The workflow must be active on this account and profile.

## Comments

| Feature | Supported |
|---------|-----------|
| List comments on posts | <Yes /> |
| Post a new top-level comment | <Yes /> |
| Reply to comments | <Yes /> |
| Delete comments | <Yes /> |
| Like comments | Limited release (see below) |
| Hide and unhide comments | <Yes /> |
| Send a private reply (DM after a comment) | <Yes /> (text plus up to 13 quick replies or 1 to 3 inline buttons, 7-day window, one per comment) |

**Liking a comment** is in limited release. It needs Meta's `instagram_manage_engagement` permission, which this app holds under Standard Access.

So the call works for admins, developers and testers of Zernio's Meta app. Everyone else gets a `403` with code `PLATFORM_BETA_RESTRICTED`.

It covers comments and replies on feed posts, reels and carousels, and only on an account connected through Facebook Login. An Instagram Login connection returns a `400` with code `instagram_likes_require_facebook_login`.

### Comment-to-DM automations

Keyword-triggered auto-DMs, created with [Create comment automation](/comment-automations/create-comment-automation). `trigger` picks the door:

- `comment` (default): a keyword comment on a post or reel.
- `live_comment`: a keyword comment during one of your live broadcasts, answered with a private reply while the broadcast is live.
- `story_reply`: a keyword reply to your story.
- `story_mention`: someone mentions the account in their story. A mention carries no text, so `keywords` must be empty.

Comments arrive by webhook. Every 10 minutes, Zernio also reads the latest comments and runs any the webhook missed. A comment is answered at most once, whichever path sees it first.

`repeatPolicy`, `dedupeSameTextHours`, `publicReplyPolicy`, `actions`, `quickReplies`, `dmMedia` and `{{first_name}}` personalisation are covered in [ManyChat-style automations](/guides/manychat-patterns#comment-to-dm-with-buttons).

**Product cards.** `template` sends a product card instead of the plain `dmMessage`. A card has an image, a title, a subtitle for the description or price, and up to 3 `url` or `postback` buttons (no phone buttons).

Up to 10 elements render as a swipeable carousel. The card is mutually exclusive with `dmMessage` plus `buttons`, and its url buttons are click-tracked like flat buttons.

It renders in the Instagram mobile app only, because Meta does not support the generic template on Instagram desktop web.

```json
{
  "template": {
    "type": "generic",
    "elements": [{
      "imageUrl": "https://example.com/product.jpg",
      "title": "Handmade Leather Bag",
      "subtitle": "Free shipping, $49",
      "buttons": [{ "type": "url", "title": "Order Now", "url": "https://example.com/order" }]
    }]
  }
}
```

**Audience.** `audience` restricts who gets the DM. It is Instagram only: Facebook automations reject it, because Meta exposes the follow relationship on Instagram only.

| Field | Values | What it does |
|-------|--------|--------------|
| `followerStatus` | `any` (default), `follower`, `non_follower` | Only DM followers, or only non-followers |
| `minFollowerCount` | integer | Skip commenters below this follower count |
| `whenUnknown` | `send` (default), `skip`, `verify` | What to do when Instagram will not reveal the follow relationship |

Because of the consent rule above, a first-time commenter is unresolvable until they message you. So `whenUnknown` decides most outcomes:

- `send` delivers anyway, so a real customer is never silently dropped.
- `skip` stays silent.
- `verify` sends `followGate.message` with a confirm button. The tap is itself a message, which grants consent, so the follow check resolves and the real DM (or `followGate.notFollowingMessage`) goes out.

Anyone who has messaged you before is checked at once and never sees this step.

```json
{
  "audience": { "followerStatus": "follower", "whenUnknown": "verify" },
  "followGate": {
    "message": "Follow the account, then tap below to unlock the link 👇",
    "buttonLabel": "I'm following ✅",
    "notFollowingMessage": "Looks like you're not following yet. Follow and try again 🙌"
  }
}
```

## Webhooks

Instagram emits every message lifecycle event:

- `message.received`
- `message.sent`
- `message.edited`
- `message.deleted` (the sender unsent it)
- `message.read`

The [webhooks page](/webhooks) has the payloads.

Zernio stores messages locally. Live messages arrive through webhooks.

On connect, Zernio replays the DM history the account already has on Meta: up to 500 conversations per account and the newest 500 messages per conversation. That includes conversations that began before the account was connected.

The replay runs in the background, fires no webhooks, and arrives already read, so it never affects unread counts. Read it from [List inbox conversations](/messages/list-inbox-conversations).

The `message.deleted` payload keeps the original `text` and `attachments`, so API consumers can read pre-delete content for moderation or compliance. The Zernio dashboard hides that content.