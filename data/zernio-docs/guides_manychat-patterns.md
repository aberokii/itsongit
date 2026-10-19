# ManyChat-style automations

Build ref-link entry points, comment-to-DM funnels with buttons, story-mention replies, repeat rules and a handover to another inbox app on Instagram and Facebook with workflows and comment automations.

The growth automations people know from ManyChat are built on Zernio from two primitives:

- [Workflows](/workflows): a graph that runs on one messaging account when its trigger fires.
- [Comment automations](/comment-automations/create-comment-automation): a keyword rule that answers a comment or story with a DM.

This guide wires the common patterns end to end on Instagram and Facebook.

You need an API key and the `accountId` of a connected Instagram or Facebook account in a profile ([connecting accounts](/guides/connecting-accounts)). You also need the inbox on that account ([workflows need inbox access](/workflows#workflows-need-inbox-access)).

| You want | Use |
|---|---|
| A link or QR code that starts a flow | A workflow with a [`referral` trigger](#ref-link-to-a-workflow) |
| An ad click that starts a flow | `workflowId` on [messaging ads](/platforms/meta-ads/messaging-ads#start-a-workflow-from-the-ad) and [boosts](/platforms/meta-ads/boost#a-messaging-boost-can-start-a-workflow) |
| Comment a keyword, get a DM | A [comment automation](#comment-to-dm-with-buttons), or a workflow with a `comment` trigger |
| Reply to story mentions | A [`story_mention`](#story-mentions) automation or workflow trigger |
| DM once per person, or on every comment | [`repeatPolicy`](#repeat-rules) |
| Let a human take over in another app | [Thread control](#handover-with-another-app) |
| Welcome screen, FAQ prompts, menu | [Greeting, ice breakers and persistent menu](#welcome-screen-and-menu) |

## Ref link to a workflow

When someone opens an ig.me or m.me link with a `ref` parameter, the account receives a referral. A workflow whose trigger is `referral` starts on it.

It starts whether the referral arrives on its own or rides the first message. The two are deduplicated per conversation within 60 seconds.

`referral.ref` with `matchType` `exact`, `prefix` or `any` (the default) picks which links start this workflow. One account can serve many campaigns.

This workflow answers the `spring-sale` link with a button message, waits for the tap and tags the contact:

```bash
curl -X POST "https://zernio.com/api/v1/workflows" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
    "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
    "platform": "instagram",
    "name": "Spring sale link",
    "nodes": [
      { "id": "n_trigger", "type": "trigger", "config": { "triggerType": "referral", "referral": { "ref": "spring-sale", "matchType": "exact" }, "cooldownHours": 24 } },
      { "id": "n_offer", "type": "send_message", "config": { "messageType": "text", "text": "Hi {{contact.name}}, here is 20% off everything this week.", "buttons": [ { "type": "url", "title": "Shop now", "url": "https://example.com/spring" }, { "type": "postback", "title": "Remind me later" } ] } },
      { "id": "n_wait", "type": "wait_for_reply", "config": { "timeoutMinutes": 1440, "saveAs": "answer" } },
      { "id": "n_tag", "type": "add_tag", "config": { "tag": "spring-sale" } },
      { "id": "n_end", "type": "end" }
    ],
    "edges": [
      { "id": "e1", "source": "n_trigger", "target": "n_offer" },
      { "id": "e2", "source": "n_offer", "target": "n_wait" },
      { "id": "e3", "source": "n_wait", "target": "n_tag", "sourceHandle": "reply" },
      { "id": "e4", "source": "n_wait", "target": "n_end", "sourceHandle": "timeout" },
      { "id": "e5", "source": "n_tag", "target": "n_end" }
    ]
  }'
```

Activate it with `POST /v1/workflows/{workflowId}/activate`.

The "Remind me later" postback has no `payload`, so Zernio stamps `zernio:workflow:<this workflow id>`. The tap answers the pending `wait_for_reply`, and `{{postback.title}}` is then `Remind me later`.

The referral itself is in `{{referral.ref}}`, `{{referral.source}}`, `{{referral.type}}` and, for an ad click, `{{referral.adId}}`.

`cooldownHours` stops the same contact from starting the workflow again for a day.

A `referral` workflow also fires on click-to-message ads (Instagram, Facebook and click-to-WhatsApp).

To pin one ad to one workflow regardless of triggers, set `workflowId` on the ad instead ([messaging ads](/platforms/meta-ads/messaging-ads#start-a-workflow-from-the-ad)).

## Comment to DM with buttons

### With a comment-triggered workflow

A workflow with `triggerType: "comment"` starts with no conversation.

Its first `send_message`, placed directly after the trigger, goes out as the private reply to the comment. The run continues in the conversation that reply opens.

`comment: { keywords, matchType, platformPostId }` filters by keyword and scopes to one post.

Instagram refuses buttons, cards and attachments in a private reply to someone who does not follow the account. A refused reply still spends the comment's single private reply ([Send private reply](/comments/send-private-reply-to-comment)).

So open with plain text, wait for the answer, then send the buttons:

```json
{
  "nodes": [
    { "id": "n_trigger", "type": "trigger", "config": { "triggerType": "comment", "comment": { "keywords": ["guide"], "matchType": "contains", "platformPostId": "17912345678901234" } } },
    { "id": "n_open", "type": "send_message", "config": { "messageType": "text", "text": "Hey! Reply YES and I will send you the guide." } },
    { "id": "n_wait", "type": "wait_for_reply", "config": { "timeoutMinutes": 1440, "saveAs": "answer" } },
    { "id": "n_link", "type": "send_message", "config": { "messageType": "text", "text": "Here it is. Want the video walkthrough too?", "buttons": [ { "type": "url", "title": "Get the guide", "url": "https://example.com/guide.pdf" }, { "type": "postback", "title": "Send the video", "workflowId": "66d4a1b2c3e4f5a6b7c8d9e7" } ] } },
    { "id": "n_end", "type": "end" }
  ],
  "edges": [
    { "id": "e1", "source": "n_trigger", "target": "n_open" },
    { "id": "e2", "source": "n_open", "target": "n_wait" },
    { "id": "e3", "source": "n_wait", "target": "n_link", "sourceHandle": "reply" },
    { "id": "e4", "source": "n_wait", "target": "n_end", "sourceHandle": "timeout" },
    { "id": "e5", "source": "n_link", "target": "n_end" }
  ]
}
```

The "Send the video" button carries `workflowId`, so its tap starts that follow-up workflow instead of this one.

`{{comment.text}}`, `{{comment.id}}` and `{{comment.platformPostId}}` hold the comment for the whole run.

### With a comment automation

A comment automation does the same without a graph. It adds a public reply, link tracking, follower rules and per-comment actions.

A postback button whose `payload` is `zernio:workflow:<workflowId>` hands the conversation to a workflow when tapped. The target must be active on the same account and profile.

The tap starts the target without matching its keyword or first-message condition.

```bash
curl -X POST "https://zernio.com/api/v1/comment-automations" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
    "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
    "name": "Guide giveaway",
    "platformPostId": "17912345678901234",
    "keywords": ["guide"],
    "matchMode": "word",
    "dmMessage": "Hey {{first_name}}! Tap below and I will send the guide.",
    "buttons": [ { "type": "postback", "title": "Send it", "payload": "zernio:workflow:66d4a1b2c3e4f5a6b7c8d9e7" } ],
    "commentReply": "Check your DMs, {{first_name}}!",
    "publicReplyPolicy": "always",
    "actions": { "likeComment": true }
  }'
```

- `{{first_name}}`, `{{name}}` and `{{username}}` resolve from the commenter in `dmMessage`, `commentReply`, their variations and button titles. A value the platform does not give resolves to an empty string.
- `publicReplyPolicy: "always"` posts `commentReply` whatever the audience rule, dedupe or DM outcome. The default `after_dm` posts it only after a successful DM.
- `actions.likeComment` and `actions.hideComment` like or hide the matched comment. They never block the DM. When one cannot run, the log row says why in `likeSkipped` or `hideSkipped`. Liking on Instagram is in limited release ([Instagram comments](/platforms/instagram/inbox#comments)).
- `quickReplies` (up to 13 chips, not with `buttons` or `template`) is optional. Chips do not render in Message Requests, where a first DM to a cold commenter lands, so prefer buttons for first contact.
- `dmMedia` is optional. It is an image, video, audio clip or file sent right after the text as a second message.
- `isActive: false` creates the automation paused.

**Missed webhooks.** On Instagram and Facebook, comments arrive by webhook. Every 10 minutes Zernio also reads the latest comments and runs any the webhook missed. It reads the bound post, or the 5 newest posts for an account-wide automation.

A dropped webhook still fires, and a comment is answered at most once.

[List automation logs](/comment-automations/list-comment-automation-logs) shows each attempt with `status`, `publicReplyPostedAt`, `gateButtonStatus` and link `clickCount`.

**Overlap.** When a comment automation and a comment-triggered workflow both match a comment, the automation answers and the workflow does not start.

**Reply-only platforms.** On TikTok, Threads, LinkedIn and YouTube, a comment automation posts the public reply only. `commentReply` is required and every DM field is a `400` ([platform support](/platforms/compare#comments)).

## Story mentions

When someone mentions the account in their Instagram story, two things can answer:

- A comment automation with `trigger: "story_mention"` sends `dmMessage` as a normal DM. A mention carries no text and Meta does not identify the story. So `keywords` must be empty and `platformPostId` omitted.
- A workflow with `triggerType: "story_mention"` runs a full graph, with the story in `{{story.url}}`.

When a story-mention automation answers, the workflow does not start.

**Story replies.** A reply to your story arrives as a message. It starts `inbound_message` workflows (with `{{story.id}}` and `{{story.url}}` set) and `story_reply` automations.

**Live broadcasts.** Keyword comments during an Instagram live broadcast have their own trigger, `live_comment`. It is answered with a private reply while the broadcast is live.

## Repeat rules

`repeatPolicy` decides whether one person can get an automation's DM more than once:

```json
{ "repeatPolicy": { "mode": "every_comment", "cooldownHours": 24 } }
```

- `once` (the default): one DM per person per door, ever. On the reply-only platforms it means one public reply per person per automation.
- `every_comment`: every new matching comment is eligible again. One comment is still answered at most once. `cooldownHours` (every_comment only, a `400` with `once`) skips a repeat sent to the same person within that many hours.

`dedupeSameTextHours` works across automations. It skips the DM when the recipient already received the identical text (after personalisation) from this account, from any automation, within that many hours.

Every suppression is logged with `status: "skipped"` and the reason in `error`.

**Workflows** have their own brake. `cooldownHours` (1 to 720) on an `inbound_message`, `referral`, `story_mention`, `reaction` or `whatsapp_event` trigger stops the same contact from starting the workflow again inside the window.

A redelivered platform event never starts the same workflow twice.

## Handover with another app

Meta's handover protocol lets a human work a thread in another app on the Page, such as Page Inbox (app id `263902037430900`). Zernio steps aside meanwhile.

Pass the thread when a workflow decides a human is needed:

```bash
curl -X POST "https://zernio.com/api/v1/inbox/conversations/66c3d2ae7b4f6c8d0e1f2a3b/thread-control" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "accountId": "66b2e19d8c3f5a7e9d0b1c2d", "action": "pass", "targetAppId": "263902037430900", "metadata": "Customer asked for a human" }'
```

```json
{ "success": true, "control": { "owner": "other", "ownerAppId": "263902037430900" } }
```

While the other app owns the thread:

- Inbound messages still arrive on [`message.received`](/webhooks/inbox#messagereceived), flagged `metadata.standby: true`. No workflow or comment automation runs on them.
- A send answers `409` with code `not_thread_owner`. `details.ownerAppId` names the owner when Meta reports it.
- [`conversation.control_changed`](/webhooks/inbox#conversationcontrol_changed) fires when Meta reports the thread moving, with `control.owner`, `control.previousOwner` and `control.ownerAppId`.

Get the thread back with one of these actions:

- `action: "take"`: Meta allows it only to the Page's primary receiver.
- `"request"`: asks the owner for the thread. Nothing changes until the owner passes it.
- `"release"`: gives it back to the primary receiver.

**Handoff node.** A workflow's `handoff` node ends the run as `exited` and flags the conversation for a human operator in Zernio.

To pass the Meta thread at that point, call thread-control from your backend. Do it when [`workflow.run.completed`](/webhooks/automations#workflowruncompleted) arrives with `execution.status: "exited"`.

## Welcome screen and menu

The surfaces people see before they type can start workflows too.

Every postback payload of the form `zernio:workflow:<workflowId>` starts that workflow when tapped. The workflow must be active on the account and profile.

| Surface | Endpoint | Platforms |
|---|---|---|
| Greeting text | [`/v1/accounts/{accountId}/messenger-greeting`](/account-settings/set-messenger-greeting) | Facebook |
| Get Started button | [`/v1/accounts/{accountId}/messenger-get-started`](/account-settings/set-messenger-get-started) | Facebook |
| Ice breakers | [`/v1/accounts/{accountId}/messenger-ice-breakers`](/account-settings/set-messenger-ice-breakers) | Facebook |
| Persistent menu | [`/v1/accounts/{accountId}/messenger-menu`](/account-settings/set-messenger-menu) | Facebook, Instagram |
| Ice breakers and slash commands | [`/v1/whatsapp/conversational-automation`](/whatsapp/set-whatsapp-conversational-automation) | WhatsApp |

Instagram keeps its ice breakers at [`/v1/accounts/{accountId}/instagram-ice-breakers`](/account-settings/set-instagram-ice-breakers).

On WhatsApp a tapped prompt arrives as an ordinary message with its text. An `inbound_message` workflow keyed on that text answers it.

## Follow everything with webhooks

- [`message.sent`](/webhooks/inbox#messagesent) names what sent each message: `sentVia` plus `automationId`, `workflowId` and `executionId`, `broadcastId` or `sequenceId`.
- [`workflow.run.started`, `workflow.run.completed` and `workflow.run.failed`](/webhooks/automations) follow each run.
- [`contact.tag_added`, `contact.tag_removed` and `contact.field_changed`](/webhooks/automations) mirror what `add_tag`, `remove_tag` and `set_field` nodes write.
- [`referral.received`](/webhooks/inbox#referralreceived) and [`comment.received`](/webhooks/inbox#commentreceived) carry the raw entry events.

## Related

- [Workflows](/workflows): every trigger, variable, operator and node.
- [Create comment automation](/comment-automations/create-comment-automation): every field.
- [Instagram](/platforms/instagram/inbox) and [Facebook](/platforms/facebook/inbox): DMs, message requests and handover per platform.
- [Message requests](/messages/accept-conversation-request): accept a DM from someone the account has not accepted yet.