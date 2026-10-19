# Platform Settings

How platformSpecificData and the root-level tiktokSettings and facebookSettings objects resolve on POST /v1/posts, and which value wins when both are set.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

When you finish this page you can set per-platform options in one `POST /v1/posts` call. You can also say which value wins when the same option is set in two places.

You need an API key and a connected account.

Options go in `platformSpecificData` on a `platforms[]` entry. The fields each platform accepts are listed under "Platform fields" on its [platform page](/platforms).

The [create post reference](/posts/create-post) carries all 15 platform schemas, Discord and Slack included.

## First call

One field on one platform: an Instagram post that leaves its links in the first comment.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: created } = await zernio.posts.createPost({
  body: {
    content: 'Golden hour at the pier.',
    mediaItems: [{ url: 'https://cdn.example.com/pier.jpg', type: 'image' }],
    platforms: [
      {
        platform: 'instagram',
        accountId: '66b2e19d8c3f5a7e9d0b1c2e',
        platformSpecificData: { firstComment: 'Docs link in bio.' }
      }
    ],
    scheduledFor: '2027-01-01T12:00:00',
    timezone: 'America/New_York'
  }
});

console.log(created.post.status);
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()

created = client.posts.create_post(
    content="Golden hour at the pier.",
    media_items=[{"url": "https://cdn.example.com/pier.jpg", "type": "image"}],
    platforms=[
        {
            "platform": "instagram",
            "accountId": "66b2e19d8c3f5a7e9d0b1c2e",
            "platformSpecificData": {"firstComment": "Docs link in bio."},
        }
    ],
    scheduled_for="2027-01-01T12:00:00",
    timezone="America/New_York",
)

print(created["post"]["status"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/posts" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Golden hour at the pier.",
    "mediaItems": [{ "url": "https://cdn.example.com/pier.jpg", "type": "image" }],
    "platforms": [
      {
        "platform": "instagram",
        "accountId": "66b2e19d8c3f5a7e9d0b1c2e",
        "platformSpecificData": { "firstComment": "Docs link in bio." }
      }
    ],
    "scheduledFor": "2027-01-01T12:00:00",
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
    "scheduledFor": "2027-01-01T17:00:00Z",
    "platforms": [
      { "platform": "instagram", "status": "pending" }
    ]
  }
}
```

## Several platforms in one call

One post goes to three platforms:

- X (platform value `twitter`) as a thread
- Instagram with a first comment
- TikTok with the consent flags TikTok requires

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: launch } = await zernio.posts.createPost({
  body: {
    content: 'Our API launch, in 3 posts.',
    mediaItems: [{ url: 'https://cdn.example.com/launch.mp4', type: 'video' }],
    platforms: [
      {
        platform: 'twitter',
        accountId: '66b2e19d8c3f5a7e9d0b1c2d',
        platformSpecificData: {
          threadItems: [
            { content: 'Our API launch, in 3 posts.' },
            { content: '1/ Authentication is one API key.' },
            { content: '2/ Your first post is one call.' }
          ]
        }
      },
      {
        platform: 'instagram',
        accountId: '66b2e19d8c3f5a7e9d0b1c2e',
        platformSpecificData: { firstComment: 'Docs link in bio.' }
      },
      { platform: 'tiktok', accountId: '66b2e19d8c3f5a7e9d0b1c2f' }
    ],
    tiktokSettings: {
      privacy_level: 'PUBLIC_TO_EVERYONE',
      allow_comment: true,
      allow_duet: true,
      allow_stitch: true,
      content_preview_confirmed: true,
      express_consent_given: true
    },
    scheduledFor: '2027-01-01T12:00:00',
    timezone: 'America/New_York'
  }
});

console.log(launch.post.status);
```
</Tab>
<Tab value="Python">
```python
launch = client.posts.create_post(
    content="Our API launch, in 3 posts.",
    media_items=[{"url": "https://cdn.example.com/launch.mp4", "type": "video"}],
    platforms=[
        {
            "platform": "twitter",
            "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
            "platformSpecificData": {
                "threadItems": [
                    {"content": "Our API launch, in 3 posts."},
                    {"content": "1/ Authentication is one API key."},
                    {"content": "2/ Your first post is one call."},
                ]
            },
        },
        {
            "platform": "instagram",
            "accountId": "66b2e19d8c3f5a7e9d0b1c2e",
            "platformSpecificData": {"firstComment": "Docs link in bio."},
        },
        {"platform": "tiktok", "accountId": "66b2e19d8c3f5a7e9d0b1c2f"},
    ],
    tiktok_settings={
        "privacy_level": "PUBLIC_TO_EVERYONE",
        "allow_comment": True,
        "allow_duet": True,
        "allow_stitch": True,
        "content_preview_confirmed": True,
        "express_consent_given": True,
    },
    scheduled_for="2027-01-01T12:00:00",
    timezone="America/New_York",
)

print(launch["post"]["status"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/posts" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Our API launch, in 3 posts.",
    "mediaItems": [{ "url": "https://cdn.example.com/launch.mp4", "type": "video" }],
    "platforms": [
      {
        "platform": "twitter",
        "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
        "platformSpecificData": {
          "threadItems": [
            { "content": "Our API launch, in 3 posts." },
            { "content": "1/ Authentication is one API key." },
            { "content": "2/ Your first post is one call." }
          ]
        }
      },
      {
        "platform": "instagram",
        "accountId": "66b2e19d8c3f5a7e9d0b1c2e",
        "platformSpecificData": { "firstComment": "Docs link in bio." }
      },
      { "platform": "tiktok", "accountId": "66b2e19d8c3f5a7e9d0b1c2f" }
    ],
    "tiktokSettings": {
      "privacy_level": "PUBLIC_TO_EVERYONE",
      "allow_comment": true,
      "allow_duet": true,
      "allow_stitch": true,
      "content_preview_confirmed": true,
      "express_consent_given": true
    },
    "scheduledFor": "2027-01-01T12:00:00",
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
    "scheduledFor": "2027-01-01T17:00:00Z",
    "platforms": [
      { "platform": "twitter", "status": "pending" },
      { "platform": "instagram", "status": "pending" },
      { "platform": "tiktok", "status": "pending" }
    ]
  }
}
```

