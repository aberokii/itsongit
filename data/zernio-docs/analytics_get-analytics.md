# Get post analytics API Reference

Returns analytics for posts. With postId, returns a single post. Without it, returns a paginated list with overview stats.
Accepts both Zernio Post IDs and External Post IDs (auto-resolved). fromDate defaults to 90 days ago if omitted, max range 366 days.
Single post lookups may return 202 (sync pending) or 424 (all platforms failed). For follower stats, use /v1/accounts/follower-stats.

LinkedIn personal accounts: Analytics are only available for posts published through Zernio. LinkedIn's API only returns metrics for posts authored by the authenticated user. Organization/company page analytics work for all posts.

Facebook Page stories: stories on a connected Page, published through Zernio or natively, are collected while they are live and returned like any other post (platformPostUrl points to the story). Their lifetime metrics refresh about hourly, with a final reading shortly before the story expires at 24 hours; after that the values stay at that last reading. Mapping: impressions = story impressions, reach = story reach, views = story media views, likes = story reactions, comments = story replies, shares = story shares. Meta exposes no link-click metric for stories, so clicks is always 0. Metrics for a story published through Zernio are available on its Zernio post ID.


## GET /v1/analytics

**Get post analytics**

Returns analytics for posts. With postId, returns a single post. Without it, returns a paginated list with overview stats.
Accepts both Zernio Post IDs and External Post IDs (auto-resolved). fromDate defaults to 90 days ago if omitted, max range 366 days.
Single post lookups may return 202 (sync pending) or 424 (all platforms failed). For follower stats, use /v1/accounts/follower-stats.

LinkedIn personal accounts: Analytics are only available for posts published through Zernio. LinkedIn's API only returns metrics for posts authored by the authenticated user. Organization/company page analytics work for all posts.

Facebook Page stories: stories on a connected Page, published through Zernio or natively, are collected while they are live and returned like any other post (platformPostUrl points to the story). Their lifetime metrics refresh about hourly, with a final reading shortly before the story expires at 24 hours; after that the values stay at that last reading. Mapping: impressions = story impressions, reach = story reach, views = story media views, likes = story reactions, comments = story replies, shares = story shares. Meta exposes no link-click metric for stories, so clicks is always 0. Metrics for a story published through Zernio are available on its Zernio post ID.


### Parameters

- **postId** (optional) in query: Returns analytics for a single post. Accepts both Zernio Post IDs and External Post IDs. Zernio IDs are auto-resolved to External Post analytics.
- **platform** (optional) in query: Filter by platform (default "all")
- **profileId** (optional) in query: Filter by profile ID (default "all")
- **accountId** (optional) in query: Filter by account ID
- **source** (optional) in query: Filter by post source: late (posted via Zernio API), external (synced from platform), all (default)
- **fromDate** (optional) in query: Inclusive lower bound (YYYY-MM-DD). Defaults to 90 days ago if omitted. Max range is 366 days.
- **toDate** (optional) in query: Inclusive upper bound (YYYY-MM-DD). Defaults to today if omitted.
- **limit** (optional) in query: Page size (default 50)
- **page** (optional) in query: Page number (default 1)
- **sortBy** (optional) in query: Sort by date, engagement, or a specific metric. Platform-specific metrics (follows, reposts, reels_skip_rate, ig_reels_*, completion_rate, profile_views, website_clicks) sort a null value as 0.
- **order** (optional) in query: Sort order
- **tags** (optional) in query: Comma-separated tags (at most 20). Lists only posts created through Zernio that carry every listed tag, matched exactly and case-sensitively. Up to 200 published posts can match within the date range; more returns 400 asking to narrow fromDate and toDate. Ignored when postId is set.

### Responses

#### 200: Analytics result

**Response Body:**

*One of the following:*
- `AnalyticsSinglePostResponse`
- `AnalyticsListResponse`

#### 202: Analytics are being synced from the platform, or the post has not finished publishing on every platform yet (single post lookup only). The response body matches AnalyticsSinglePostResponse with syncStatus "pending" and a message; while a platform has not published, status is the post's own status (for example scheduled or publishing) and a post with one failed platform returns 202 rather than 424 until the others finish. Pending platforms whose account failed its last analytics sync carry that error in platformAnalytics[].errorMessage, and the message says so.

**Response Body:**

