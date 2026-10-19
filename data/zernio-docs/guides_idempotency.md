# Idempotency & Safe Retries

Retry POST /v1/posts safely with the Idempotency-Key header, understand x-request-id retry detection and the 24-hour content-hash dedup, and use Idempotency-Key on the other write endpoints.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

Retry [`POST /v1/posts`](/posts/create-post) safely by sending an `Idempotency-Key` header. A retried request returns the original post instead of creating a second one.

Two more layers sit behind it:

- `x-request-id` retry detection.
- A content-hash dedup that rejects identical content sent to the same account within 24 hours, whatever the headers.

You need an API key and a connected account.

Network timeouts and the automatic retries in n8n, Zapier and custom queues all deliver the same create request twice. These layers make that safe.

## First call

Generate a UUID per logical post and send it as `Idempotency-Key`.

Keep it with the job that creates the post, so every retry of that job sends the same value.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import { randomUUID } from 'crypto';
import Zernio from '@zernio/node';

const zernio = new Zernio();
const idempotencyKey = randomUUID();

const { data: created } = await zernio.posts.createPost({
  headers: { 'Idempotency-Key': idempotencyKey },
  body: {
    content: 'Our January release notes are out.',
    scheduledFor: '2027-01-01T12:00:00',
    timezone: 'America/New_York',
    platforms: [{ platform: 'linkedin', accountId: '66b2e19d8c3f5a7e9d0b1c2d' }]
  }
});

const postId = created.post._id;
```
</Tab>
<Tab value="Python">
```python
import uuid
from zernio import Zernio

client = Zernio()
idempotency_key = str(uuid.uuid4())

created = client.posts.create_post(
    idempotency_key=idempotency_key,
    content="Our January release notes are out.",
    scheduled_for="2027-01-01T12:00:00",
    timezone="America/New_York",
    platforms=[{"platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d"}],
)

post_id = created["post"]["_id"]
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/posts" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 4b4986f4-77b5-4c22-a3a7-2c56f7a657e1" \
  -d '{
    "content": "Our January release notes are out.",
    "scheduledFor": "2027-01-01T12:00:00",
    "timezone": "America/New_York",
    "platforms": [{ "platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d" }]
  }'
```
</Tab>
</Tabs>

Response (`201`):

```json
{
  "message": "Post scheduled successfully",
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "status": "scheduled",
    "scheduledFor": "2027-01-01T17:00:00Z",
    "platforms": [
      { "platform": "linkedin", "status": "pending" }
    ]
  }
}
```

Send the same request again with the same `Idempotency-Key` and no new post is created. Response (`200`):

```json
{
  "message": "Post already exists (idempotent retry)",
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "status": "scheduled",
    "scheduledFor": "2027-01-01T17:00:00Z"
  }
}
```

Treat that `200` as success, since it is a replay of the first call. A newly created post is always `201`.

## How it behaves

### Layer 1: `Idempotency-Key` (24-hour window)

A retry with the same `Idempotency-Key` within 24 hours returns `200` with the original post in `post`.

The match is on the key alone, not on the body. A retry whose body differs (for example a re-uploaded media URL) still returns the original post.

It covers drafts, and a post that was saved even though the original response was a `5xx` or a timeout.

- Generate a fresh UUID (v4 is fine) per logical post, up to 255 characters. A longer key returns `400`.
- Reuse it only when retrying that exact post after a timeout, a `5xx` or a connection reset.
- Never reuse a key for a different post. That post would not be created, and the earlier one would come back instead.
- While the first request is still being processed, the retry gets `409` with `code: "idempotency_conflict"` and a `Retry-After` header. Retry after that delay to get the original post.
- If the first request failed without creating a post, the retry is processed as a new request.

Keys are scoped to your user.

The Python SDK takes the key as `idempotency_key=`. With the other SDKs, pass it as a request header.

### Layer 2: `x-request-id` retry detection (24-hour window)

A request with the same `x-request-id` as an earlier one is a retry when it also matches the earlier content fingerprint (same account, content and media URLs).

It returns `200` with the original post in `post`, instead of a duplicate-content `409`. It returns `202` with `postId` when the original is still being saved.

A request with the same `x-request-id` but different content is a new post. This layer does not protect a retry whose body changed; use `Idempotency-Key` for that.

When both headers are sent, `Idempotency-Key` wins and `x-request-id` is ignored for matching.

The official SDKs generate a unique `x-request-id` per call. The generated SDKs expose it as an explicit parameter:

- [Go](/sdks/go): `.XRequestId("<uuid>")`
- [Ruby](/sdks/ruby): `x_request_id:`
- [Java](/sdks/java): a `UUID` argument
- [.NET](/sdks/dotnet): `Guid?`
- [Python](/sdks/python), [PHP](/sdks/php) and [Rust](/sdks/rust): `x_request_id`

On a generic HTTP client, set a unique value per logical call or omit it.

<Callout type="warn">
In a workflow tool, generate a fresh UUID per HTTP node, or omit the header. Never reuse one execution-level `x-request-id` or `Idempotency-Key` across several nodes.
</Callout>

A shared value (one value for the whole run, shared by 6 platform calls) makes every call after the first look like a retry of the first. With `Idempotency-Key` each returns the first post and nothing else is created.

### Layer 3: Content-hash dedup (24-hour window)

Independently of the headers, Zernio hashes `(platform, accountId, content + media URLs)` and rejects a match from the last 24 hours with `409`. This catches the same content posted twice to the same account whatever the headers say.

It only counts content that is scheduled, publishing or published. A post whose target failed or was cancelled without publishing does not block a new post with the same content.

To post identical content again within 24 hours, change the fingerprint: the caption, the media or the account.

### Order of evaluation

1. Same `Idempotency-Key` seen in the last 24 hours: return the original post with `200` (or `409 idempotency_conflict` while it is still processing). Nothing is created.
2. Otherwise, same `x-request-id` and same content fingerprint in the last 24 hours: return the original post with `200`.
3. Otherwise, same content fingerprint seen in the last 24 hours: reject with `409` and `details.existingPostId`.
4. Otherwise, create the post.

A `429` is also safe to retry after waiting `Retry-After` seconds; see [rate limits](/guides/rate-limits).

### Other write endpoints take `Idempotency-Key`

The layers above apply to post creation. These endpoints also accept an optional `Idempotency-Key` header, a client-generated unique key such as a UUID, up to 255 characters:

- [Create profile](/profiles/create-profile)
- [Send inbox message](/messages/send-inbox-message)
- [Reply to a post's comments](/comments/reply-to-inbox-post)
- [Reply to a review](/reviews/reply-to-inbox-review)
- [Start a WhatsApp call](/whatsapp/initiate-whatsapp-call)
- [Start a voice call](/voice/create-voice-call)
- [Send SMS](/sms/send-sms)
- [Boost a post](/ad-campaigns/boost-post)
- [Create an ad](/ad-campaigns/create-standalone-ad)
- [Create a messaging ad](/messaging-ads/create-messaging-ad) (`POST /v1/ads/messaging`, and the legacy `POST /v1/ads/ctwa`)
- [Create a call ad](/messaging-ads/create-call-ad)
- The create and duplicate endpoints for [campaigns](/ad-campaigns/create-ad-campaign), [ad sets](/ad-campaigns/create-ad-set) and ads

Send the key on the first attempt, then again on the retry:

```bash
curl -i -X POST "https://zernio.com/api/v1/profiles" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 9f7c1f2e-6f0a-4a1f-9d2c-2b0a4f8e5c11" \
  -d '{ "name": "Acme Corp" }'
