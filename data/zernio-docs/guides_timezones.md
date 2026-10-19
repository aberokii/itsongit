# Timezones & Scheduling

Schedule a post at a local wall-clock time with scheduledFor and timezone, and read back the UTC instant Zernio stores.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

`scheduledFor` with a `Z` or an offset is an absolute instant.

Without one, Zernio reads it as local time in the `timezone` field, which defaults to `UTC`.

Posts that publish at the wrong hour are local times sent without a `timezone`.

## First call

To schedule a post at 9:00 in the user's timezone, pass the wall-clock time they picked and their IANA timezone.

In a browser, `Intl.DateTimeFormat().resolvedOptions().timeZone` returns it.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: scheduled } = await zernio.posts.createPost({
  body: {
    content: 'Good morning from the Zernio API.',
    platforms: [{ platform: 'instagram', accountId: '66b2e19d8c3f5a7e9d0b1c2d' }],
    scheduledFor: '2027-01-01T09:00:00',
    timezone: 'America/New_York',
  },
});

console.log(scheduled.post.scheduledFor);
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()

scheduled = client.posts.create_post(
    content="Good morning from the Zernio API.",
    platforms=[{"platform": "instagram", "accountId": "66b2e19d8c3f5a7e9d0b1c2d"}],
    scheduled_for="2027-01-01T09:00:00",
    timezone="America/New_York",
)

print(scheduled["post"]["scheduledFor"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/posts" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Good morning from the Zernio API.",
    "platforms": [{ "platform": "instagram", "accountId": "66b2e19d8c3f5a7e9d0b1c2d" }],
    "scheduledFor": "2027-01-01T09:00:00",
    "timezone": "America/New_York"
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
    "scheduledFor": "2027-01-01T14:00:00Z",
    "timezone": "America/New_York",
    "platforms": [
      { "platform": "instagram", "status": "pending" }
    ]
  }
}
```

## How it behaves

### Zernio reads `scheduledFor` in `timezone` only when it has no zone

[Create post](/posts/create-post) reads `scheduledFor` like this:

| You send | Interpreted as |
|----------|---------------|
| `"2027-01-01T10:00:00Z"` | Absolute UTC instant. `timezone` is ignored. |
| `"2027-01-01T10:00:00+01:00"` | Absolute instant with an explicit offset. `timezone` is ignored. |
| `"2027-01-01T10:00:00"` (no zone) | Local wall-clock time in the request's `timezone` (IANA name, default `UTC`). |
| `"2027-03-14T02:30:00"` with `timezone: "America/New_York"`, a local time the spring-forward skips | Accepted, not rejected. Zernio applies the offset that zone is in at 02:30 UTC that day, `-05:00`, and stores `2027-03-14T07:30:00Z`, which is 03:30 local. |
| `"2027-11-07T01:30:00"` with `timezone: "America/New_York"`, a local time the fall-back repeats | Accepted. The same rule applies `-04:00` and stores `2027-11-07T05:30:00Z`, the first of the two 01:30s. |

These 3 requests schedule the same instant:

```json
{ "scheduledFor": "2027-01-01T09:00:00Z" }
{ "scheduledFor": "2027-01-01T10:00:00+01:00" }
{ "scheduledFor": "2027-01-01T10:00:00", "timezone": "Europe/Madrid" }
```

**No `timezone`.** A local time with no `timezone` is read as UTC.

A user who picked 10:00 in Madrid and whose request carries only `"scheduledFor": "2027-01-01T10:00:00"` gets a post at 10:00 UTC. That is 11:00 in Madrid.

**Past times.** A `scheduledFor` already in the past is published synchronously in the same request.

**DST days.** Neither DST case is an error, and neither follows a gap or repeat rule. The offset comes from reading your wall-clock time as UTC.

So a local time on a DST change day can resolve an hour from the one you meant. Send `Z` or an explicit offset when you schedule on one.

### Zernio returns times in UTC

`scheduledFor` and `publishedAt` come back as UTC ISO 8601 with a `Z`, whatever you sent.

Convert to the viewer's timezone when you display them.

### Queue slots follow the queue's timezone

A [queue](/guides/queue-scheduling) carries its own `timezone`, independent of any post-level field.

Each slot is a day of week plus a wall-clock time in that timezone:

```json
{
  "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
  "name": "Evening posts",
  "timezone": "America/New_York",
  "slots": [
    { "dayOfWeek": 1, "time": "18:00" },
    { "dayOfWeek": 3, "time": "18:00" },
    { "dayOfWeek": 5, "time": "18:00" }
  ]
}
```

`dayOfWeek` is `0` (Sunday) through `6` (Saturday). `time` is `HH:mm` in the queue's timezone.

Slots track the local wall clock through DST changes. An 18:00 New York slot stays at 18:00 New York time all year, while its UTC instant moves by an hour.

A post created with `queuedFromProfile` gets its `scheduledFor` from the next free slot, so you send no time at all.

### A per-platform `scheduledFor` overrides the root one

Each entry in `platforms[]` accepts its own `scheduledFor`, so the same post can go out at different times per platform.

A root `timezone` applies to the overrides too. The LinkedIn entry below publishes at 09:00 New York time and the Instagram one at 18:00 the same day:

```json
{
  "content": "Our January release notes are out.",
  "scheduledFor": "2027-01-01T09:00:00",
  "timezone": "America/New_York",
  "platforms": [
    { "platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d" },
    {
      "platform": "instagram",
      "accountId": "66b2e19d8c3f5a7e9d0b1c2e",
      "scheduledFor": "2027-01-01T18:00:00"
    }
  ]
}
```

An override written as an absolute time (`Z` or an offset) is taken as it stands, whatever `timezone` says.

## If it fails

A `400` on `POST /v1/posts` means `timezone` is not an IANA name Zernio recognizes, such as `Europe/Madird`:

```json
{
  "error": "Invalid timezone provided"
}
```

Send a canonical IANA name (`Europe/Madrid`, `America/New_York`). The check runs only when `scheduledFor` is set.

This response predates the error envelope and carries no `type` or `code`.

`POST /v1/queue/slots` validates the same field through the envelope instead, with `code: "invalid_field_value"` and `param: "timezone"`.

## Related

- [Queue scheduling](/guides/queue-scheduling): recurring local-time slots per profile.
- [Post lifecycle](/guides/post-lifecycle): what happens between `scheduled` and `published`.
- [Create post](/posts/create-post): every field, including per-platform `scheduledFor`.