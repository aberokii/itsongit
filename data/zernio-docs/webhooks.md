# Webhooks

Create a webhook endpoint, receive your first event, and verify, deduplicate and retry deliveries the way Zernio sends them.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

Zernio POSTs an event to your webhook endpoint when something happens: a post publishes, a DM arrives, an account disconnects, a number activates.

Enable it with `POST /v1/webhooks/settings`. You can also edit the same endpoints in the [webhooks dashboard](https://zernio.com/dashboard/webhooks).

Zernio signs deliveries with the `secret` you send in that call. Zernio never generates one for you.

## First event

Call `POST /v1/webhooks/settings` with `name`, `url`, `events` and a `secret`. You can create up to 50 endpoints per user.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: created } = await zernio.webhooks.createWebhookSettings({
  body: {
    name: 'Production',
    url: 'https://example.com/webhooks/zernio',
    secret: process.env.ZERNIO_WEBHOOK_SECRET,
    events: ['post.published', 'post.failed', 'message.received']
  }
});

const webhookId = created.webhook._id;
```
</Tab>
<Tab value="Python">
```python
import os
from zernio import Zernio

client = Zernio()

created = client.webhooks.create_webhook_settings(
    name="Production",
    url="https://example.com/webhooks/zernio",
    secret=os.environ["ZERNIO_WEBHOOK_SECRET"],
    events=["post.published", "post.failed", "message.received"],
)

webhook_id = created["webhook"]["_id"]
```
</Tab>
<Tab value="curl">
```bash
curl -X POST https://zernio.com/api/v1/webhooks/settings \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production",
    "url": "https://example.com/webhooks/zernio",
    "secret": "'"$ZERNIO_WEBHOOK_SECRET"'",
    "events": ["post.published", "post.failed", "message.received"]
  }'
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "success": true,
  "webhook": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Production",
    "url": "https://example.com/webhooks/zernio",
    "events": ["post.published", "post.failed", "message.received"],
    "isActive": true,
    "failureCount": 0
  }
}
```

`webhook._id` is the `webhookId` for the test call.

Call `POST /v1/webhooks/test` to send a `webhook.test` event to the endpoint right away:

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: tested } = await zernio.webhooks.testWebhook({
  body: { webhookId }
});

console.log(tested.message);
```
</Tab>
<Tab value="Python">
```python
tested = client.webhooks.test_webhook(webhook_id=webhook_id)

print(tested["message"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST https://zernio.com/api/v1/webhooks/test \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "507f1f77bcf86cd799439011"}'
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "success": true,
  "message": "Test webhook sent successfully"
}
```

Your endpoint receives one `POST` with these headers and body:

```http
POST /webhooks/zernio HTTP/1.1
Content-Type: application/json
User-Agent: Zernio-Webhooks/1.0
X-Zernio-Event: webhook.test
X-Zernio-Event-Id: 3f0c1c2e-6c4a-4d3e-9b1f-2a7d8e9f0a1b
X-Zernio-Signature: 5d41402abc4b2a76b9719d911017c592e4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9
```

```json
{
  "id": "3f0c1c2e-6c4a-4d3e-9b1f-2a7d8e9f0a1b",
  "event": "webhook.test",
  "message": "This is a test webhook from Zernio",
  "timestamp": "2027-01-01T17:00:00Z"
}
```

Return any `2xx` within 5 seconds.

`webhook.test` reaches the endpoint whatever its `events` list says, so it works before you subscribe to anything real.

A `500` from the test call means your endpoint did not answer `2xx`:

```json
{
  "success": false,
  "message": "Test webhook failed"
}
```

Check the endpoint's URL. Then read the attempt in [webhook logs](/webhooks/get-webhook-logs) or the [dashboard](https://zernio.com/dashboard/webhooks).

## Events

Every event is one `event` name in the `events` array.

Each area page documents the payload of every event it covers.

