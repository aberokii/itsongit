# Error Handling

The error envelope Zernio returns on a failure, its stable type and code values, HTTP statuses, and how to read and retry publishing failures.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

Almost every non-`2xx` response from the Zernio API is a flat JSON envelope with a stable `type` and `code`.

Branch on those two fields, never on the `error` text. Read `platformError` when a platform rejected the request.

You need an API key.

## The envelope

A request that leaves out a required field returns `400`:

```json
{
  "error": "budgetAmount is required",
  "type": "invalid_request_error",
  "code": "missing_required_field",
  "param": "budgetAmount"
}
```

| Field | Stable | Description |
|-------|--------|-------------|
| `error` | No | Human-readable message, reworded freely between releases. Display it; never branch on it. |
| `type` | Yes | Error class: `invalid_request_error`, `authentication_error`, `permission_error`, `not_found`, `rate_limit_error`, `platform_error` or `api_error`. |
| `code` | Yes | Machine-readable code such as `missing_required_field` or `ads_connection_required`. |
| `param` | Yes | The field or query parameter at fault, when there is one. A dotted path for nested fields (`images.square`). |
| `details` | Yes | Extra structured context when available, such as field-level validation errors. |
| `platform` | Yes | On `platform_error` only: the platform that rejected the request (`meta`, `google`, `tiktok`). |
| `platformError` | Yes | On `platform_error` only: the platform's raw payload, forwarded unchanged. |

The top-level `error` string is kept so code that reads `response.error` keeps working. The other fields are top-level siblings, never nested under `details`.

A handful of responses predate the envelope and carry `error`, sometimes with `details`, and nothing else:

