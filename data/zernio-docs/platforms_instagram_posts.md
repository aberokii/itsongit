# Posts, Stories & Reels

Publish a feed post, a carousel, a Story or a Reel to Instagram, including Reels that use catalog audio.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

A plain post becomes a feed post when the media is an image, and a Reel when it is a single video.

Fields in `platformSpecificData` on the Instagram entry select Stories and change Reel behaviour.

## Feed post

A single image or video in the main feed; no `contentType` is needed.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: published } = await zernio.posts.createPost({
  body: {
    content: 'Golden hour at the pier #photography',
    mediaItems: [
      { type: 'image', url: 'https://cdn.example.com/pier.jpg' }
    ],
    platforms: [
      { platform: 'instagram', accountId: '66b2e19d8c3f5a7e9d0b1c2d' }
    ],
    publishNow: true
  }
});

console.log(published.post.platforms[0].platformPostUrl);
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()

published = client.posts.create_post(
    content="Golden hour at the pier #photography",
    media_items=[
        {"type": "image", "url": "https://cdn.example.com/pier.jpg"}
    ],
    platforms=[
        {"platform": "instagram", "accountId": "66b2e19d8c3f5a7e9d0b1c2d"}
    ],
    publish_now=True
)

print(published["post"]["platforms"][0]["platformPostUrl"])
```
</Tab>
<Tab value="curl">
```bash
curl -X POST https://zernio.com/api/v1/posts \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Golden hour at the pier #photography",
    "mediaItems": [
      {"type": "image", "url": "https://cdn.example.com/pier.jpg"}
    ],
    "platforms": [
      {"platform": "instagram", "accountId": "66b2e19d8c3f5a7e9d0b1c2d"}
    ],
    "publishNow": true
  }'
```
</Tab>
</Tabs>

Response (`201`):

```json
{
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "status": "published",
    "platforms": [
      {
        "platform": "instagram",
        "status": "published",
        "platformPostUrl": "https://www.instagram.com/p/DGx7Yk2ScAb/"
      }
    ]
  }
}
```

Every sample below changes only the `mediaItems` or the `platforms` entry of this request.

## Carousel

Up to 10 items, images and videos mixed. All items share the aspect ratio of the first item:

```json
"mediaItems": [
  { "type": "image", "url": "https://cdn.example.com/photo1.jpg" },
  { "type": "image", "url": "https://cdn.example.com/photo2.jpg" },
  { "type": "video", "url": "https://cdn.example.com/clip.mp4" },
  { "type": "image", "url": "https://cdn.example.com/photo3.jpg" }
]
```

## Story

`contentType: "story"` publishes a Story. Stories disappear after 24 hours, show no caption, and get no link sticker through Instagram's Graph API:

```json
{
  "platform": "instagram",
  "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
  "platformSpecificData": { "contentType": "story" }
}
```

## Reel

A single video publishes as a Reel with no `contentType`. `shareToFeed` (default `true`) controls whether it also appears on the main feed:

```json
{
  "platform": "instagram",
  "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
  "platformSpecificData": { "shareToFeed": false }
}
```

## Reels with catalog audio

`audioConfiguration` attaches a licensed music track or an original sound from Instagram's audio catalog to a Reel.

It requires Facebook Login. Accounts connected with Instagram Login get a `400` with code `instagram_audio_requires_facebook_login` until reconnected with `loginMethod=facebook_login`.

Find an `audioId` with [Search Instagram audio](/instagram/search-instagram-audio); omit `q` to get what is trending:

```bash
curl -G "https://zernio.com/api/v1/accounts/66b2e19d8c3f5a7e9d0b1c2d/instagram/audio" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -d "audioType=music" \
  -d "q=summer"
```

Response (`200`):

```json
{
  "audio": [
    {
      "audioId": "482851939985510",
      "title": "Summer Nights",
      "audioType": "music",
      "durationInMs": 182000,
      "displayArtist": "The Example Band",
      "downloadUrl": "https://scontent.cdninstagram.com/o1/v/t2/f2/m86/482851939985510.mp4"
    }
  ]
}
```

Original sounds carry `igUsername` instead of `displayArtist`.

`downloadUrl` is a preview that Meta expires after roughly 1.5 days. `GET /v1/accounts/{accountId}/instagram/audio/{audioId}` refreshes it and re-validates a stored id before a scheduled publish.

Attach the track:

```json
{
  "platform": "instagram",
  "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
  "platformSpecificData": {
    "audioConfiguration": {
      "audioId": "482851939985510",
      "audioVolume": 80,
      "videoVolume": 100
    }
  }
}
```

Volumes are integers from 0 to 100, default 100. `videoVolume: 0` mutes the video's own sound.

Stories, images and carousels reject `audioConfiguration` at creation.

**Track unavailable.** If the track becomes unavailable between scheduling and publish time (removed, region-blocked, licensing change), the post fails with an error naming the cause. It does not publish with different audio.

Resubmit with another track or without `audioConfiguration`.

`audioName` is unrelated: it renames the video's own ("original") audio.