<Callout type="warn">
The TikTok entry above publishes only because `content_preview_confirmed` and `express_consent_given` are `true` and `privacy_level` is one of the values TikTok returns for that account in [creator info](/accounts/get-tiktok-creator-info). TikTok has no defaults for these three.
</Callout>

## How it behaves

### `platformSpecificData` belongs to one platform entry

The `platform` value on the same entry chooses the shape of `platformSpecificData`. One key can mean different things on two entries of the same request.

A field that lands anywhere else, such as the root of the body or the wrong entry, is ignored. The post is still created and the `201` response names the ignored field in `warnings`.

```json
{
  "message": "Post scheduled successfully",
  "post": { "_id": "65f1c0a9e2b5af0012ab34cd", "status": "scheduled" },
  "warnings": [
    "Ignored root-level \"platformSpecificData\": it is only read per platform, as platforms[].platformSpecificData."
  ]
}
```

Three siblings on the entry override the top-level request instead of the platform:

- `customContent` replaces `content`.
- `customMedia` replaces `mediaItems` ([media uploads](/guides/media-uploads)).
- A per-platform `scheduledFor` replaces the top-level scheduled time.

### Root-level settings merge in and lose ties

Two namespaces can be sent at the root of the body instead of repeated on every entry: `tiktokSettings` and `facebookSettings`.

Zernio merges each into every entry of that platform. It writes it to `platformSpecificData.tiktokSettings` or `platformSpecificData.facebookSettings`.

The merge runs key by key and the entry wins. A key set on the entry keeps its value, and a key set only at the root is copied in.

Facebook's `draft`, `carouselCards` and colored-background options live only inside the `facebookSettings` namespace. Every other Facebook field sits directly on `platformSpecificData`.

TikTok is read from both shapes. The nested `platformSpecificData.tiktokSettings` object is read first, then any TikTok field written flat on `platformSpecificData`, which overrides the nested value.

Names are accepted in snake_case and camelCase (`privacy_level`, `privacyLevel`).

### An update replaces a whole namespace

On [`PUT /v1/posts/{postId}`](/posts/update-post) a `<platform>Settings` namespace you leave out is kept from the stored post.

One you send replaces the stored namespace whole. It is not deep-merged, so send every key you want to keep.

A root-level namespace sent without a `platforms` array returns `400`.

## If it fails

A `400` means a field in `platformSpecificData` has a value the platform does not accept. `code` and `param` name the field:

```json
{
  "error": "userTags[0].x must be between 0 and 1",
  "type": "invalid_request_error",
  "code": "invalid_field_value",
  "param": "platforms[1].platformSpecificData.userTags[0].x"
}
```

Fix the named field and send the request again. A `400` creates nothing.

The [error handling guide](/guides/error-handling) describes the envelope.

## Related

- [Create post](/posts/create-post): every field for every platform, including Discord and Slack.
- [Platforms](/platforms): what each platform does with these fields, and its media limits.
- [Media uploads](/guides/media-uploads): `mediaItems`, `customMedia` and thumbnails.
- [Post lifecycle](/guides/post-lifecycle): per-platform status after publishing.