| Area | Events |
| --- | --- |
| [Posts](/webhooks/posts) | [`post.scheduled`](/webhooks/posts#postscheduled), [`post.platform.published`](/webhooks/posts#postplatformpublished), [`post.platform.failed`](/webhooks/posts#postplatformfailed), [`post.published`](/webhooks/posts#postpublished), [`post.partial`](/webhooks/posts#postpartial), [`post.failed`](/webhooks/posts#postfailed), [`post.tiktok.url_resolved`](/webhooks/posts#posttiktokurl_resolved), [`post.platform.deleted`](/webhooks/posts#postplatformdeleted), [`post.cancelled`](/webhooks/posts#postcancelled), [`post.recycled`](/webhooks/posts#postrecycled), [`post.external.created`](/webhooks/posts#postexternalcreated), [`post.external.updated`](/webhooks/posts#postexternalupdated), [`post.external.deleted`](/webhooks/posts#postexternaldeleted) |
| [Inbox](/webhooks/inbox) | [`message.received`](/webhooks/inbox#messagereceived), [`message.sent`](/webhooks/inbox#messagesent), [`conversation.started`](/webhooks/inbox#conversationstarted), [`conversation.control_changed`](/webhooks/inbox#conversationcontrol_changed), [`message.edited`](/webhooks/inbox#messageedited), [`message.deleted`](/webhooks/inbox#messagedeleted), [`message.delivered`](/webhooks/inbox#messagedelivered), [`message.read`](/webhooks/inbox#messageread), [`message.failed`](/webhooks/inbox#messagefailed), [`reaction.received`](/webhooks/inbox#reactionreceived), [`referral.received`](/webhooks/inbox#referralreceived), [`comment.received`](/webhooks/inbox#commentreceived), [`review.new`](/webhooks/inbox#reviewnew), [`review.updated`](/webhooks/inbox#reviewupdated) |
| [Automations](/webhooks/automations) | [`contact.tag_added`](/webhooks/automations#contacttag_added), [`contact.tag_removed`](/webhooks/automations#contacttag_removed), [`contact.field_changed`](/webhooks/automations#contactfield_changed), [`sequence.enrolled`](/webhooks/automations#sequenceenrolled), [`sequence.exited`](/webhooks/automations#sequenceexited), [`workflow.run.started`](/webhooks/automations#workflowrunstarted), [`workflow.run.completed`](/webhooks/automations#workflowruncompleted), [`workflow.run.failed`](/webhooks/automations#workflowrunfailed) |
| [Support Assistant](/webhooks/support-assistant) | [`support.run.completed`](/webhooks/support-assistant#supportruncompleted), [`support.run.failed`](/webhooks/support-assistant#supportrunfailed) |
| [Accounts](/webhooks/accounts) | [`account.connected`](/webhooks/accounts#accountconnected), [`account.disconnected`](/webhooks/accounts#accountdisconnected) |
| [Analytics](/webhooks/analytics) | [`analytics.synced`](/webhooks/analytics#analyticssynced) |
| [Ads](/webhooks/ads) | [`account.ads.initial_sync_completed`](/webhooks/ads#accountadsinitial_sync_completed), [`account.ads.sync_failed`](/webhooks/ads#accountadssync_failed), [`account.ads.sync_recovered`](/webhooks/ads#accountadssync_recovered), [`lead.received`](/webhooks/ads#leadreceived), [`ad.status_changed`](/webhooks/ads#adstatus_changed) |
| [Calls](/webhooks/calls) | [`call.received`](/webhooks/calls#callreceived), [`call.ended`](/webhooks/calls#callended), [`call.failed`](/webhooks/calls#callfailed), [`call.permission_request`](/webhooks/calls#callpermission_request) |
| [WhatsApp](/webhooks/whatsapp) | [`whatsapp.template.status_updated`](/webhooks/whatsapp#whatsapptemplatestatus_updated), [`whatsapp.template.category_updated`](/webhooks/whatsapp#whatsapptemplatecategory_updated), [`whatsapp.account.name_status_updated`](/webhooks/whatsapp#whatsappaccountname_status_updated), [`whatsapp.account.quality_updated`](/webhooks/whatsapp#whatsappaccountquality_updated), [`whatsapp.account.status_updated`](/webhooks/whatsapp#whatsappaccountstatus_updated), [`whatsapp.account.alert_received`](/webhooks/whatsapp#whatsappaccountalert_received), [`whatsapp.contact.identity_changed`](/webhooks/whatsapp#whatsappcontactidentity_changed), [`whatsapp.automatic_event`](/webhooks/whatsapp#whatsappautomatic_event) |
| [Phone numbers](/webhooks/phone-numbers) | [`whatsapp.number.kyc_submitted`](/webhooks/phone-numbers#whatsappnumberkyc_submitted), [`whatsapp.number.activated`](/webhooks/phone-numbers#whatsappnumberactivated), [`whatsapp.number.declined`](/webhooks/phone-numbers#whatsappnumberdeclined), [`whatsapp.number.action_required`](/webhooks/phone-numbers#whatsappnumberaction_required), [`whatsapp.number.verification_required`](/webhooks/phone-numbers#whatsappnumberverification_required), [`whatsapp.number.suspended`](/webhooks/phone-numbers#whatsappnumbersuspended), [`whatsapp.number.reactivated`](/webhooks/phone-numbers#whatsappnumberreactivated), [`whatsapp.number.released`](/webhooks/phone-numbers#whatsappnumberreleased), [`phone_number.stock_available`](/webhooks/phone-numbers#phone_numberstock_available) |
| [SMS registrations](/webhooks/sms) | [`sms.registration.status_updated`](/webhooks/sms#smsregistrationstatus_updated), [`sms.registration.action_required`](/webhooks/sms#smsregistrationaction_required) |
| [Branded Calling](/webhooks/branded-calling) | [`branded_calling.identity.status_updated`](/webhooks/branded-calling#branded_callingidentitystatus_updated), [`branded_calling.identity.action_required`](/webhooks/branded-calling#branded_callingidentityaction_required), [`branded_calling.number.status_updated`](/webhooks/branded-calling#branded_callingnumberstatus_updated) |
| [Verify](/verify/create-verification) | [`verification.approved`](#verification-events), [`verification.failed`](#verification-events) |
| [Changelog](/changelog) | [`api.changelog.published`](#api-changelog-events) |

Subscribe an endpoint only to the events it handles.

Manage endpoints with:

- [List webhooks](/webhooks/get-webhook-settings)
- [Update webhook settings](/webhooks/update-webhook-settings)
- [Delete webhook settings](/webhooks/delete-webhook-settings)

### Verification events

The two managed-OTP events have no area page. They belong to a verification, not to a connected account.

- `verification.approved` fires when the recipient submits the right code to [Check a verification code](/verify/check-verification).
- `verification.failed` fires when the attempts run out, with `reason: "max_attempts_reached"`.

Both carry `verification.verificationId`, `verification.channel` (`sms`) and `verification.to`.

Send the code with [Send a verification code](/verify/create-verification).

**Payload for `verification.approved`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **event** `string`: No description - one of: verification.approved
- **timestamp** `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.
- **verification** `object`: 
  - **verificationId** `string`: No description
  - **channel** `string`: No description - one of: sms, whatsapp
  - **to** `string`: No description

**Payload for `verification.failed`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **event** `string`: No description - one of: verification.failed
- **timestamp** `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.
- **verification** `object`: 
  - **verificationId** `string`: No description
  - **channel** `string`: No description - one of: sms, whatsapp
  - **to** `string`: No description
- **reason** `string`: No description - one of: max_attempts_reached

### API changelog events

`api.changelog.published` fires when an entry is published to the [changelog](/changelog). That happens when a change to the OpenAPI spec goes live.

It belongs to no profile or account. Every active endpoint subscribed to it receives it, and an endpoint scoped with `profileIds` or `accountIds` does not.

The payload carries the entry:

- `entry.type`
- `entry.message`: the announcement.
- `entry.url`
- `entry.specVersion`: the spec version.
- `entry.changes`: the diff of the spec as data, with the operations and component schemas added, removed and modified.

Automate on `changes` and `type`. Read `message` for the reason.

Nothing in it is specific to your account, so one subscription per integration is enough.

[List API changelog entries](/changelog/list-changelog) returns the same entries, newest first, to back-fill after downtime.

**Payload for `api.changelog.published`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **event** (required) `string`: No description - one of: api.changelog.published
- **entry** (required): `ApiChangelogEntry` - See schema definition
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this event (set once when the event payload is built, before delivery is queued). Retries and redeliveries keep the original value, so it reflects the event, not the delivery attempt.

## How it behaves

### Delivery retries

Zernio delivers an event up to 7 times, counting the first attempt. A delivery succeeds when your endpoint returns a `2xx` within 5 seconds.

Any other outcome schedules the next attempt: a non-`2xx` status, a timeout or a connection error. Backoff is exponential, capped at 24 hours, and measured from the moment the previous attempt finished:

| Attempt | Delay before this attempt | Cumulative time since the first attempt |
| --- | --- | --- |
| 1 | immediate | 0 |
| 2 | 10s | ~10s |
| 3 | 1m 40s | ~1m 50s |
| 4 | 16m 40s | ~18m 30s |
| 5 | 2h 46m 40s | ~3h 5m |
| 6 | 24h (capped) | ~27h 5m |
| 7 | 24h (capped) | ~51h 5m |

After the 7th failure Zernio moves the event to a dead-letter queue and stops retrying it.

Every attempt is visible in [webhook logs](/webhooks/get-webhook-logs) and the [dashboard](https://zernio.com/dashboard/webhooks). `attemptNumber` says which try produced each entry.

[Redeliver](/webhooks/redeliver-webhook-event) sends a dead-lettered event again.

The schedule starts once the event reaches Zernio's delivery queue.

If that queue briefly refuses a delivery when the event is emitted (for example under load), Zernio parks it. It re-sends the event to the queue every minute for up to 24 hours.

The event can arrive later than usual instead of being dropped.

To stay under the 5-second limit, persist the event and return `2xx`. Then process it on a background worker.

**Disabling.** Zernio disables an endpoint only when it has had no successful delivery for 3 days and one of these holds:

- It reached 20 consecutive terminal failures (events that exhausted every attempt).
- It has been failing continuously for 3 days.

One successful delivery inside that window keeps it enabled whatever the count.

Zernio emails the owner. Re-enable the endpoint with `isActive: true` on [Update webhook settings](/webhooks/update-webhook-settings).

You can also pause or remove an endpoint yourself at any time.

### At-least-once delivery

Zernio delivers every event at least once. The same event can arrive twice when a previous attempt's response was lost or your endpoint took longer than 5 seconds to answer.

Your handler must be idempotent.

Every payload carries a stable event id, repeated as a header:

- `payload.id`, the canonical event id (UUID).
- `X-Zernio-Event-Id`, the same value as a header.
- `X-Late-Event-Id`, the legacy alias, kept for backward compatibility.

Use it as your deduplication key. Insert the id into a unique-indexed table or cache before processing, and skip the payload when the insert conflicts.

### Finding the customer an event is about

Every event that belongs to a profile carries a top-level `profiles` array, one entry per profile with its `id` and the `externalId` you set on it ([Create profile](/profiles/create-profile)), or `null` when you have not set one:

```json
"profiles": [{ "id": "66a1f0c2a4b9d3e8f1a2b3c4", "externalId": "cus_8f3a2" }]
```

If you give each profile your own customer or tenant id as `externalId`, `profiles[0].externalId` routes any event with no lookup. A `post.*` event whose targets sit in several profiles lists each profile once. `verification.*`, `phone_number.stock_available`, `commerce.product.*`, `api.changelog.published`, `support.run.*` and `webhook.test` belong to no profile and carry no `profiles` key. The value is the profile's `externalId` when the event happened, and a redelivery replays it unchanged.

### Finding the account an event is about

The top-level `id` identifies the event only. It is never an account, post or other resource id, so do not fall back to it when routing.

The connected account lives here:

| Event family | Account id |
| --- | --- |
| `account.*`, `analytics.synced` | `account.accountId` |
| `message.*`, `reaction.received`, `referral.received`, `conversation.*`, `comment.received`, `review.*`, `lead.received`, `call.*` | `account.accountId` (`account.id` carries the same value, kept for compatibility; `call.received`, `call.ended` and `call.failed` also carry `call.accountId`) |
| `post.platform.*`, `post.tiktok.url_resolved` | `account.accountId`, the target this event is about (`post.platforms[].accountId` lists every target) |
| `post.scheduled`, `post.published`, `post.failed`, `post.partial`, `post.cancelled`, `post.recycled` | `post.platforms[].accountId`, one per target; there is no top-level account |
| `post.external.*` | `account.accountId` (also `post.accountId`) |
| `ad.status_changed`, `whatsapp.template.*`, `whatsapp.account.*`, `whatsapp.contact.identity_changed` | `account.accountId` |
| `whatsapp.automatic_event` | top-level `accountId` |
| `whatsapp.number.*`, `sms.registration.*` | none; `number.id` and `registration.id` are the number and registration ids, `number.profileId` and `registration.profileId` the profile |
| `verification.*`, `phone_number.stock_available`, `api.changelog.published`, `webhook.test`, `contact.*`, `sequence.*`, `workflow.run.*`, `support.run.*` | none (`sequence.*` and `workflow.run.*` still reach endpoints scoped to the sending account; `support.run.*` reach only endpoints with no profile or account scope) |

### Signatures

Zernio signs every delivery when the endpoint has a `secret`.

`X-Zernio-Signature` is the lowercase hex HMAC-SHA256 of the raw request body keyed by that secret. `X-Late-Signature` is the legacy alias with the same value.

Read the raw body, compute the HMAC and compare:

<Tabs items={['Node.js', 'Python']}>
<Tab value="Node.js">
```typescript
import crypto from "crypto";

export const POST = async (req: Request) => {
  const webhookSignature = req.headers.get("X-Zernio-Signature");
  if (!webhookSignature) {
    return new Response("No signature provided.", { status: 401 });
  }

  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("No secret provided.", { status: 401 });
  }

  const rawBody = await req.text();

  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (webhookSignature !== computedSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  // Handle the webhook event
  // ...
};
```
</Tab>
<Tab value="Python">
```python
import hashlib
import hmac
import json
import os

from fastapi import FastAPI, Request, Response

app = FastAPI()

@app.post("/webhooks/zernio")
async def handle_webhook(request: Request):
    signature = request.headers.get("X-Zernio-Signature")
    if not signature:
        return Response("No signature provided.", status_code=401)

    secret = os.environ.get("ZERNIO_WEBHOOK_SECRET")
    if not secret:
        return Response("No secret provided.", status_code=401)

    raw_body = await request.body()
    computed = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed, signature):
        return Response("Invalid signature", status_code=400)

    payload = json.loads(raw_body)
    # Handle the webhook event
    return Response(status_code=200)
```
</Tab>
</Tabs>

A mismatch means the request did not come from Zernio or the body changed in transit.

Do not process it.

<span id="routing-by-profile" />

### Routing by profile or account

An endpoint receives every profile's events by default. Set `profileIds` on the subscription to pin it to a list of profiles.

The endpoint is then only sent events attributable to one of them:

- The profile of the connected account behind the event.
- For a `post.*` event, the profile of every account the post targets. A post that spans two scoped endpoints' profiles reaches both.

The usual reason is a staging environment. Put the test accounts in their own profile and point one endpoint at staging, with `profileIds` set to that profile's id.

Give the production endpoint the production profiles. A post to a test account then never reaches production, and a customer's DM never reaches staging.

```json
POST /v1/webhooks/settings
{
  "name": "Staging",
  "url": "https://staging.example.com/webhooks/zernio",
  "events": ["post.published", "post.failed", "message.received"],
  "profileIds": ["66a1f0c2a4b9d3e8f1a2b3c4"]
}
```

Every id must be a profile in your team. An unknown one fails the call with `404` and `code: "profile_not_found"`, and nothing is saved.

Replace the list on [Update webhook settings](/webhooks/update-webhook-settings). An empty array clears it.

Sending the stored list back unchanged is always accepted. An endpoint stays editable after a listed profile is deleted, and the deleted id simply never matches again.

**Accounts.** `accountIds` does the same keyed on connected accounts. An id outside your team returns `404` with `code: "account_not_found"`. A subscription with both lists must match on both.

Prefer profiles. An account id changes when the account is reconnected, a profile does not.

**Unscoped events.** Events that belong to no profile only reach unscoped endpoints: `verification.*`, `phone_number.stock_available`, `api.changelog.published`, and a legacy post whose accounts were deleted.

**When the filter runs.** The filter runs when an event is emitted. [Redeliver](/webhooks/redeliver-webhook-event) replays a delivery already made to that endpoint. The test event ignores the list.

### The test event

Zernio sends `webhook.test` to an endpoint when you call [Test webhook](/webhooks/test-webhook) or press test in the [dashboard](https://zernio.com/dashboard/webhooks). It is sent whatever events the endpoint subscribes to.

It is sent once, synchronously, and is never retried.

**Payload for `webhook.test`:**

- **id** (required) `string`: Stable webhook event ID: the dedupe key, also sent as the X-Zernio-Event-Id header and identical on every retry and redelivery. It identifies the event only, never an account or other resource.
- **event** (required) `string`: No description - one of: webhook.test
- **message** (required) `string`: Human-readable test message
- **timestamp** (required) `string` (date-time): UTC time at which Zernio generated this test event (set once when the payload is built). Test fires are sent synchronously as a single attempt; a later redelivery of this event keeps the original value.

## Related

- [Create webhook settings](/webhooks/create-webhook-settings): every field, including `customHeaders`, `disabledResourceGroups`, `profileIds` and `accountIds`.
- [Webhook logs](/webhooks/get-webhook-logs): every attempt with its status code and response body.
- [Post webhooks](/webhooks/posts): the events behind a scheduled post.
- [Inbox webhooks](/webhooks/inbox): `message.received` and what it carries.
- [Multi-tenant](/multi-tenant): route events to the right customer by `profiles[].externalId`.