- the API-key `429` on [rate limits](/guides/rate-limits#if-it-fails)
- the plan-cap `403` from `POST /v1/profiles`
- the invalid `timezone` `400` from `POST /v1/posts`

Read `code` when it is present and fall back to the status when it is not.

## Error types

| Type | Default status | When it happens |
|------|----------------|-----------------|
| `invalid_request_error` | 400 / 409 / 422 | Missing required fields, wrong types, mutually exclusive fields, invalid JSON, unmet preconditions, or an account that needs reconnecting. |
| `authentication_error` | 401 | Missing or invalid API key. |
| `permission_error` | 403, or 402 on a billing gate | The key is valid but the caller may not do this: the feature is not enabled for the team (ads on a legacy AppSumo account), the key's resource group is disabled, or billing has closed the gate. |
| `not_found` | 404 | The resource does not exist or is not accessible under this API key. |
| `rate_limit_error` | 429 | Request rate limit exceeded. See [rate limits](/guides/rate-limits). |
| `platform_error` | 502, or the platform's 4xx | A platform (Meta, Google, TikTok, LinkedIn, Pinterest, X) rejected the request. |
| `api_error` | 500 / 503 | Unexpected server-side error, or a temporarily unavailable upstream service or database. On `503 temporarily_unavailable`, respect `Retry-After` and check the outcome of a timed-out write before resubmitting. |

## Error codes

| Code | Type | Meaning |
|------|------|---------|
| `missing_required_field` | invalid_request_error | A required field is missing from the body or query. `param` names it. |
| `invalid_field_value` | invalid_request_error | A field has the wrong type, format or enum value. `param` names it. |
| `mutually_exclusive_fields` | invalid_request_error | Two incompatible fields were both sent (`creatives[]` and `adSetId`). |
| `invalid_json_body` | invalid_request_error | The body could not be parsed as JSON. |
| `missing_credentials` | authentication_error | No `Authorization` header. |
| `invalid_credentials` | authentication_error | The API key is invalid, revoked or expired. |
| `ads_addon_required` | permission_error | Ads are not enabled for the team. |
| `feature_not_available` | permission_error | The feature is not enabled for the team. |
| `insufficient_permissions` | permission_error | The caller may not run this operation. On a restricted `zrk_` key, `required_group` names the [resource group](/multi-tenant#scoped-api-keys) the key opted out of; on a dashboard user, the role does not allow the action. |
| `payment_required` | permission_error | `402`: the team has no payment method on file for an action that costs money, such as an SMS sender ID. |
| `account_not_found` | not_found | The account is unknown or not accessible. |
| `ad_not_found` | not_found | The ad is unknown or not accessible. |
| `post_not_found` | not_found | The post is unknown or not accessible. |
| `audience_not_found` | not_found | The audience is unknown or not accessible. |
| `linked_account_required` | invalid_request_error | The account is missing a required linked account (Instagram ads need a linked Facebook account). |
| `ads_connection_required` | invalid_request_error | The account exists but is inactive or needs reconnecting (returned as `409`). Stop scheduled retries for that account until it is reconnected. The code also appears on endpoint-specific connection preconditions; check the endpoint's documented status. |
| `instagram_business_account_unresolved` | invalid_request_error | The Instagram Business Account id could not be resolved from the linked Page. The user must link their Instagram to the Page in Meta Business Settings. |
| `missing_square_image` | invalid_request_error | Google Display needs both `images.landscape` and `images.square`; only one was sent. |
| `ad_not_commentable` | invalid_request_error | The ad exists but its creative format has no commentable post (Story ads, Dynamic Product Ads). Returned by `GET /v1/ads/{adId}/comments`. |
| `queue_slot_conflict` | invalid_request_error | The new `scheduledFor` is already taken by another post in the same queue. Returned by `PUT /v1/posts/{postId}` with a `409`. |
| `rate_limited` | rate_limit_error | Request rate limit exceeded on this endpoint, or the upstream platform's or service's quota is spent ([upstream `429`s](/guides/rate-limits#upstream-429s-keep-the-rate_limited-code)). Wait `Retry-After` seconds when present. |
| `platform_api_error` | platform_error | The platform rejected the call. Read `platform` and `platformError`. |
| `internal_error` | api_error | Unexpected server-side error. |
| `temporarily_unavailable` | api_error | `503`: an upstream service or database is temporarily unavailable. `Retry-After` gives the minimum delay in seconds. |

## How it behaves

### Codes are stable, messages are not

`code` values are lowercase snake_case (`invalid_field_value`), and a shipped value never changes. Build retries, alerting and translations on `type` and `code`.

New codes are added at any time. Removing or renaming one is a breaking change.

The `error` message is not stable and is reworded between releases. Never branch on it.

Some codes are UPPER_CASE and stay that way under the same stability rule.

Five are in the shared code registry:

- `INVALID_REDIRECT_URL`
- `PLATFORM_BETA_RESTRICTED`
- `PROFILE_OVER_LIMIT`
- `ACCOUNT_NOT_ENABLED_FOR_POSTING`
- `PLATFORM_DISABLED`

Others are raised by one endpoint and documented there, such as the `403` `ACCOUNT_DISCONNECTED` from `POST /v1/posts` when a target account's connection has expired.

The inbox send endpoints carry their own UPPER_CASE set (`PLATFORM_LIMITATION`, `TEMPLATE_REQUIRED`, `DIRECT_SEND_BLOCKED` and the rest, enumerated on [send inbox message](/messages/send-inbox-message)). There, `PLATFORM_NOT_SUPPORTED` is uppercase even though the same code is lowercase on other surfaces.

Compare `code` against the values the endpoint you call documents. Never lowercase it first.

### A `402` is a billing gate

A `402` comes from billing rather than from the endpoint's own validation.

The fix is a card or a plan, never a different request. Read `code`:

| Code | Where | Meaning |
|------|-------|---------|
| `PAYMENT_REQUIRED` | `POST /v1/profiles`, `GET /v1/connect/{platform}`, phone-number and WhatsApp number purchase | A gate closed before the call ran. `reason` is `free_tier_exceeded`, `twitter_passthrough` or `enterprise_required`, and `dashboard_url` is where the end user fixes it ([connect failures](/guides/connecting-accounts#if-it-fails)). |
| `analytics_addon_required` | every `/v1/analytics` endpoint | The team is on a legacy plan without analytics access. |
| `payment_required` | `POST /v1/sms/sender-ids` | No payment method on file for the carrier fees a sender ID incurs. |

`POST /v1/posts/bulk-upload` and `POST /v1/posts/{postId}/retry` also answer `402`, with `error` alone, when the team's last payment failed.

### Disconnected accounts need reconnection, not another polling cycle

A `409` with `code: "ads_connection_required"` means the account exists but is inactive or needs reconnecting. It is not a not-found response.

Stop scheduled polling and retries for that account until the customer reconnects it. Then read [`GET /v1/accounts`](/accounts/list-accounts) for its current ID before resuming.

[`POST /v1/posts/sync-external`](/analytics/sync-external-posts) uses this response for disconnected accounts too, despite the code's ads prefix.

**A `404` on an account ID** can mean the account was disconnected and removed, as well as an unknown or inaccessible ID. Re-read `GET /v1/accounts` to get the current IDs instead of continuing to poll a removed one.

### A `503` can leave a write's outcome unknown

`503` with `type: "api_error"` and `code: "temporarily_unavailable"` means an upstream service or database is temporarily unavailable.

Wait at least the number of seconds in `Retry-After` before retrying.

A timed-out write may already have completed upstream. Check the resource or platform before resubmitting.

Use the endpoint's documented [idempotency support](/guides/idempotency) where available.

Do not assume every create is safe to replay. [Meta ad-account creation](/ad-accounts/create-ad-account) is not idempotent and is never automatically retried.

### Platform errors carry the upstream payload

When a platform rejects a request, Zernio returns `platform_error` with the platform's payload in `platformError`:

```json
{
  "error": "Google rejected the ad: NOT_ENOUGH_SQUARE_MARKETING_IMAGE_ASSET",
  "type": "platform_error",
  "code": "platform_api_error",
  "platform": "google",
  "platformError": {
    "code": 3,
    "message": "Request contains an invalid argument.",
    "details": [ { "errors": [ { "errorCode": { "assetError": "NOT_ENOUGH_SQUARE_MARKETING_IMAGE_ASSET" }, "message": "Too few." } ] } ]
  }
}
```

The status is the platform's own `4xx` when the platform said the input was bad. It is `502` when the platform returned a `5xx` or no status.

Treat a forwarded `4xx` as fixable by the caller and a `502` as transient.

`platform` lets one handler branch by integration. `platformError` holds the platform's codes for retry decisions or end-user messages (for Meta: `error_subcode`, `error_user_title`, `error_user_msg`).

### 207 is a 2xx

`POST /v1/posts` with `publishNow: true`, and `POST /v1/posts/{postId}/retry`, return `207` when the post was created but at least one platform failed.

`fetch(...).ok` is `true` and axios resolves. Branch on the status code or on `post.status`.

### Publishing failures live on the post

A scheduled post that fails on a platform does not return an error envelope. The outcome lands on the post as:

- `status: "partial"`: some platforms published.
- `status: "failed"`: none did.

Each failed entry in `platforms[]` carries `errorMessage`, `errorCategory` and `errorSource`. The [post lifecycle guide](/guides/post-lifecycle#per-platform-status-and-errors) lists every category and its fix.

Retry a `failed` or `partial` post with `POST /v1/posts/{postId}/retry`. Only the failed platforms run again, and published platforms are skipped.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: retried } = await zernio.posts.retryPost({
  path: { postId: '65f1c0a9e2b5af0012ab34cd' }
});

console.log(retried.post.status);
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()

retried = client.posts.retry_post(post_id="65f1c0a9e2b5af0012ab34cd")

print(retried["post"]["status"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/posts/65f1c0a9e2b5af0012ab34cd/retry" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "message": "Post published successfully",
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "status": "published",
    "platforms": [
      {
        "platform": "instagram",
        "status": "published",
        "platformPostUrl": "https://www.instagram.com/p/C1a2B3c4D5e/"
      }
    ]
  }
}
```

### Account health catches expired tokens before you publish

Call `GET /v1/accounts/health` to see which accounts can post and which need reconnecting, instead of learning it from a failed post.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: health } = await zernio.accounts.getAllAccountsHealth();

console.log(health.summary.needsReconnect);
```
</Tab>
<Tab value="Python">
```python
health = client.accounts.get_all_accounts_health()

print(health["summary"]["needsReconnect"])
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/accounts/health" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "summary": { "total": 1, "healthy": 0, "warning": 0, "error": 1, "needsReconnect": 1 },
  "accounts": [
    {
      "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
      "platform": "instagram",
      "username": "acme",
      "status": "error",
      "canPost": false,
      "canFetchAnalytics": false,
      "tokenValid": false,
      "needsReconnect": true,
      "issues": ["Token expired"]
    }
  ]
}
```

Filter with `profileId`, `platform` or `status` (`healthy`, `warning`, `error`). The [health endpoint](/accounts/get-all-accounts-health) lists every field.

### A parameter the API does not know is ignored, not rejected

Query and body fields are camelCase (`accountId`, `profileId`, `scheduledFor`, `publishNow`).

Unknown keys are dropped instead of rejected. A snake_case spelling goes through as if the parameter had not been sent:

- `GET /v1/accounts?profile_id=...` returns every account in the team instead of one profile's.
- A `scheduled_for` in a create-post body leaves the post as a draft.

When a filter seems to have no effect, check the response body, not only the status.

The few snake_case names that do exist are spelled that way in the reference:

- `redirect_url` on the [connect endpoints](/connect/get-connect-url)
- `restrict_sr` on Reddit search
- the filters on [`GET /v1/logs`](/logs/list-logs)

### Log the whole envelope

When you log an error, keep the request body and the entire response envelope, including `platformError`.

Respect `Retry-After` on `429` and `503 temporarily_unavailable`.

Check a timed-out write's outcome before resubmitting, using the endpoint's documented [idempotency support](/guides/idempotency) where available.

Post status changes arrive on [webhooks](/webhooks) instead of polling.

## Related

- [Post lifecycle](/guides/post-lifecycle): statuses, `errorCategory` and what each state allows.
- [Rate limits](/guides/rate-limits): the `429` body and headers.
- [Idempotency & safe retries](/guides/idempotency): retry a create without a duplicate.
- [Webhooks](/webhooks): delivery guarantees and retries.
- [Account health](/accounts/get-all-accounts-health): the full response.
- [Reporting bugs and missing features](/guides/feedback): when the error looks like ours, tell us with `POST /v1/feedback`.