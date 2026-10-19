# Platform Fields

Every platformSpecificData field for Instagram, with the paid partnership label and location tags.

All fields go in `platformSpecificData` on the Instagram entry.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `contentType` | `"story"` | (feed) | `"story"` publishes a Story. Omit otherwise: single videos publish as Reels, images go to the feed. |
| `shareToFeed` | boolean | `true` | Reels only. `false` shows the Reel in the Reels tab only. |
| `collaborators` | Array\<string\> | | Up to 3 usernames of public Business or Creator accounts. Not for Stories. |
| `userTags` | Array\<\{username, x?, y?, mediaIndex?\}\> | | Images require `x`/`y` (0.0 to 1.0); Reels and videos ignore coordinates; Stories take them optionally. `mediaIndex` picks the carousel slide (0-based, default 0), video slides included. |
| `trialParams` | \{graduationStrategy\} | | Trial Reels, shown only to non-followers. `graduationStrategy` is `"MANUAL"` or `"SS_PERFORMANCE"` (auto-graduate when it performs well). |
| `thumbOffset` | number (ms) | `0` | Offset from video start to use as the Reel cover. Ignored when `instagramThumbnail` is set. |
| `instagramThumbnail` | string (URL) | | Custom Reel cover, JPEG or PNG, recommended 1080 x 1920 px. Takes priority over `thumbOffset`. Also accepted as `reelCover`. |
| `audioName` | string | | Renames the Reel's own audio (replaces "Original Audio"). Set at creation only. |
| `audioConfiguration` | \{audioId, audioVolume?, videoVolume?\} | | Catalog track for a Reel; see [Reels with catalog audio](/platforms/instagram/posts#reels-with-catalog-audio). Requires `loginMethod=facebook_login`. |
| `muteAudio` | boolean | `false` | Reels, Stories and video carousel slides; ignored for images. Instagram has no mute parameter, so Zernio strips the audio track before sending and the published video is permanently silent; if stripping fails, the post fails rather than publishing with sound. Videos above 200 MB cannot be muted. |
| `isAiGenerated` | boolean | `false` | Instagram labels the post as containing AI-generated images or video (not AI-written captions). Feed posts, Reels, Stories and carousels. |
| `isPaidPartnership` | boolean | `false` | Shows the "Paid partnership" label. Feed posts, Reels and carousels; Stories reject it at creation with a `400`. Requires `loginMethod=facebook_login`: Instagram Login accounts get a `400` with code `instagram_paid_partnership_requires_facebook_login`. Implied by `brandedContentSponsors`. See [Paid partnership label](#paid-partnership-label). |
| `brandedContentSponsors` | Array\<string\> | | Up to 2 sponsors, each an Instagram username (leading @ optional) or numeric Instagram user id, of public Business or Creator accounts. Same login and content-type rules as `isPaidPartnership`. |
| `commentsEnabled` | boolean | `true` | `false` turns comments off right after publishing (Zernio publishes first, then disables). Feed posts, Reels and carousels; ignored for Stories. Both login methods. Best-effort: if Instagram rejects the toggle, the post stays up with comments on; turn them off in the Instagram app. |
| `locationId` | string | | Numeric id of a Facebook Page that has location data, not a place name. Feed posts, Reels and the carousel as a whole; not single slides, and a Story with `locationId` is rejected at creation with a `400`. See [Location tags](#location-tags). |
| `firstComment` | string | | Posted as the first comment after publishing. Feed posts and carousels, not Stories. The place for links, because captions have none. |

## Paid partnership label

`isPaidPartnership: true` shows the label. `brandedContentSponsors` names the brand as well and turns the label on by itself:

```json
{
  "platform": "instagram",
  "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
  "platformSpecificData": { "brandedContentSponsors": ["brandpartner"] }
}
```

Zernio resolves sponsor usernames at publish time through Meta's Business Discovery API on the publishing account. A sponsor that cannot be resolved fails the post with an error naming it.

Pass the numeric id to skip the lookup.

**Brand approval.** A brand that has pre-approved you as a creator shows "Paid partnership with @brand" at once.

Otherwise the post publishes with the plain label, and the brand receives an approval request in Instagram. The name appears once they approve. No approval is needed to publish.

**Reading back.** Instagram does not return the label or the sponsors when reading the post back. Get post echoes the values you sent in `platformSpecificData`.

## Location tags

Zernio has no location search endpoint yet.

Find the Page id in Facebook (the Page's "About" section or its URL) or through Meta's Pages Search API:

```json
{
  "platform": "instagram",
  "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
  "platformSpecificData": { "locationId": "105890561436614" }
}
```

A Page that does not exist or has no location data fails the post at publish time with this error:

```
Instagram rejected locationId: the Facebook Page has no location data or does not exist.
```