- **postId** `string`: No description
- **latePostId** `string,null`: Original Zernio post ID if scheduled via Zernio
- **status** `string`: Overall post status. "partial" when some platforms published and others failed. While any platform is still pending or processing, the post's own status is returned instead (usually scheduled or publishing), even if another platform already published. A post with no published or failed platform (for example every platform cancelled) returns its own status with syncStatus unavailable and no platformAnalytics. - one of: published, failed, partial, scheduled, publishing, draft, cancelled
- **content** `string`: No description
- **scheduledFor** `string` (date-time): No description
- **publishedAt** `string,null` (date-time): No description
- **analytics**: `PostAnalytics` - See schema definition
- **platformAnalytics** `array[PlatformAnalytics]`: 
- **platform** `string`: No description
- **platformPostUrl** `string,null` (uri): No description
- **isExternal** `boolean`: No description
- **syncStatus** `string`: Overall sync state across all platforms - one of: synced, pending, partial, unavailable
- **message** `string,null`: Human-readable status message for pending, partial, or failed states
- **thumbnailUrl** `string,null` (uri): Cover image URL. Facebook and Instagram covers whose Meta CDN link expired are re-read from Meta and served from Zernio storage, so that URL does not expire and can be cached.
- **mediaType** `string,null`: No description - one of: image, video, carousel, text
- **mediaItems** `array[object]`: All media items for this post. Carousel posts contain one entry per slide. Facebook and Instagram images and video covers whose Meta CDN links expired are re-read and served from Zernio storage (non-expiring). Facebook and Instagram video file URLs, and LinkedIn media URLs, stay the platform's signed links and are refreshed on read once they lapse.
  - **type** `string`: No description - one of: image, video
  - **url** `string,null` (uri): 'Direct URL to the media file. Null when the platform withholds it: check mediaStatus before downloading. Instagram omits the video file for Reels it flags as containing copyrighted material (its docs name audio as the usual cause), so type stays "video" while the file is permanently unreachable.'
  - **thumbnail** `string,null` (uri): Thumbnail URL (same as url for images). Still present when url is null.
  - **altText** `string`: Accessibility alt text set on the media, when present.
  - **mediaStatus** `string`: unavailable means the media file could not be retrieved (url is null or, for LinkedIn videos, a cover image standing in for the file). available or absent means the file is available at url (older synced items omit the field). - one of: available, unavailable
  - **unavailableReason** `string`: Why the file is missing. platform_withheld means the platform declined to return it and retrying will not help. - one of: platform_withheld
- **mediaProductType** `string`: Instagram only: the platform media product type (e.g. FEED, REELS, STORY, AD). Absent when the platform did not report it.
- **isAiGenerated** `boolean`: Instagram only: whether Instagram labeled the media as AI-generated. Absent when the platform did not report it.
- **isSharedToFeed** `boolean`: Instagram reels only: whether the reel is also shared to the main feed. Absent when the platform did not report it.
- **mediaAudioType** `string`: Instagram only: audio type of the media (MUSIC or ORIGINAL_SOUND). Absent when the platform did not report it.

#### 400: Validation error

**Response Body:**

- **error** `string`: No description (example: "Invalid query parameters")
- **details** `object`: Detailed validation errors

#### 401: Missing or invalid API key. `code` is `missing_credentials` when no Authorization header was sent and `invalid_credentials` when the key is unknown, revoked or expired.

**Response Body:**

- **error** `string`: Human-readable error message.
- **type** `string`: Error class for programmatic handling. - one of: invalid_request_error, authentication_error, permission_error, not_found, rate_limit_error, platform_error, api_error
- **code** `string`: Stable machine-readable error code.
- **param** `string`: The request field that caused the error, when applicable.
- **docUrl** `string`: Documentation page for resolving the error, when one applies.
- **platform** `string`: Upstream platform (e.g. meta, google, tiktok), present when type is platform_error.
- **platformError** `object`: Raw error payload from the upstream platform, passed through verbatim so
integrators can read provider-specific codes. For Meta this includes
error_subcode, error_user_title, and error_user_msg.

- **details** `object`: Additional structured context (e.g. field-level validation errors), for example
`privateReplyConsumed` on the private-reply endpoint's 400 when the comment's
single reply is already spent, and `privateReplyOutcome: "unknown"` on its 502 when Meta
answered a server error and the reply may have been delivered.

On a Google Ads 429 it carries `quotaExhausted: true`, which marks the failure as
Google's own ads quota rather than a Zernio rate limit, so you can keep calling
other platforms instead of backing off everywhere. When Google names the scope it
also carries `quotaScope`: `DEVELOPER` means the shared developer-token budget
(every Google account is affected and there is nothing to change on your side),
`ACCOUNT` means your own ad account. A Meta 429 carries neither field.