```

Response (`201`):

```json
{
  "message": "Profile created successfully",
  "profile": { "_id": "66a1f0c2a4b9d3e8f1a2b3c4", "name": "Acme Corp" }
}
```

Run the same command again and no second profile is created: the stored response comes back with its original status and one extra header.

```text
HTTP/2 201
Idempotent-Replayed: true
Content-Type: application/json

{ "message": "Profile created successfully", "profile": { "_id": "66a1f0c2a4b9d3e8f1a2b3c4", "name": "Acme Corp" } }
```

The same key with a different body returns `422`. A key whose first request is still processing returns `409`.

Two rules decide how you write the retry:

- **Scope.** Keys are retained for 24 hours and are scoped to your credential and to that exact path. The same key sent to a different `postId` returns `422` instead of replaying the other post's response.
- **Successes only.** Only a successful (`2xx`) response is stored for replay. A first attempt that fails releases the key, so the retry runs for real instead of replaying a failure.

So the header covers the "request succeeded, response was lost" case rather than every retry.

After an ambiguous failure (a `5xx` or a network timeout) the platform may already have accepted the message. A failure after that point releases the key as well.

Reconcile before you retry: list the conversation's messages, the post's comments or the review first. Treat an empty result as inconclusive rather than as proof nothing was sent.

The remaining write endpoints are `PUT`-style updates or cheap to check first. When in doubt, read before you write.

## If it fails

A `409` on `POST /v1/posts` means this exact content already went to this account in the last 24 hours:

```json
{
  "error": "This exact content is already scheduled, publishing, or was posted to this account within the last 24 hours.",
  "details": {
    "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
    "platform": "linkedin",
    "existingPostId": "65f1c0a9e2b5af0012ab34cd"
  }
}
```

Look up `details.existingPostId` with [`GET /v1/posts/{postId}`](/posts/get-post). Treat it as success, or surface it to the user.

If the `409` came from a retry loop, send one `Idempotency-Key` per logical post and reuse it on the retry. The retry then hits Layer 1 instead.

**`idempotency_conflict`.** A `409` with `code: "idempotency_conflict"` is different: the first request with that `Idempotency-Key` is still processing. Wait `Retry-After` seconds and send the same request again to get the original post.

## Related

- [Create post](/posts/create-post): the full idempotency contract on the operation.
- [Error handling](/guides/error-handling): the error envelope and which statuses to retry.
- [Rate limits](/guides/rate-limits): `429` and `Retry-After`.
- [Multi-tenant publishing](/multi-tenant/publishing): one key per customer request.