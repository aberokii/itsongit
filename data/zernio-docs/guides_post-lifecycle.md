# Post Lifecycle

Every post status, how a post moves between them, what you can do in each state, and which webhook fires on each transition.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

A post is `draft`, `scheduled` or `publishing`, then `published`, `partial` or `failed`. It becomes `cancelled` once every platform copy has been removed.

Read `post.status` with `GET /v1/posts/{postId}`. Or let a [post webhook](/webhooks/posts) tell you when it changes.

The status names what you can still do with the post and which event to expect next.

```
draft ──► scheduled ──► publishing ──► published
                            │      └──► partial
                            └─────────► failed
published / partial ──► cancelled   (via unpublish)
```

## First call

Call `GET /v1/posts/{postId}`.

The post-level `status` is an aggregate. Each entry in `platforms[]` carries its own.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: fetched } = await zernio.posts.getPost({
  path: { postId: '65f1c0a9e2b5af0012ab34cd' }
});

console.log(fetched.post.status);
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()

fetched = client.posts.get_post(post_id="65f1c0a9e2b5af0012ab34cd")

print(fetched["post"]["status"])
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/posts/65f1c0a9e2b5af0012ab34cd" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "status": "partial",
    "scheduledFor": "2027-01-01T17:00:00Z",
    "platforms": [
      {
        "platform": "linkedin",
        "status": "published",
        "platformPostUrl": "https://www.linkedin.com/feed/update/urn:li:share:7123456789012345678"
      },
      {
        "platform": "instagram",
        "status": "failed",
        "errorMessage": "Media processing failed: video too short for Reels",
        "errorCategory": "user_content",
        "errorSource": "user"
      }
    ]
  }
}
```

## Post statuses

| Status | Meaning |
|--------|---------|
| `draft` | Saved and not going anywhere. The default when you send no scheduling field. |
| `scheduled` | Has a future `scheduledFor`, set by you or assigned by a [queue](/guides/queue-scheduling). Picked up at that time. |
| `publishing` | Being delivered to the platforms. Transient. |
| `published` | Every platform target succeeded. |
| `partial` | Some platform targets succeeded, others failed. |
| `failed` | Every platform target failed. |
| `cancelled` | Publishing was cancelled, or every platform copy was removed with [unpublish](/posts/unpublish-post). A cancelled post can be edited and rescheduled like a draft. |

## Which status a new post gets

[Create post](/posts/create-post) sets the initial status from the scheduling fields:

| You send | Initial status |
|----------|----------------|
| `publishNow: true` | Published in the same request. The response already carries the terminal result (`published`, `partial` or `failed`) with `platformPostUrl` per platform. |
| `scheduledFor` | `scheduled`. A time already in the past publishes in the same request, like `publishNow`. |
| `queuedFromProfile` | `scheduled`, with `scheduledFor` assigned from the profile's next free queue slot. |
| `isDraft: true`, or none of the above | `draft`. `isDraft` wins over `publishNow` and `scheduledFor`. |

`publishNow` returns `201` when every platform published and `207` when at least one failed.

`207` is a `2xx`: `fetch(...).ok` is `true` and axios resolves. Branch on the status code or on `post.status`, never on "did it throw".

## Per-platform status and errors

Each entry in `platforms[]` has a `status` of `pending`, `processing`, `uploading`, `published`, `failed` or `cancelled`. It also has `platformPostUrl` once published.

**Removed posts.** A published entry that later disappears from the platform keeps `status: "published"` and gets `removedFromPlatformAt`. Detection runs with the analytics sync, so expect up to a few hours of lag.

**Failed entries.** A failed entry carries a human-readable `errorMessage` and two machine-readable fields:

| `errorCategory` | Meaning | Fix |
|-----------------|---------|-----|
| `auth_expired` | Token expired or revoked | Have the user reconnect the account. [Account health](/accounts/get-all-accounts-health) catches this early. |
| `user_content` | Content violates platform constraints (format, length, media specs) | Fix the content. See [platform requirements](/platforms). |
| `user_abuse` | Platform rate limits or spam detection | Slow down. See [rate limits](/guides/rate-limits). |
| `platform_rate_limit` | Platform throttling | Retried automatically. |
| `quota_exhausted` | Shared daily API quota empty | Publishing resumes at the platform's quota reset. |
| `account_issue` | Account configuration problem, such as the wrong account type | Fix the account setup on the platform. |
| `platform_rejected` | Platform rejected for policy reasons | Change the content. |
| `platform_error` | Platform `5xx` or maintenance | Transient. Retry later. |
| `system_error` | Zernio-side issue (rare) | Retry, or contact support if it persists. |
| `unknown` | Unclassified | Inspect `errorMessage`. |

`errorSource` (`user`, `platform`, `system`) says who can fix it.

- `user` errors need action from you or your user.
- `platform` and `system` errors are worth retrying.

## What you can do in each state

| Operation | Allowed states | Notes |
|-----------|---------------|-------|
| [Update](/posts/update-post) | `draft`, `scheduled`, `failed`, `partial`, `cancelled` | A published post can only have its recycling config updated. |
| [Delete](/posts/delete-post) | Any except `published` | Removes the Zernio record. Deleting a `published` post returns `400`; use [unpublish](/posts/unpublish-post) to take it down from the platform. |
| [Retry](/posts/retry-post) | `failed`, `partial` | Only the failed platforms are retried; published platforms are skipped. |
| [Unpublish](/posts/unpublish-post) | `published`, `partial` | Deletes the post from one platform. Supported on Threads, Facebook, X, LinkedIn, YouTube, Pinterest, Reddit, Bluesky, Google Business Profile and Telegram. The post becomes `cancelled` once every platform entry is removed; with published entries left it becomes `partial`. YouTube deletion is permanent. |
| [Edit published](/posts/edit-post) | `published` | Text only; media cannot change. Supported on X (platform value `twitter`), Discord, Facebook, Reddit, LinkedIn, Telegram, Pinterest, Google Business Profile, YouTube and Slack, each with its own rules: X requires X Premium and a 1-hour window, Pinterest edits are gated behind a Pinterest closed beta. Instagram, Threads, TikTok, Snapchat, WhatsApp and Bluesky expose no edit API. |

## Tracking transitions with webhooks

Each transition fires a [post webhook](/webhooks/posts):

| Event | Fires when |
|-------|-----------|
| `post.scheduled` | A post enters the scheduled state (created with a schedule, queued, promoted from draft, or retried) |
| `post.published` | All platforms succeeded |
| `post.partial` | Some platforms succeeded, some failed |
| `post.failed` | All platforms failed |
| `post.cancelled` | A publishing job is cancelled |
| `post.recycled` | A recycled post is re-queued |
| `post.platform.published` / `post.platform.failed` | Per platform target, as soon as that platform reaches a terminal state, without waiting for the others |
| `post.tiktok.url_resolved` | A published TikTok post's public URL becomes available (TikTok resolves URLs asynchronously) |
| `post.platform.deleted` | A published platform target is later detected as deleted on the platform (poll-driven, roughly hourly) |

The per-platform events are the fastest signal. A post targeting 5 platforms emits them one by one as each platform finishes, while the aggregate event waits for all 5.

For `publishNow: true` you need no webhook. The create response is synchronous and already holds the per-platform results and URLs.

## If it fails

A `400` on `DELETE /v1/posts/{postId}` means the post is `published`:

```json
{
  "error": "Published posts cannot be deleted",
  "type": "invalid_request_error",
  "code": "invalid_resource_state"
}
```

Take the post down from each platform with [unpublish](/posts/unpublish-post) first.

Or leave it and delete nothing. The record stays as the source of `platformPostUrl` and analytics.

## Related

- [Error handling](/guides/error-handling): the error envelope and the retry endpoint.
- [Idempotency & safe retries](/guides/idempotency): avoid double-posting when you retry creates.
- [Queue scheduling](/guides/queue-scheduling): let Zernio assign the publish time.
- [Post webhooks](/webhooks/posts): the payload of each event above.