# Workflows

Create and activate a workflow with POST /v1/workflows so DMs, ref links, comments, story mentions and reactions on one account run a graph of messages, waits, conditions and handoffs.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

A workflow runs a graph of actions on one connected messaging account each time its trigger fires. It sends messages, waits for replies, branches, calls your webhooks and hands off to a human.

Create one with `POST /v1/workflows` and activate it with `POST /v1/workflows/{workflowId}/activate`.

Workflows are not [WhatsApp Flows](/platforms/whatsapp/flows) (Meta's in-chat forms). A workflow can send a flow, but they are separate products.

## First workflow

This workflow greets a WhatsApp contact who writes "hi" or "hello", waits for their name and replies with it.

You need an API key, a profile id and the `accountId` of a connected WhatsApp account ([connecting accounts](/guides/connecting-accounts)).

A workflow is created in `draft` status, so the second call activates it.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: created } = await zernio.workflows.createWorkflow({
  body: {
    profileId: '66a1f0c2a4b9d3e8f1a2b3c4',
    accountId: '66b2e19d8c3f5a7e9d0b1c2d',
    platform: 'whatsapp',
    name: 'Welcome',
    nodes: [
      { id: 'n_trigger', type: 'trigger', config: { triggerType: 'inbound_message', keywords: ['hi', 'hello'], matchType: 'contains', onlyFirstMessage: true } },
      { id: 'n_ask', type: 'send_message', config: { messageType: 'text', text: 'Hi. What is your name?' } },
      { id: 'n_wait', type: 'wait_for_reply', config: { saveAs: 'name', timeoutMinutes: 10 } },
      { id: 'n_reply', type: 'send_message', config: { messageType: 'text', text: 'Thanks {{name}}, a teammate will be with you shortly.' } },
      { id: 'n_end', type: 'end' },
    ],
    edges: [
      { id: 'e1', source: 'n_trigger', target: 'n_ask' },
      { id: 'e2', source: 'n_ask', target: 'n_wait' },
      { id: 'e3', source: 'n_wait', target: 'n_reply' },
      { id: 'e4', source: 'n_reply', target: 'n_end' },
    ],
  },
});
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()

created = client.workflows.create_workflow(
    profile_id="66a1f0c2a4b9d3e8f1a2b3c4",
    account_id="66b2e19d8c3f5a7e9d0b1c2d",
    platform="whatsapp",
    name="Welcome",
    nodes=[
        {"id": "n_trigger", "type": "trigger", "config": {"triggerType": "inbound_message", "keywords": ["hi", "hello"], "matchType": "contains", "onlyFirstMessage": True}},
        {"id": "n_ask", "type": "send_message", "config": {"messageType": "text", "text": "Hi. What is your name?"}},
        {"id": "n_wait", "type": "wait_for_reply", "config": {"saveAs": "name", "timeoutMinutes": 10}},
        {"id": "n_reply", "type": "send_message", "config": {"messageType": "text", "text": "Thanks {{name}}, a teammate will be with you shortly."}},
        {"id": "n_end", "type": "end"},
    ],
    edges=[
        {"id": "e1", "source": "n_trigger", "target": "n_ask"},
        {"id": "e2", "source": "n_ask", "target": "n_wait"},
        {"id": "e3", "source": "n_wait", "target": "n_reply"},
        {"id": "e4", "source": "n_reply", "target": "n_end"},
    ],
)
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/workflows" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
    "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
    "platform": "whatsapp",
    "name": "Welcome",
    "nodes": [
      { "id": "n_trigger", "type": "trigger", "config": { "triggerType": "inbound_message", "keywords": ["hi", "hello"], "matchType": "contains", "onlyFirstMessage": true } },
      { "id": "n_ask", "type": "send_message", "config": { "messageType": "text", "text": "Hi. What is your name?" } },
      { "id": "n_wait", "type": "wait_for_reply", "config": { "saveAs": "name", "timeoutMinutes": 10 } },
      { "id": "n_reply", "type": "send_message", "config": { "messageType": "text", "text": "Thanks {{name}}, a teammate will be with you shortly." } },
      { "id": "n_end", "type": "end" }
    ],
    "edges": [
      { "id": "e1", "source": "n_trigger", "target": "n_ask" },
      { "id": "e2", "source": "n_ask", "target": "n_wait" },
      { "id": "e3", "source": "n_wait", "target": "n_reply" },
      { "id": "e4", "source": "n_reply", "target": "n_end" }
    ]
  }'
