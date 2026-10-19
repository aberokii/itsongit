# Queue Scheduling

Give a profile recurring posting slots and create posts with queuedFromProfile so each one lands on the next free slot.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

By the end of this page, a profile has recurring posting slots. Every post you create with `queuedFromProfile` lands on the next free one, in order.

You need an API key, a profile id ([create a profile](/profiles/create-profile)) and a connected account.

This is how to drip-feed 50 posts without computing 50 values of `scheduledFor`.

## Step 1: Create a queue

Call `POST /v1/queue/slots` with `profileId`, `name`, `timezone` and `slots`.

Each slot is a `dayOfWeek` (0 is Sunday, 6 is Saturday) and a 24-hour `time`.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4';

const { data: queue } = await zernio.queue.createQueueSlot({
  body: {
    profileId,
    name: 'Weekday mornings',
    timezone: 'America/New_York',
    slots: [
      { dayOfWeek: 1, time: '09:00' },
      { dayOfWeek: 3, time: '09:00' },
      { dayOfWeek: 5, time: '09:00' }
    ]
  }
});

const queueId = queue.schedule._id;
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()
profile_id = "66a1f0c2a4b9d3e8f1a2b3c4"

queue = client.queue.create_queue_slot(
    profile_id=profile_id,
    name="Weekday mornings",
    timezone="America/New_York",
    slots=[
        {"dayOfWeek": 1, "time": "09:00"},
        {"dayOfWeek": 3, "time": "09:00"},
        {"dayOfWeek": 5, "time": "09:00"},
    ],
)

queue_id = queue["schedule"]["_id"]
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/queue/slots" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
    "name": "Weekday mornings",
    "timezone": "America/New_York",
    "slots": [
      { "dayOfWeek": 1, "time": "09:00" },
      { "dayOfWeek": 3, "time": "09:00" },
      { "dayOfWeek": 5, "time": "09:00" }
    ]
  }'
```
</Tab>
</Tabs>

Response (`201`):

```json
{
  "success": true,
  "schedule": {
    "_id": "66d5e3bf9a1c2d4e6f7a8b9c",
    "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
    "name": "Weekday mornings",
    "timezone": "America/New_York",
    "slots": [
      { "dayOfWeek": 1, "time": "09:00" },
      { "dayOfWeek": 3, "time": "09:00" },
      { "dayOfWeek": 5, "time": "09:00" }
    ],
    "active": true,
    "isDefault": true
  },
  "nextSlots": [
    "2027-01-04T09:00:00-05:00",
    "2027-01-06T09:00:00-05:00"
  ]
}
```

`GET /v1/queue/slots?profileId=...` returns the default queue and its next slots. Add `all=true` to list every queue on the profile.

The [queue endpoints](/queue/list-queue-slots) also update and delete slots.

## Step 2: Create a post with `queuedFromProfile`

Call `POST /v1/posts` with `queuedFromProfile` set to the profile id and no `scheduledFor`. Zernio locks the next free slot and assigns it.

Repeat the call for each post in the batch. Every post takes the slot after the previous one.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: queued } = await zernio.posts.createPost({
  body: {
    content: 'Post 1 of 50',
    platforms: [
      { platform: 'linkedin', accountId: '66b2e19d8c3f5a7e9d0b1c2d' }
    ],
    queuedFromProfile: profileId
  }
});

console.log(queued.post.scheduledFor);
```
</Tab>
<Tab value="Python">
```python
queued = client.posts.create_post(
    content="Post 1 of 50",
    platforms=[
        {"platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d"}
    ],
    queued_from_profile=profile_id,
)

print(queued["post"]["scheduledFor"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/posts" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Post 1 of 50",
    "platforms": [
      { "platform": "linkedin", "accountId": "66b2e19d8c3f5a7e9d0b1c2d" }
    ],
    "queuedFromProfile": "66a1f0c2a4b9d3e8f1a2b3c4"
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
    "content": "Post 1 of 50",
    "status": "scheduled",
    "scheduledFor": "2027-01-04T14:00:00Z",
    "timezone": "America/New_York",
    "queuedFromProfile": "66a1f0c2a4b9d3e8f1a2b3c4",
    "queueId": "66d5e3bf9a1c2d4e6f7a8b9c",
    "platforms": [
      { "platform": "linkedin", "status": "pending" }
    ]
  }
}
```

**Several queues.** A profile can have more than one. Run Step 1 again with the same `profileId` and a different `name` to add one.

The first queue a profile gets is its default. Every later one is not, until a `PUT /v1/queue/slots` with `setAsDefault: true` moves the flag.

Pass `queueId` next to `queuedFromProfile` to target a specific queue. Without it, the post goes to the profile's default queue.

## Step 3: Preview the next slot

To show a user when their post would go out, call `GET /v1/queue/next-slot` with `profileId`. Add `queueId` for a specific queue.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: next } = await zernio.queue.getNextQueueSlot({
  query: { profileId }
});

console.log(next.nextSlot);
```
</Tab>
<Tab value="Python">
```python
next_slot = client.queue.get_next_queue_slot(profile_id=profile_id)

print(next_slot["nextSlot"])
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/queue/next-slot?profileId=66a1f0c2a4b9d3e8f1a2b3c4" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
  "nextSlot": "2027-01-06T09:00:00-05:00",
  "timezone": "America/New_York",
  "queueId": "66d5e3bf9a1c2d4e6f7a8b9c",
  "queueName": "Weekday mornings"
}
```

<Callout type="warn">
Do not pass `nextSlot` as `scheduledFor`. That skips the queue lock, so 2 concurrent creates can land on the same slot.

Schedule queue posts with `queuedFromProfile` and let Zernio assign the time.
</Callout>

## If it fails

A `409` on `PUT /v1/posts/{postId}` means the new `scheduledFor` is already taken by another post in the same queue:

```json
{
  "error": "This time slot is already taken in this queue. Choose a different time, send queuedFromProfile without scheduledFor to let the queue assign the next open slot, or send queueId: null to schedule this post outside the queue.",
  "type": "invalid_request_error",
  "code": "queue_slot_conflict",
  "param": "scheduledFor"
}
```

To fix it, pick one:

- Pick a free time.
- Drop `scheduledFor` so the queue assigns the next open slot.
- Send `queueId: null` to schedule the post outside the queue.

**Next slot errors.** `GET /v1/queue/next-slot` answers:

- `404` when the profile has no queue or no slot is free.
- `400` when the queue is inactive (`active: false`) or a parameter is invalid.

**Malformed slot.** `POST /v1/queue/slots` answers `400`. `time` must match `HH:mm` and `dayOfWeek` must be 0 to 6.

The [queue endpoints](/queue/list-queue-slots) list every response.

## Related

- [Create post](/posts/create-post): every field, including `queueId`.
- [Queue endpoints](/queue/list-queue-slots): list, update and delete slots.
- [Post lifecycle](/guides/post-lifecycle): what `scheduled` means and which webhook fires next.
- [Timezones](/guides/timezones): how `timezone` is read.