# Analytics

Which analytics metrics Instagram returns for posts and for Stories.

Call `GET /v1/analytics?platform=instagram` ([Analytics API](/analytics/get-analytics)).

| Metric | Available |
|--------|-----------|
| Impressions | <Yes /> |
| Reach | <Yes /> |
| Likes | <Yes /> |
| Comments | <Yes /> |
| Shares | <Yes /> |
| Saves | <Yes /> |
| Views | <Yes /> |

Three Instagram-only endpoints go deeper:

- [Account insights](/analytics/get-instagram-account-insights): account-level reach, views, accounts engaged, total interactions, follows and unfollows, profile link taps. Only `reach` supports `metricType=time_series`; Instagram serves every other metric as `total_value` only.
- [Follower history](/analytics/get-instagram-follower-history): a daily follower count series plus `followers_gained` and `followers_lost`, served from Zernio's daily snapshots because Instagram removed `follower_count` from `/insights` in Graph API v22 and never exposed a historical daily series.
- [Demographics](/analytics/get-instagram-demographics): audience by age, city, country or gender. Requires at least 100 followers.

**Media URLs.** Meta's CDN links for post images and covers expire.

When one has lapsed, the analytics response re-reads the media from Meta. It serves `thumbnailUrl` and the `mediaItems` images from Zernio storage instead, so those URLs do not expire and you can cache them.

Video file URLs stay Meta's signed links and are refreshed on read once they lapse.

## Stories

Two endpoints read Stories while they are live. Zernio keeps their final metrics from Meta's `story_insights` webhook, so they stay queryable after the 24 hours.

- [List active stories](/instagram/list-instagram-stories): `GET /v1/accounts/{accountId}/instagram/stories` returns the live stories with `mediaType`, `permalink`, `mediaUrl`, `thumbnailUrl` and `timestamp`. Meta excludes live videos, reshared stories and copyright-flagged media, and `caption`, `likeCount` and `commentsCount` do not apply to stories.
- [Story insights](/instagram/get-instagram-story-insights): `GET /v1/accounts/{accountId}/instagram/stories/{storyId}/insights` returns `views`, `reach`, `replies`, `shares`, `profileVisits`, `follows`, `totalInteractions` and the navigation breakdown (`tapsForward`, `tapsBack`, `exits`, `swipesForward`). `source` is `live` (fetched from Meta), `cached` (expired, webhook payload captured) or `unavailable` (expired, no payload, typical when the account connected after the story expired). Counts below 5 may come back as 0 because of Meta's privacy floor.