A Zernio Google Ads burst-limit 429 carries `budgetScope` instead, and never
`quotaExhausted`: these are Zernio's own limits, applied before the call
reaches Google, and both clear within a minute. `account` is the limit of 15
requests per minute per connected Google Ads account; `user` is the ceiling of
120 requests per minute per Zernio user across all their Google Ads accounts.
Both are separate axes from `quotaScope`, not the same pool named twice.

A failed Meta ad create (`POST /v1/ads/create`, `POST /v1/ads/boost`,
`POST /v1/ads/ctwa`) carries `stage`, `adAccountId` and `createdObjects`: where
it failed, on which ad account, and every object this request had already
created with what cleanup did to it. `left_behind` objects still exist on the
ad account (Meta refused the delete, typically on a held account), so delete
them yourself or reuse them. `unconfirmedWrite` is set when Meta answered a
create with a 5xx or dropped the connection and Zernio could not confirm
whether the object exists: check that parent before creating it again.

When Meta refuses a write because the ad account's status is ineligible to manage
ads (Meta subcode 2490592 or 4841021, on the write itself or on a cleanup delete),
any Meta ads write (create, boost, CTWA, campaign / ad set / ad updates and status
changes) answers 422 `ad_account_unusable`. The message names the ad account when
known, links Meta's fix (https://www.facebook.com/business/help/422289316306981),
lists the objects left behind and ends with Meta's original error, which also stays
verbatim in `platformError`. Meta often reports the first failure under an
unrelated code (e.g. 1487194 on the creative), so branch on `code`, not on
`platformError`.

  - **stage** `string`: Meta ad create failures only. The step that failed: `media` (image/video download or upload), `campaign`, `adset`, `creative`, `ad` (the ad POST itself, where Meta's code 31 / 3858385 hold and 100 / 1359188 payment rejections land), `activation` (switching the created objects on), or `other` (a read or check before any write). - one of: media, campaign, adset, creative, ad, activation, other
  - **adAccountId** `string`: Meta ad create failures only. The ad account the request wrote to (`act_...`).
  - **createdObjects** `array[object]`: Meta ad create failures only. Every object this request created before failing, in creation order. Objects you referenced (an existing campaign, ad set, creative or video) are never listed and never deleted.
    - **type** `string`: No description - one of: campaign, adset, creative, ad, video, image
    - **id** `string`: Meta object id; for `image` the image hash.
    - **cleanup** `string`: `deleted`: Zernio deleted it. `left_behind`: Meta refused the delete, so it still exists. `kept`: deliberately not deleted (image hashes are shared by every upload of the same file). - one of: deleted, left_behind, kept
  - **unconfirmedWrite** `object`: Meta ad create failures only, when Meta answered a create with a 5xx or dropped the connection and the object could not be looked up. Zernio did not retry it.
    - **type** `string`: No description - one of: campaign, adset, creative, ad
    - **parentId** `string`: Where to look for it: the ad set for an ad, the campaign for an ad set, the ad account otherwise.
  - **quotaExhausted** `boolean`: Google Ads 429 only. True when the upstream Google Ads quota is spent rather than a Zernio limit.
  - **quotaScope** `string`: Google Ads 429 only, when Google names the scope. DEVELOPER is the shared developer-token budget; ACCOUNT is your ad account. - one of: DEVELOPER, ACCOUNT
  - **budgetScope** `string`: Zernio Google Ads burst-limit 429 only (never set alongside `quotaExhausted`). `account` is the limit of 15 requests per minute per connected Google Ads account; `user` is the ceiling of 120 requests per minute per Zernio user across all their Google Ads accounts. Both clear within a minute. - one of: account, user

#### 402: Analytics access required. Legacy plans need the Analytics add-on; included by default on usage-based plans.

**Response Body:**

- **error** `string`: No description (example: "Analytics add-on required")
- **code** `string`: No description (example: "analytics_addon_required")

#### 404: Resource not found

**Response Body:**

- **error** `string`: No description (example: "Not found")

#### 424: Post failed to publish on all platforms. Analytics are unavailable. (single post lookup only)

**Response Body:**

- **postId** `string`: No description
- **latePostId** `string,null`: Original Zernio post ID if scheduled via Zernio
- **status** `string`: Overall post status. "partial" when some platforms published and others failed. While any platform is still pending or processing, the post's own status is returned instead (usually scheduled or publishing), even if another platform already published. A post with no published or failed platform (for example every platform cancelled) returns its own status with syncStatus unavailable and no platformAnalytics. - one of: published, failed, partial, scheduled, publishing, draft, cancelled
- **content** `string`: No description
- **scheduledFor** `string` (date-time): No description
- **publishedAt** `string,null` (date-time): No description
- **analytics**: `PostAnalytics` - See schema definition
- **platformAnalytics** `array[PlatformAnalytics]`: 
- **platform** `string`: No description
- **platformPostUrl** `string,null` (uri): No description
- **isExternal** `boolean`: No description
- **syncStatus** `string`: Overall sync state across all platforms - one of: synced, pending, partial, unavailable
- **message** `string,null`: Human-readable status message for pending, partial, or failed states
- **thumbnailUrl** `string,null` (uri): Cover image URL. Facebook and Instagram covers whose Meta CDN link expired are re-read from Meta and served from Zernio storage, so that URL does not expire and can be cached.
- **mediaType** `string,null`: No description - one of: image, video, carousel, text
- **mediaItems** `array[object]`: All media items for this post. Carousel posts contain one entry per slide. Facebook and Instagram images and video covers whose Meta CDN links expired are re-read and served from Zernio storage (non-expiring). Facebook and Instagram video file URLs, and LinkedIn media URLs, stay the platform's signed links and are refreshed on read once they lapse.
  - **type** `string`: No description - one of: image, video
  - **url** `string,null` (uri): 'Direct URL to the media file. Null when the platform withholds it: check mediaStatus before downloading. Instagram omits the video file for Reels it flags as containing copyrighted material (its docs name audio as the usual cause), so type stays "video" while the file is permanently unreachable.'
  - **thumbnail** `string,null` (uri): Thumbnail URL (same as url for images). Still present when url is null.
  - **altText** `string`: Accessibility alt text set on the media, when present.
  - **mediaStatus** `string`: unavailable means the media file could not be retrieved (url is null or, for LinkedIn videos, a cover image standing in for the file). available or absent means the file is available at url (older synced items omit the field). - one of: available, unavailable
  - **unavailableReason** `string`: Why the file is missing. platform_withheld means the platform declined to return it and retrying will not help. - one of: platform_withheld
- **mediaProductType** `string`: Instagram only: the platform media product type (e.g. FEED, REELS, STORY, AD). Absent when the platform did not report it.
- **isAiGenerated** `boolean`: Instagram only: whether Instagram labeled the media as AI-generated. Absent when the platform did not report it.
- **isSharedToFeed** `boolean`: Instagram reels only: whether the reel is also shared to the main feed. Absent when the platform did not report it.
- **mediaAudioType** `string`: Instagram only: audio type of the media (MUSIC or ORIGINAL_SOUND). Absent when the platform did not report it.

#### 500: Internal server error

**Response Body:**

- **error** `string`: Human-readable error message.
- **type** `string`: Error class for programmatic handling. - one of: invalid_request_error, authentication_error, permission_error, not_found, rate_limit_error, platform_error, api_error
- **code** `string`: Stable machine-readable error code.
- **param** `string`: The request field that caused the error, when applicable.
- **docUrl** `string`: Documentation page for resolving the error, when one applies.
- **platform** `string`: Upstream platform (e.g. meta, google, tiktok), present when type is platform_error.
- **platformError** `object`: Raw error payload from the upstream platform, passed through verbatim so
integrators can read provider-specific codes. For Meta this includes
error_subcode, error_user_title, and error_user_msg.

- **details** `object`: Additional structured context (e.g. field-level validation errors), for example
`privateReplyConsumed` on the private-reply endpoint's 400 when the comment's
single reply is already spent, and `privateReplyOutcome: "unknown"` on its 502 when Meta
answered a server error and the reply may have been delivered.

On a Google Ads 429 it carries `quotaExhausted: true`, which marks the failure as
Google's own ads quota rather than a Zernio rate limit, so you can keep calling
other platforms instead of backing off everywhere. When Google names the scope it
also carries `quotaScope`: `DEVELOPER` means the shared developer-token budget
(every Google account is affected and there is nothing to change on your side),
`ACCOUNT` means your own ad account. A Meta 429 carries neither field.

A Zernio Google Ads burst-limit 429 carries `budgetScope` instead, and never
`quotaExhausted`: these are Zernio's own limits, applied before the call
reaches Google, and both clear within a minute. `account` is the limit of 15
requests per minute per connected Google Ads account; `user` is the ceiling of
120 requests per minute per Zernio user across all their Google Ads accounts.
Both are separate axes from `quotaScope`, not the same pool named twice.

A failed Meta ad create (`POST /v1/ads/create`, `POST /v1/ads/boost`,
`POST /v1/ads/ctwa`) carries `stage`, `adAccountId` and `createdObjects`: where
it failed, on which ad account, and every object this request had already
created with what cleanup did to it. `left_behind` objects still exist on the
ad account (Meta refused the delete, typically on a held account), so delete
them yourself or reuse them. `unconfirmedWrite` is set when Meta answered a
create with a 5xx or dropped the connection and Zernio could not confirm
whether the object exists: check that parent before creating it again.

When Meta refuses a write because the ad account's status is ineligible to manage
ads (Meta subcode 2490592 or 4841021, on the write itself or on a cleanup delete),
any Meta ads write (create, boost, CTWA, campaign / ad set / ad updates and status
changes) answers 422 `ad_account_unusable`. The message names the ad account when
known, links Meta's fix (https://www.facebook.com/business/help/422289316306981),
lists the objects left behind and ends with Meta's original error, which also stays
verbatim in `platformError`. Meta often reports the first failure under an
unrelated code (e.g. 1487194 on the creative), so branch on `code`, not on
`platformError`.

  - **stage** `string`: Meta ad create failures only. The step that failed: `media` (image/video download or upload), `campaign`, `adset`, `creative`, `ad` (the ad POST itself, where Meta's code 31 / 3858385 hold and 100 / 1359188 payment rejections land), `activation` (switching the created objects on), or `other` (a read or check before any write). - one of: media, campaign, adset, creative, ad, activation, other
  - **adAccountId** `string`: Meta ad create failures only. The ad account the request wrote to (`act_...`).
  - **createdObjects** `array[object]`: Meta ad create failures only. Every object this request created before failing, in creation order. Objects you referenced (an existing campaign, ad set, creative or video) are never listed and never deleted.
    - **type** `string`: No description - one of: campaign, adset, creative, ad, video, image
    - **id** `string`: Meta object id; for `image` the image hash.
    - **cleanup** `string`: `deleted`: Zernio deleted it. `left_behind`: Meta refused the delete, so it still exists. `kept`: deliberately not deleted (image hashes are shared by every upload of the same file). - one of: deleted, left_behind, kept
  - **unconfirmedWrite** `object`: Meta ad create failures only, when Meta answered a create with a 5xx or dropped the connection and the object could not be looked up. Zernio did not retry it.
    - **type** `string`: No description - one of: campaign, adset, creative, ad
    - **parentId** `string`: Where to look for it: the ad set for an ad, the campaign for an ad set, the ad account otherwise.
  - **quotaExhausted** `boolean`: Google Ads 429 only. True when the upstream Google Ads quota is spent rather than a Zernio limit.
  - **quotaScope** `string`: Google Ads 429 only, when Google names the scope. DEVELOPER is the shared developer-token budget; ACCOUNT is your ad account. - one of: DEVELOPER, ACCOUNT
  - **budgetScope** `string`: Zernio Google Ads burst-limit 429 only (never set alongside `quotaExhausted`). `account` is the limit of 15 requests per minute per connected Google Ads account; `user` is the ceiling of 120 requests per minute per Zernio user across all their Google Ads accounts. Both clear within a minute. - one of: account, user

---


# Related Schema Definitions

## AnalyticsSinglePostResponse

### Properties

- **postId** `string`: No description
- **latePostId** `string,null`: Original Zernio post ID if scheduled via Zernio
- **status** `string`: Overall post status. "partial" when some platforms published and others failed. While any platform is still pending or processing, the post's own status is returned instead (usually scheduled or publishing), even if another platform already published. A post with no published or failed platform (for example every platform cancelled) returns its own status with syncStatus unavailable and no platformAnalytics. - one of: published, failed, partial, scheduled, publishing, draft, cancelled
- **content** `string`: No description
- **scheduledFor** `string`: No description
- **publishedAt** `string,null`: No description
- **analytics**: No description
- **platformAnalytics** `array`: No description
- **platform** `string`: No description
- **platformPostUrl** `string,null`: No description
- **isExternal** `boolean`: No description
- **syncStatus** `string`: Overall sync state across all platforms - one of: synced, pending, partial, unavailable
- **message** `string,null`: Human-readable status message for pending, partial, or failed states
- **thumbnailUrl** `string,null`: Cover image URL. Facebook and Instagram covers whose Meta CDN link expired are re-read from Meta and served from Zernio storage, so that URL does not expire and can be cached.
- **mediaType** `string,null`: No description - one of: image, video, carousel, text
- **mediaItems** `array`: All media items for this post. Carousel posts contain one entry per slide. Facebook and Instagram images and video covers whose Meta CDN links expired are re-read and served from Zernio storage (non-expiring). Facebook and Instagram video file URLs, and LinkedIn media URLs, stay the platform's signed links and are refreshed on read once they lapse.
- **mediaProductType** `string`: Instagram only: the platform media product type (e.g. FEED, REELS, STORY, AD). Absent when the platform did not report it.
- **isAiGenerated** `boolean`: Instagram only: whether Instagram labeled the media as AI-generated. Absent when the platform did not report it.
- **isSharedToFeed** `boolean`: Instagram reels only: whether the reel is also shared to the main feed. Absent when the platform did not report it.
- **mediaAudioType** `string`: Instagram only: audio type of the media (MUSIC or ORIGINAL_SOUND). Absent when the platform did not report it.

## AnalyticsListResponse

### Properties

- **overview**: No description
- **posts** `array`: No description
- **pagination**: No description
- **accounts** `array`: Connected accounts (followerCount and followersLastUpdated only included if user has analytics add-on)
- **hasAnalyticsAccess** `boolean`: Whether user has analytics add-on access

## PostAnalytics

### Properties

- **impressions** `integer`: No description
- **reach** `integer`: No description
- **likes** `integer`: No description
- **comments** `integer`: No description
- **shares** `integer`: No description
- **saves** `integer`: Number of saves/bookmarks (Instagram, Pinterest, X)
- **clicks** `integer`: Link clicks where the platform reports them. Always 0 on Facebook Page stories: Meta exposes no link-click metric for stories.
- **views** `integer`: No description
- **follows** `integer,null`: Accounts that started following from this post. Instagram feed posts and stories (organic follows), Facebook Reels (Meta post_video_followers) and the TikTok business lane. Null on Instagram Reels and non-Reels video and on Facebook posts that are not Reels, where Meta does not expose this metric for the media. 0 for other platforms.
- **igReelsAvgWatchTime** `integer`: Average watch time per play, in milliseconds, for Instagram Reels, Facebook Reels and TikTok videos (business accounts). On Facebook it includes replays within a play, so it can exceed the Reel length. 0 for other media and platforms, including regular Facebook videos.
- **igReelsVideoViewTotalTime** `integer`: Total watch time including replays, in milliseconds, for Instagram Reels, Facebook Reels and TikTok videos (business accounts). 0 for other media and platforms, including regular Facebook videos.
- **reelsSkipRate** `number`: Instagram Reels only: percentage (0-100) of initial views that skipped the reel within its first 3 seconds, as reported by Meta. Meta labels the metric estimated and in development, so it can move between syncs. 0 for non-Reels media and other platforms. When a post is published to several accounts, the aggregate is weighted by views.
- **completionRate** `number`: TikTok accounts connected through the TikTok for Business app only: share of viewers who watched the video to the end, 0 to 1, as TikTok reports it (T+24-48h, only for posts active in the last 7 days). 0 for other platforms. When a post is published to several accounts, the aggregate is weighted by views.
- **profileViews** `integer`: Instagram feed posts (images and carousels; 0 on Reels and Stories) and TikTok accounts connected through the TikTok for Business app: profile views from users who reached the profile through this post (TikTok T+24-48h). 0 for other platforms.
- **websiteClicks** `integer`: TikTok accounts connected through the TikTok for Business app only: clicks on the profile website link attributed to this post (T+24-48h). Also counted inside `clicks`, which sums every profile-link type (website, phone, email, address, app download). 0 for other platforms.
- **impressionSources** `object`: TikTok accounts connected through the TikTok for Business app only: share of views by surface, as fractions 0 to 1 (T+24-48h, only for posts active in the last 7 days). Keys: `forYou`, `follow`, `search`, `personalProfile`, `sound`, `directMessage`, `other`; a surface TikTok adds later appears under a camelCase key derived from its name. Empty object when TikTok reports nothing, and for other platforms. When a post is published to several accounts, each share is weighted by views.
- **audienceTypes** `object`: TikTok accounts connected through the TikTok for Business app only: two viewer splits as fractions 0 to 1 (T+24-48h). Each pair sums to 1 when present, `follower` + `nonFollower` and `newViewer` + `returnViewer`; TikTok can report one pair without the other. Empty object when TikTok reports nothing, and for other platforms. Views-weighted across accounts like impressionSources.
- **audienceCountries** `object`: TikTok accounts connected through the TikTok for Business app only: share of views by viewer country as fractions 0 to 1, keyed by upper-case ISO-3166 alpha-2 code (T+24-48h, only for posts active in the last 7 days). At most 20 country keys plus `other`: the catch-all bucket TikTok sends, any country below 0.001 and anything past the twentieth all sum into `other`, so the values still add up to 1. Empty object when TikTok reports nothing, and for other platforms. Views-weighted across accounts like impressionSources.
- **replays** `integer`: Facebook Reels only: plays that were replays (Meta fb_reels_replay_count). Summed across accounts. 0 for other media and platforms.
- **retentionCurve** `object`: Facebook Reels and TikTok business lane: share still watching at each second of playback, fractions 0 to 1. Keys are whole seconds from the start of a play ("3" is the share still watching at 3 s). Facebook Reels (Meta post_video_retention_graph): the base is a subset of plays that Meta selects and does not expose, on small Reels it can be far below views (6 of 51 measured), so a value is a share of that subset, not of all plays; loops count as continued playback, so a short Reels curve runs past its length (an 8 s Reel has keys "0" to "12"); Meta returns at most 41 points, so a long Reel covers only its first 40 s. TikTok accounts connected through the TikTok for Business app (TikTok video_view_retention): one point per whole second, at most 61 points, thinned evenly on videos longer than 60 s. Empty object for other media and platforms. On a cross-posted post this is the curve of the account with the most views among those reporting one, never a blend: curves from different platforms and accounts measure different audiences and different seconds. Each platformAnalytics entry keeps its own curve.
- **reposts** `integer`: Instagram accounts connected with Facebook Login only: reposts of the media by other users, minus deleted reposts, on feed posts, reels and stories. Meta does not expose this metric for accounts connected with Instagram Login, so those always report 0. 0 for other platforms, including Threads, where reposts are counted in shares instead.
- **videoDurationSeconds** `integer,null`: Video length in seconds. Filled for public YouTube videos once their analytics next refresh (from the Data API; live streams may report null). The YouTube Data API has no Shorts flag: a video over 180 seconds cannot be a Short, but a shorter one may be a regular upload. Also filled for Instagram Reels (combine with igReelsAvgWatchTime (ms) to estimate retention). Null when unknown: platforms that do not report a length, non-video media, or when Instagram does not expose the media URL, e.g. reels with copyrighted audio.
- **engagementRate** `number`: Percentage, rounded to 2 decimals: (likes + comments + shares + saves) / (impressions or reach or views) * 100. Clicks and follows are never counted. The denominator is the FIRST of impressions, reach, views that is non-zero, so it is not the same basis on every post: a post with impressions divides by impressions, one without falls back to reach, then to views. If you need a single consistent basis (e.g. interactions / reach), compute it from the raw fields above. When this object is the post-level roll-up of a cross-posted post, the denominator is the SUM of the denominators resolved per platform entry: an entry reporting none of impressions, reach or views is excluded from both sides of the ratio. Each platformAnalytics entry below keeps its own single denominator. The engagementRate on the LinkedIn account endpoints is a different formula.
- **lastUpdated** `string`: No description

## PlatformAnalytics

### Properties

- **platform** `string`: No description
- **status** `string`: No description - one of: published, failed
- **platformPostId** `string,null`: The native post ID on the platform (e.g. Instagram media ID, tweet ID)
- **accountId** `string`: No description
- **accountUsername** `string,null`: No description
- **analytics**: No description
- **syncStatus** `string`: Sync state of analytics for this platform - one of: synced, pending, unavailable
- **platformPostUrl** `string,null`: No description
- **errorMessage** `string,null`: Failure detail. On failed entries, why the post failed to publish. On unavailable entries, why analytics cannot be synced (e.g. Google Business Profile, a TikTok upload that never received a video id). On pending entries, the most recent analytics sync error for the account (null while no sync has failed), cleared after the next successful sync.
- **errorCode** `string,null`: Stable machine-readable reason for errorMessage. post_not_found: the post was deleted or is no longer visible to the account. not_post_owner: the post is owned by another Page or user (collab or visitor post); its analytics cannot be read with this Page's token. permission_missing: the last analytics sync of the Facebook account failed because the Page no longer grants pages_read_engagement (pending entries only). null: no stable code, read errorMessage. New values may be added. - one of: post_not_found, not_post_owner, permission_missing, 
- **isOwner** `boolean,null`: Facebook only: true when the connected Page authored the post, false when Facebook reports another author (a collab post), null when unknown or for other platforms.

## ErrorResponse

Canonical error envelope. `error` is the human-readable message; `type`,
`code`, `param`, `platform`, and `platformError` are top-level siblings
for programmatic handling. For upstream platform failures (`type:
platform_error`), `platformError` carries the provider's raw payload
verbatim (for Meta: `error_subcode`, `error_user_title`, `error_user_msg`).


### Properties

- **error** `string`: Human-readable error message.
- **type** `string`: Error class for programmatic handling. - one of: invalid_request_error, authentication_error, permission_error, not_found, rate_limit_error, platform_error, api_error
- **code** `string`: Stable machine-readable error code.
- **param** `string`: The request field that caused the error, when applicable.
- **docUrl** `string`: Documentation page for resolving the error, when one applies.
- **platform** `string`: Upstream platform (e.g. meta, google, tiktok), present when type is platform_error.
- **platformError** `object`: Raw error payload from the upstream platform, passed through verbatim so
integrators can read provider-specific codes. For Meta this includes
error_subcode, error_user_title, and error_user_msg.

- **details** `object`: Additional structured context (e.g. field-level validation errors), for example
`privateReplyConsumed` on the private-reply endpoint's 400 when the comment's
single reply is already spent, and `privateReplyOutcome: "unknown"` on its 502 when Meta
answered a server error and the reply may have been delivered.

On a Google Ads 429 it carries `quotaExhausted: true`, which marks the failure as
Google's own ads quota rather than a Zernio rate limit, so you can keep calling
other platforms instead of backing off everywhere. When Google names the scope it
also carries `quotaScope`: `DEVELOPER` means the shared developer-token budget
(every Google account is affected and there is nothing to change on your side),
`ACCOUNT` means your own ad account. A Meta 429 carries neither field.

A Zernio Google Ads burst-limit 429 carries `budgetScope` instead, and never
`quotaExhausted`: these are Zernio's own limits, applied before the call
reaches Google, and both clear within a minute. `account` is the limit of 15
requests per minute per connected Google Ads account; `user` is the ceiling of
120 requests per minute per Zernio user across all their Google Ads accounts.
Both are separate axes from `quotaScope`, not the same pool named twice.

A failed Meta ad create (`POST /v1/ads/create`, `POST /v1/ads/boost`,
`POST /v1/ads/ctwa`) carries `stage`, `adAccountId` and `createdObjects`: where
it failed, on which ad account, and every object this request had already
created with what cleanup did to it. `left_behind` objects still exist on the
ad account (Meta refused the delete, typically on a held account), so delete
them yourself or reuse them. `unconfirmedWrite` is set when Meta answered a
create with a 5xx or dropped the connection and Zernio could not confirm
whether the object exists: check that parent before creating it again.

When Meta refuses a write because the ad account's status is ineligible to manage
ads (Meta subcode 2490592 or 4841021, on the write itself or on a cleanup delete),
any Meta ads write (create, boost, CTWA, campaign / ad set / ad updates and status
changes) answers 422 `ad_account_unusable`. The message names the ad account when
known, links Meta's fix (https://www.facebook.com/business/help/422289316306981),
lists the objects left behind and ends with Meta's original error, which also stays
verbatim in `platformError`. Meta often reports the first failure under an
unrelated code (e.g. 1487194 on the creative), so branch on `code`, not on
`platformError`.

  - **stage** `string`: Meta ad create failures only. The step that failed: `media` (image/video download or upload), `campaign`, `adset`, `creative`, `ad` (the ad POST itself, where Meta's code 31 / 3858385 hold and 100 / 1359188 payment rejections land), `activation` (switching the created objects on), or `other` (a read or check before any write). - one of: media, campaign, adset, creative, ad, activation, other
  - **adAccountId** `string`: Meta ad create failures only. The ad account the request wrote to (`act_...`).
  - **createdObjects** `array`: Meta ad create failures only. Every object this request created before failing, in creation order. Objects you referenced (an existing campaign, ad set, creative or video) are never listed and never deleted.
  - **unconfirmedWrite** `object`: Meta ad create failures only, when Meta answered a create with a 5xx or dropped the connection and the object could not be looked up. Zernio did not retry it.
  - **quotaExhausted** `boolean`: Google Ads 429 only. True when the upstream Google Ads quota is spent rather than a Zernio limit.
  - **quotaScope** `string`: Google Ads 429 only, when Google names the scope. DEVELOPER is the shared developer-token budget; ACCOUNT is your ad account. - one of: DEVELOPER, ACCOUNT
  - **budgetScope** `string`: Zernio Google Ads burst-limit 429 only (never set alongside `quotaExhausted`). `account` is the limit of 15 requests per minute per connected Google Ads account; `user` is the ceiling of 120 requests per minute per Zernio user across all their Google Ads accounts. Both clear within a minute. - one of: account, user