```
</Tab>
</Tabs>

Response (`200`), the draft workflow:

```json
{
  "success": true,
  "workflow": {
    "id": "66d4a1b2c3e4f5a6b7c8d9e1",
    "name": "Welcome",
    "platform": "whatsapp",
    "status": "draft",
    "nodeCount": 5,
    "entryNodeId": "n_trigger",
    "createdAt": "2026-09-08T10:00:00Z"
  }
}
```

`workflow.id` is the `workflowId` for the activate call:

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: activated } = await zernio.workflows.activateWorkflow({
  path: { workflowId: created.workflow.id },
});

console.log(activated.workflow.status);
```
</Tab>
<Tab value="Python">
```python
activated = client.workflows.activate_workflow(workflow_id=created["workflow"]["id"])

print(activated["workflow"]["status"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/workflows/66d4a1b2c3e4f5a6b7c8d9e1/activate" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`), the same workflow with `status: "active"`:

```json
{
  "success": true,
  "workflow": {
    "id": "66d4a1b2c3e4f5a6b7c8d9e1",
    "status": "active",
    "entryNodeId": "n_trigger"
  }
}
```

From now on a DM containing "hi" or "hello" on that account starts a run.

## Triggers and nodes

Every workflow has exactly one `trigger` node. Its `config.triggerType` decides what starts a run.

A workflow starts only on events of its own trigger type:

| `triggerType` | Starts when | Platforms |
|---|---|---|
| `inbound_message` (default) | The account receives a DM. Optional `keywords` plus `matchType` (`any`, `contains`, `exact`, `regex`) filter which messages match; `onlyFirstMessage: true` fires once per contact. | Every workflow platform |
| `referral` | Someone opens the chat through an ig.me or m.me link with a `ref`, or by clicking a click-to-message ad. It fires on a standalone referral and on the first message that carries one; the two are deduplicated per conversation within 60 seconds. `referral: { ref, matchType }` narrows it (`matchType` is `exact`, `prefix` or `any`, default `any`). | Instagram, Facebook, WhatsApp (click-to-WhatsApp ads) |
| `story_mention` | Someone mentions the account in their Instagram story. | Instagram |
| `comment` | Someone comments on a post. `comment: { keywords, matchType, platformPostId }` filters by keyword and scopes to one post. The run starts with no conversation: its first `send_message` goes out as the private reply to the comment, and the run continues in the conversation that reply opens. | Instagram, Facebook |
| `reaction` | Someone reacts to a message. `reaction: { emojis }` filters by emoji. | Instagram, Facebook, WhatsApp, Telegram groups |
| `whatsapp_event` | A status arrives for a message the account sent (`eventType`: `message_sent`, `message_delivered`, `message_read`, `message_failed`, `reaction`). Never on the status of a message a workflow, sequence or comment automation sent, so a workflow cannot restart itself. | WhatsApp |
| `api_call` | Your backend starts a run with [Start an API-triggered workflow](/workflows/trigger-api-call-workflow). | Every workflow platform |

**Cooldown.** `cooldownHours` (1 to 720) stops the same contact from starting the workflow again inside the window. It applies to `inbound_message`, `referral`, `story_mention`, `reaction` and `whatsapp_event`.

A redelivered platform event never starts the same workflow twice.

**Comment workflows.** The first step must be a `send_message` placed directly after the trigger, sending text (with optional buttons or quick replies) or cards. The save checks it.

Instagram delivers only plain text to commenters who do not follow the account.

**Automations win.** When an active [comment automation](/comment-automations/create-comment-automation)'s keywords match the same comment, the automation answers and the workflow does not start.

Likewise, a story reply or story mention that a story-reply or story-mention automation answers starts no workflow.

`platform` is one of `whatsapp`, `instagram`, `facebook`, `telegram`, `twitter` (X), `bluesky`, `reddit`.

The graph is `nodes[]` plus `edges[]`. Each node has a stable `id`, a `type` and a type-specific `config`. Each edge links a `source` node to a `target` node.

A node with more than one outcome takes the edge whose `sourceHandle` matches:

| Node | `sourceHandle` values |
|---|---|
| `condition` | the matched rule's `id`, or `default` |
| `wait_for_reply` | `reply` or `timeout` |
| `webhook` | `success` or `error` |

An edge without `sourceHandle` is the node's single or default output.

The 16 node types:

- Messaging: `send_message` (text and media everywhere; template and interactive messages on WhatsApp; cards, buttons, quick replies and message tags on Instagram and Facebook).
- Control flow: `trigger`, `condition`, `delay`, `wait_for_reply`, `a_b_split`, `end`.
- Data: `set_variable` (run-scoped), `set_field` (persisted on the contact), `add_tag`, `remove_tag`, `enroll_sequence`.
- Integrations: `webhook`, `ai` (your own LLM provider key), `handoff`, `start_call` (WhatsApp only).

The full `config` shape per node type is on [Create workflow](/workflows/create-workflow).

### Variables

Every string in `config` accepts `{{variable}}` interpolation.

These are present from the start of every run, as `''` when the trigger did not carry them:

| Group | Variables |
|---|---|
| Message | `lastMessage`, `inboundText`, `triggerText`, `conversationId` |
| Contact | `contact.name`, `contact.phone`, `contact.handle`, `contact.tags` (array), `contact.fields` (the contact's custom fields), `contact.lastInteractionAt` (ISO date), `contact.lastInteractionHoursAgo` (number), `contact.isFollower` (Instagram, from the stored profile: `true`, `false` or `''` when unknown) |
| Referral | `referral.ref`, `referral.source`, `referral.type`, `referral.adId` |
| Taps | `postback.payload`, `postback.title`, `quickReply.payload`, `quickReply.title` |
| Story | `story.id`, `story.url` |
| Comment | `comment.id`, `comment.text`, `comment.platformPostId` |
| Reaction | `reaction.emoji`, `reaction.action` (`added` or `removed`) |

Anything captured with `saveAs` and every `set_variable` assignment joins the same bag.

`api_call` runs also get the request's `variables`, merged over these.

An array or object interpolated into text renders as JSON.

### Conditions

A `condition` node's rules take one of these operators. Text operators compare case-insensitively.

| Operators | Compare |
|---|---|
| `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`, `ends_with`, `matches`, `exists`, `not_exists` | Text |
| `greater_than`, `less_than`, `greater_or_equal`, `less_or_equal` | Numbers (a non-numeric side is false) |
| `before`, `after` | ISO dates |
| `has_tag`, `not_has_tag` | Whether an array variable such as `contact.tags` contains `value` |
| `is_true`, `is_false` | Booleans; they take no `value` |

### Buttons, quick replies and cards on Instagram and Facebook

On Instagram and Facebook a `send_message` node also takes these fields. Other platforms answer `400`; WhatsApp keeps `interactive`.

- `buttons`: 1 to 3 `{ type: url|postback|phone, title, url, payload, phone, workflowId }` on a `text` message.
  - The text then goes out as Meta's button template and must be 640 characters at most.
  - `phone` buttons are Facebook only.
  - Media cannot carry buttons. Use `cards` for an image with buttons.
- `quickReplies`: 1 to 13 `{ title, payload, imageUrl, workflowId }`, not combined with `buttons`.
- `messageType: "cards"` with `template: { type: "generic", elements: [{ title, subtitle, imageUrl, buttons }] }`, 1 to 10 cards.
- `messageTag`: `HUMAN_AGENT`, `CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE` or `ACCOUNT_UPDATE`, to send outside the 24-hour window. Instagram accepts only `HUMAN_AGENT`.

Titles are capped at 20 characters (80 for card titles and subtitles).

**No `payload`.** A postback button or quick reply with no payload gets `zernio:workflow:<this workflow id>`. A tap then answers this workflow's pending `wait_for_reply` or restarts it.

**`workflowId`** (not combined with `payload`) makes the tap start that workflow instead.

A tap sets `{{postback.payload}}` and `{{postback.title}}`, or `{{quickReply.payload}}` and `{{quickReply.title}}`. Each reply clears the previous tap.

## How it behaves

### A workflow starts as a draft

Creation validates the graph's structure and returns `400` when it is invalid:

- unique node ids
- edges that reference existing nodes
- no WhatsApp-only node on another platform

Activation additionally requires a complete graph and one trigger node with a reachable entry.

Only an `active` workflow starts runs. A workflow that "does nothing" is usually `draft` or `paused`: check `status` first.

### Pause stops new runs, in-flight runs finish

A workflow moves `draft` to `active` to `paused`.

[Pause](/workflows/pause-workflow) stops matching new messages while runs already started finish. [Activate](/workflows/activate-workflow) again to resume.

### Editing the graph needs a draft or paused workflow

[Update workflow](/workflows/update-workflow) changes the name, the description or the account at any time.

The graph can only be modified while the workflow is `draft` or `paused`. A graph edit on an `active` workflow answers `400`.

[Pause](/workflows/pause-workflow) it, send the new `nodes` and `edges`, then [activate](/workflows/activate-workflow) again.

Each change to the graph records a [version](/workflows/list-workflow-versions) you can [restore](/workflows/restore-workflow-version).

### Runs carry their status and variables

[List workflow runs](/workflows/list-workflow-executions) returns each execution with its `status` (`running`, `waiting`, `completed`, `exited`, `failed`), current node and accumulated variables.

[The run timeline](/workflows/list-workflow-execution-events) shows every node visited.

A comment-triggered run has `conversationId: null` until its private reply opens the conversation.

**Testing.** To test a graph without a real inbound message, use [Manually start a workflow run](/workflows/trigger-workflow). Pass `to` (WhatsApp) or `conversationId` (other platforms), plus an optional `text` to seed `lastMessage`.

### Your backend starts `api_call` workflows

[Start an API-triggered workflow](/workflows/trigger-api-call-workflow) (`POST /v1/workflows/{workflowId}/trigger`) starts a run of an active workflow whose trigger type is `api_call`.

Pass exactly one target:

| Target | Runs in |
|---|---|
| `conversationId` | a conversation on the workflow's account |
| `contactId` | that contact's conversation on the workflow's account |
| `to` | WhatsApp workflows only: a phone number whose conversation is found or created |

Any other combination is a `400`.

`variables` are merged over the standard run variables, so each key is available as `{{key}}`.

The answer is `201` with the run id:

```bash
curl -X POST "https://zernio.com/api/v1/workflows/66d4a1b2c3e4f5a6b7c8d9e1/trigger" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "contactId": "66e5b2c3d4f5a6b7c8d9e0f1", "variables": { "orderId": "A-1042" } }'
```

```json
{ "executionId": "66f1a2b3c4d5e6f7a8b9c0d1" }
```

### Every run reports its lifecycle

Subscribe to [`workflow.run.started`, `workflow.run.completed` and `workflow.run.failed`](/webhooks/automations) to follow runs without polling.

`workflow.run.completed` carries `execution.status: "exited"` when the run ended on purpose before its last node. That means a handoff, or a button that switched the contact to another workflow.

`workflow.run.failed` carries `error`.

A [`message.sent`](/webhooks/inbox#messagesent) for a message a run sent carries `sentVia: "workflow"`, `workflowId` and `executionId`. Use them to attribute replies and conversions to the run.

### Workflows need inbox access

Every `/v1/workflows/*` route runs the same guard, and on an account without inbox access it answers `403`:

```json
{
  "error": "Inbox addon required. Start a free 7-day trial to get started.",
  "code": "INBOX_REQUIRED",
  "trialAvailable": true
}
```

Branch on `code`, not on the message. `trialAvailable` is `false` once the trial is spent, and the message then reads `Inbox addon required. Upgrade to access inbox features.`

Usage-based billing includes the inbox on every account ([pricing](/pricing)), so this answer belongs to legacy plans.

A team member inherits the access of whoever invited them.

## If it fails

**`400` on the activate call.** The graph is incomplete or invalid. The `error` message names the problem:

- no trigger node
- unreachable nodes
- a WhatsApp-only node such as `start_call` on another platform

Fix the graph with [Update workflow](/workflows/update-workflow) and activate again.

**`401`** with `{ "error": "Unauthorized" }` means the key is wrong.

Every error uses the envelope in [error handling](/guides/error-handling).

## Related

- [Create workflow](/workflows/create-workflow): every node type's `config`.
- [List workflows](/workflows/list-workflows), [Get workflow](/workflows/get-workflow), [Delete workflow](/workflows/delete-workflow), [Duplicate workflow](/workflows/duplicate-workflow).
- [WhatsApp inbox](/platforms/whatsapp/inbox): the messages a `send_message` node can send.
- [Inbox webhooks](/webhooks/inbox): the `message.received` events that trigger runs.
- [Automation webhooks](/webhooks/automations): run, sequence and contact events.
- [ManyChat-style automations](/guides/manychat-patterns): ref links, comment to DM, story mentions and handover, end to end.
- [CLI](/cli/inbox#workflows): `zernio workflows:create` and friends.