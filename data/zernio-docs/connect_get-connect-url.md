# Get OAuth connect URL API Reference

Initiate an OAuth connection flow. Returns an authUrl to redirect the user to.
Standard flow: Zernio hosts the selection UI, then redirects to your redirect_url. Headless mode (headless=true): user is redirected to your redirect_url with OAuth data for custom UI. Use the platform-specific selection endpoints to complete.

A profile can hold several accounts of the same platform: connecting a different account adds
it as a new account, and reconnecting the SAME account keeps it and all of its history. Ads
connections stay one per profile. On a legacy plan limited to N profiles, a new account is
refused with 403 `platform_account_limit` once N accounts of its platform are connected.

TikTok: every connection now goes through the TikTok for Business app. An authorization that leaves
out a permission the connected account needs changes nothing at all and comes back as
`missing_tiktok_permissions`; connect again and accept every permission on TikTok's screen.


## GET /v1/connect/{platform}

**Get OAuth connect URL**

Initiate an OAuth connection flow. Returns an authUrl to redirect the user to.
Standard flow: Zernio hosts the selection UI, then redirects to your redirect_url. Headless mode (headless=true): user is redirected to your redirect_url with OAuth data for custom UI. Use the platform-specific selection endpoints to complete.

A profile can hold several accounts of the same platform: connecting a different account adds
it as a new account, and reconnecting the SAME account keeps it and all of its history. Ads
connections stay one per profile. On a legacy plan limited to N profiles, a new account is
refused with 403 `platform_account_limit` once N accounts of its platform are connected.

TikTok: every connection now goes through the TikTok for Business app. An authorization that leaves
out a permission the connected account needs changes nothing at all and comes back as
`missing_tiktok_permissions`; connect again and accept every permission on TikTok's screen.


### Parameters

- **platform** (required) in path: Social media platform to connect. `snapchat` is a closed beta with no public release date: it returns 403 `PLATFORM_BETA_RESTRICTED` until the account is approved.
- **profileId** (required) in query: Your Zernio profile ID (get from /v1/profiles). For WhatsApp, a Zernio-provisioned number can only be connected on the profile it was provisioned to; connecting from any other profile is rejected with a 409.
- **reconnectAccountId** (optional) in query: Refresh this existing account (a Zernio account id of the same platform on this profile; otherwise 400). The OAuth callback and the selection endpoints (select-page, select-organization, select-board, select-location, Instagram and Snapchat selection) refuse, with `reconnect_account_mismatch`, a login that would write to a different account of the platform on this profile instead of this one. In headless mode the marker travels in the redirect_url we hand you, so pass that URL back unchanged to the selection endpoint. On X it counts toward the OAuth state limit described under redirect_url.
- **expectedPlatformUserId** (optional) in query: Only connect if the login lands on this platform account; any other account ends the flow with `error=account_mismatch` (a 409 `account_mismatch` on POST /v1/connect/instagram/select-account) and nothing is written. Compared with every id the platform reports for the authorized account: the `platformUserId` of a Zernio account on this platform, or on Instagram either the app-scoped id or the professional account id (`metadata.instagramScopedId`, the `17841...` id that Facebook Login accounts hold as platformUserId). TikTok open_ids are app-scoped, so an id from your own TikTok app never matches; use expectedUsername there. Honoured by the OAuth callback (every platform that connects without a selection step, Instagram Login included) and by the Instagram selection step; on the other selection endpoints you choose the destination yourself. In headless mode the marker travels in the redirect_url we hand you, so pass that URL back unchanged. On X it counts toward the OAuth state limit described under redirect_url.
- **expectedUsername** (optional) in query: Only connect if the authorized account's handle is this one (case-insensitive, a leading @ is ignored); otherwise the flow ends with `error=account_mismatch`, `error_message` naming the handle that was authorized, and nothing is written. Same coverage and transport as expectedPlatformUserId; when both are sent both must match. Use this on a first connection, where you hold the handle the user typed but no Zernio id yet.
- **forceReauth** (optional) in query: Instagram Login only (the default loginMethod); ignored elsewhere. Makes Instagram show its login page and ask for the credentials of the account to connect even when another Instagram account is logged in on the device or in the app, and hides the Facebook login option on that page. Use it when the person connecting manages several Instagram accounts on one phone: Instagram otherwise logs in, and converts to a professional account, whichever account is active, before any consent screen. Pair it with expectedUsername to also refuse a wrong account at the end.
- **redirect_url** (optional) in query: Your custom redirect URL after connection completes. MUST be an absolute http(s) URL or a custom app scheme for mobile deeplinks (e.g. myapp://callback); a relative path is rejected with 400 INVALID_REDIRECT_URL. X (twitter) caps the OAuth `state` at 500 characters and the redirect is carried inside it, so the URL-encoded `redirect_url` must be at most 258 characters for API callers (310 for dashboard sessions; in headless mode the appended `headless=true` counts toward it); a longer one is rejected with 400 INVALID_REDIRECT_URL. Result params are appended with the URL API, so an existing query string is preserved. Standard mode appends connected={platform}&profileId=X&accountId=Y&username=Z. Headless mode appends OAuth data params for platforms requiring selection (e.g. LinkedIn orgs, Facebook pages). If no selection is needed, the account is created directly and the redirect includes accountId.

On failure, the browser is sent to the same redirect_url with `error` and `platform` appended.
`error` and `platform` are always present. `error_message`, `is_user_fixable`, `reason`,
`dashboard_url`, `missing_scopes`, `error_reason` and the `platform_error*` params are
conditional and must be treated as optional. Your own query params are kept on every
redirect, but ours overwrite a param of yours with the same name. On an error redirect the
internal `headless`, `adsConnect`, `adsScope`, `reconnectAccountId`, `expectedPlatformUserId` and `expectedUsername` markers we add during the flow are removed.

Correlation (every redirect from an OAuth callback, success and failure, and the
`redirect_url` returned by the selection endpoints such as POST /v1/connect/facebook/select-page):
  - `request_id`: the id we log that request under. Quote it when reporting a problem.
  - `stage`: where the flow ended. `authorize` = the platform's consent dialog returned an
    error or denial instead of a code. `callback` = we processed the returned code (success,
    a selection step, or a failure). `select_page` = the destination-selection endpoint
    (page, account, organization, board, location, profile or phone number) completed it.

`oauth_denied` carries `error_message` and, when the platform sent them, its own values as
`platform_error` (e.g. `access_denied`), `platform_error_reason` (e.g. `user_denied`) and
`platform_error_description` (truncated to 500 characters). `is_user_fixable=true` is set when
the platform reported that the user cancelled or declined.

`no_facebook_pages` comes with `is_user_fixable=true`, an `error_message` telling the user to
click "Edit previous settings" in Meta's dialog and tick the Page (or create one), and, when
Meta's token debug answered, `error_reason`:
  - `pages_permission_declined`: the user declined the pages_show_list permission.
  - `no_pages_granted`: the permission was granted with no Page ticked. Meta reports a user who
    manages no Page the same way, so this covers both.
  - `granted_pages_not_listed`: Pages were ticked but Meta listed none the user can manage, and a
    direct read of each ticked Page returned no access token.

Headless Facebook success (`step=select_page`) and headless Instagram `facebook_login` success
(`step=select_account`): `userProfile` is JSON that was
percent-encoded once before being set as a query param, so it is encoded twice on the wire.
After your framework decodes the query string once, run one more decodeURIComponent (or
equivalent) and then JSON.parse it. `tempToken` and `connect_token` are plain values.

`code_already_redeemed` means the same authorization code arrived more than once and an earlier
request already processed it (the code is never sent to the platform twice). It is not a
failure: check GET /v1/accounts or wait for the `account.connected` webhook.

`missing_google_permissions` (YouTube, Google Business and Google Ads) means the user unchecked one or more
permissions on Google's consent screen. It always comes with `is_user_fixable=true`. When Google
reported the granted scopes, `missing_scopes` is also present: a comma-separated list of the
requested Google scopes that were not granted. Ask the user to connect again and keep every
permission checked.

`no_youtube_channel` means Google authorized the account but it has no YouTube channel we can
connect. It always comes with `is_user_fixable=true` and an `error_message`. The usual causes: the
user picked their personal Google identity instead of the Brand Account in Google's account
chooser, they only have YouTube Studio access (not Brand Account owner or manager), or the
account has no channel yet.

This list is NOT exhaustive and new values may be added at any time. Treat an unrecognized
value as a generic failure rather than matching it exhaustively. Existing values are not
renamed or removed without notice.

OAuth and callback:
  oauth_denied, invalid_callback, invalid_state, unsupported_platform, connection_failed,
  internal_error, token_exchange_failed, byok_config_error, personal_account_not_supported,
  missing_google_permissions, missing_tiktok_permissions, platform_requires_destination,
  reconnect_account_mismatch, account_mismatch, instagram_login_method_mismatch, invalid_request,
  code_already_redeemed

Access and limits:
  profile_not_found, invalid_profile_id, access_denied, account_limit_exceeded,
  profile_limit_exceeded, payment_required

Destination selection:
  no_facebook_pages, facebook_pages_error, no_google_locations, google_locations_error,
  google_permission_denied, no_snapchat_public_profiles, snapchat_profiles_error,
  no_youtube_channel, discord_no_guild, slack_no_team

WhatsApp:
  whatsapp_error, one_whatsapp_per_profile, whatsapp_number_already_connected,
  whatsapp_number_pinned_to_profile, whatsapp_coexistence_not_registered, connection_cancelled

Google Ads (platform=googleads):
  google_ads_auth_failed, google_ads_invalid_state, google_ads_config_error,
  google_ads_token_failed, google_ads_quota_exhausted, google_ads_callback_error

TikTok Ads (platform=tiktokads):
  tiktok_ads_auth_failed, tiktok_ads_invalid_state, tiktok_ads_access_denied,
  tiktok_ads_config_error, tiktok_ads_token_failed, tiktok_ads_account_not_found,
  tiktok_ads_callback_error

X Ads (platform=xads):
  x_ads_denied, x_ads_auth_failed, x_ads_config_error, x_ads_account_not_found,
  x_ads_state_error, x_ads_token_failed, x_ads_token_missing, x_ads_callback_error

Reddit Ads (platform=redditads):
  reddit_ads_auth_failed, reddit_ads_invalid_state, reddit_ads_access_denied,
  reddit_ads_scope_not_granted, reddit_ads_no_ad_accounts, reddit_ads_callback_error

Shopify (platform=shopify):
  shopify_auth_failed, shopify_config_error, shopify_invalid_state, shopify_invalid_hmac,
  shopify_invalid_shop, shopify_missing_scopes, shopify_callback_error

1. On this endpoint every upstream OAuth error is collapsed into `oauth_denied`, with the
provider's own values in the `platform_error*` params described above. The dedicated
ads flows below are different: they use their own denial slugs and `google_ads_auth_failed`
and `tiktok_ads_auth_failed` may carry the provider's raw error string in `error_message`.

2. On the tiktok and twitter ads flows `platform` carries the ads platform id
(`tiktokads`, `xads`), not the value used in the request path. The googleads, redditads and
shopify flows report `googleads`, `redditads` and `shopify`.

3. `missing_tiktok_permissions` means the TikTok authorization left out a permission the
already-connected account needs, so nothing was changed and it keeps working as before.
It is user-fixable: connect again and accept every permission on TikTok's screen.

4. `instagram_login_method_mismatch` means an Instagram Login authorization landed on a
profile whose Instagram account is connected through Facebook Login, so nothing was
changed and it keeps working as before. To refresh it, connect again with
`loginMethod=facebook_login`. To move it to Instagram Login, disconnect it first.

- **scopes** (optional) in query: Comma-separated permission areas to request instead of the platform's full permission set. Values: `posting`, `analytics`, `comments`, `messaging`, `ads`. Omit it (the default, and what the dashboard does) to request everything the platform supports.

When present, the consent dialog asks only for the platform scopes behind those areas plus the scopes every connection needs (identity, token refresh, and listing the pages, organizations or channels the user picks from). Scopes the user was never asked for are absent from the account's `permissions`, and the health endpoints report them as not granted, so a `posting`-only account cannot read analytics or the inbox until it is connected again with more areas. First comments need `comments`: a `posting`-only account publishes the post and skips the first comment. Scopes the platform lists under none of the areas (X likes, bookmarks and follows, Pinterest ads-only extras) are requested only when the parameter is omitted.

Supported on facebook, instagram (both login methods), linkedin, twitter, tiktok, youtube, threads, reddit, pinterest, googlebusiness and slack (via `GET /v1/connect/slack`). Rejected with 400 `INVALID_FIELD_VALUE` (`param: scopes`) on bluesky, telegram, discord, snapchat and whatsapp, whose dialog cannot be reduced, and for an empty list or an unknown area.

What each area asks for, per platform (Google scopes shortened to their last path segment):

| Platform | `posting` | `analytics` | `comments` | `messaging` | `ads` | Always requested |
|---|---|---|---|---|---|---|
| facebook | `pages_manage_posts` | `read_insights`, `pages_read_user_content` | `pages_manage_engagement`, `pages_read_user_content` | `pages_messaging` | `ads_management`, `ads_read`, `leads_retrieval`, `pages_manage_ads`, `instagram_basic`, `business_management` | `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` |
| instagram (Instagram Login) | `instagram_business_content_publish` | `instagram_business_manage_insights` | `instagram_business_manage_comments` | `instagram_business_manage_messages` | none | `instagram_business_basic` |
| instagram (`loginMethod=facebook_login`) | `instagram_content_publish` | `instagram_manage_insights` | `instagram_manage_comments` | `instagram_manage_messages` | `ads_management`, `ads_read`, `leads_retrieval`, `pages_manage_ads` | `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management`, `pages_messaging`, `pages_manage_metadata` |
| linkedin | `w_member_social`, `w_organization_social`, `r_organization_social`, `r_organization_followers` | `r_member_postAnalytics`, `r_member_profileAnalytics`, `rw_organization_admin`, `r_organization_social`, `r_organization_followers` | `w_member_social`, `w_member_social_feed`, `w_organization_social`, `w_organization_social_feed`, `r_organization_social`, `r_organization_social_feed` | none | `r_ads`, `rw_ads`, `r_ads_reporting`, `r_marketing_leadgen_automation`, `rw_conversions` | `openid`, `profile`, `email`, `r_basicprofile`, `rw_organization_admin` |
| twitter | `tweet.write`, `media.write` | (in the always-requested set) | `tweet.write`, `like.write`, `tweet.moderate.write` | `dm.read`, `dm.write`, `media.write` | none | `tweet.read`, `users.read`, `offline.access` |
| tiktok | `video.publish` | `user.info.stats`, `user.insights`, `video.list`, `video.insights` | `comment.list`, `comment.list.manage`, `video.list` | `message.list.read`, `message.list.send`, `message.list.manage` | none | `user.info.basic`, `user.info.username`, `user.info.profile`, `user.account.type`, `video.publish`, `video.upload`, `video.list` |
| youtube | `youtube.upload` | `yt-analytics.readonly` | `youtube.force-ssl` | none | none | `youtube` |
| threads | `threads_content_publish`, `threads_manage_replies`, `threads_delete` | `threads_manage_insights` | `threads_content_publish`, `threads_read_replies`, `threads_manage_replies`, `threads_delete` | none | none | `threads_basic` |
| reddit | `submit`, `read`, `mysubreddits`, `flair`, `history`, `edit` | `read`, `history` | `read`, `history`, `edit`, `vote` | `privatemessages` | none | `identity` |
| pinterest | `boards:write`, `pins:read`, `pins:write` | `pins:read`, `user_accounts:read` | none | none | `ads:read`, `ads:write`, `boards:write`, `pins:read`, `pins:write` | `boards:read`, `user_accounts:read` |
| googlebusiness | `business.manage` | `business.manage` | `business.manage` | none | none | `business.manage`, `userinfo.profile`, `userinfo.email` |
| slack | `chat:write`, `chat:write.public`, `chat:write.customize`, `files:write`, `files:read` | none | none | `chat:write`, `chat:write.customize`, `files:write`, `files:read`, `channels:history`, `groups:history`, `im:history`, `mpim:history`, `im:read`, `im:write`, `mpim:read`, `users:read`, `reactions:read`, `reactions:write` | none | `channels:join`, `channels:read`, `groups:read`, `team:read` |

- **headless** (optional) in query: When true, the user is redirected to your redirect_url with raw OAuth data (code, state) instead of Zernio's default account selection UI. Use this to build a custom connect experience.
- **loginMethod** (optional) in query: Instagram only. Which of the two Instagram connection methods to use. Ignored for every other platform.

`instagram_login` (the default, and what you get if you omit this): the Instagram Login dialog. The user authorizes their Instagram professional account directly, no Facebook Page required.

`facebook_login`: the Facebook Login dialog, i.e. "Instagram API with Facebook Login". The user authorizes a Facebook Page that has a linked Instagram professional account, and every API call for that account then runs through the Page. Use this when the customer manages Instagram through a Page and expects the Facebook consent screen. Because the user has to pick which Page to connect, the callback continues at the account-selection step, `/v1/connect/instagram/select-account`.

`facebook_login` supports `headless=true` like the other selection platforms: the callback redirects to your `redirect_url` with `profileId`, `tempToken`, `platform=instagram`, `step=select_account`, `userProfile` (the Facebook user's profile, same shape and encoding as the Facebook `step=select_page` redirect) and `connect_token`. Pass `profileId`, `tempToken` and `connect_token` into the select-account endpoints to finish. The default `instagram_login` has no selection step, so it connects the account directly.

- **onboarding** (optional) in query: WhatsApp only. Ignored for every other platform. Controls which screen Meta's Embedded Signup popup shows.

If omitted, the connection defaults to coexistence (same as `business_app` below), preserving existing behavior for numbers already on the WhatsApp Business app.

`api`: standard Embedded Signup, showing Meta's WABA/number picker. Use this to connect a phone number already on Cloud API elsewhere.

`business_app`: coexistence, i.e. 'Connect existing WhatsApp Business app' (a number shared between Cloud API and the consumer WhatsApp Business app).

- **signup** (optional) in query: WhatsApp only. Rejected with 400 `INVALID_FIELD_VALUE` on any other platform.

`hosted`: `authUrl` points at a Zernio-hosted page on zernio.com instead of Meta's OAuth dialog, and
the response carries `authUrl` only (no `state`). That page opens Meta's Embedded Signup popup itself,
so it learns which WhatsApp Business Account and number the user picked inside the popup and connects
exactly that one. Use it when your users' Facebook logins manage several WhatsApp accounts: on the
default redirect flow Meta only returns an authorization code, so when that login can see more than
one number the user lands on Zernio's number picker and has to choose again. Nothing to embed on your
side and no domain setup: send the user to `authUrl`, and they come back to `redirect_url` with the
same params as the redirect flow. Success: `connected=whatsapp`, `profileId`, `accountId`, `username`
(plus `connect_token` for API-key callers). Failure: `error` and `platform=whatsapp`, with the same
values and extras as the redirect flow (`one_whatsapp_per_profile`, `whatsapp_number_already_connected`,
`whatsapp_number_pinned_to_profile` and `whatsapp_coexistence_not_registered` with `is_user_fixable=true`; `payment_required` with `reason`
and `dashboard_url`; `whatsapp_error` with `error_message` when Meta reported one), plus two of its own:
`connection_cancelled` when the popup was closed before finishing (`error_message` carries Meta's last
reported step or error when there is one) and `session_expired` when the user took longer than the
60 minute window the hosted page is valid for; restart the flow with a new call in that case.
`onboarding` is carried through and a pre-verified Zernio-provisioned number is attached like on the
redirect flow. `headless` has no effect here because there is no selection step left to hand you.
When a previously disconnected account for this profile can simply be re-enabled, this endpoint
re-enables it and returns the account directly instead of a URL, exactly like the redirect flow.
The page shows the same guidance as the Zernio dashboard: a pre-verified Zernio-provisioned number is
called out by name ("choose it in Meta's list, no code will be asked"), coexistence and standard signups
get their explainer video, and a step-by-step follow-along checklist stays visible while Meta's popup is
open. Skin it with `brandName`, `primaryColor` and `language` below.

- **brandName** (optional) in query: Your product name, for the two branded pages. With `signup=hosted` (WhatsApp) it replaces Zernio in the page title ("Connect your WhatsApp number to <brandName>"). With `welcome=true` it fills the heading ("<brandName> wants to connect to your <platform>"); without it the screen shows Zernio and the Zernio mark. Both pages keep a Zernio mark: they are co-branded, not white-label. Trimmed; 1 to 60 characters. Rejected with 400 `INVALID_FIELD_VALUE` without `signup=hosted` or `welcome=true`. Sealed into the page link at issue time, so editing the URL cannot change it.
- **primaryColor** (optional) in query: Hex colour (`#RRGGBB`) for the primary button on the hosted WhatsApp signup page (`signup=hosted`) or the welcome screen (`welcome=true`). Validated server-side; anything else is a 400 `INVALID_FIELD_VALUE`. Rejected without one of the two.
- **welcome** (optional) in query: Any platform. When `true`, `authUrl` points to a Zernio-hosted welcome screen that shows your brand next to the platform ("<brandName> wants to connect to your <platform>") with a Continue button; Continue sends the user to the platform's own authorization screen and the rest of the flow is unchanged. `brandName`, `logoUrl`, `primaryColor` and `welcomeTheme` are optional and default to Zernio's own name, mark and look. The link is valid for 30 minutes, after which the page asks the user to start again. The brand also carries to the account and channel pickers Zernio shows after authorization, and when you pass no `redirect_url` the flow ends on a branded Zernio-hosted page saying whether the account connected, instead of the Zernio dashboard. Cannot be combined with `headless=true` or `signup=hosted` (400 `INVALID_FIELD_VALUE`). The platform's authorization screen still names the Zernio app.
- **welcomeTheme** (optional) in query: Welcome screen only (`welcome=true`): a URL-encoded JSON object that restyles and rewords the screen. All keys are optional. Copy: `heading` (up to 120 characters), `trustLine` and `consentLine` (up to 200 each), `buttonLabel` (up to 30); each may contain the placeholders `{brand}` and `{platform}`. Style: `primaryColor`, `pageColor`, `cardColor` and `textColor` as `#RRGGBB`, `cornerRadius` as an integer from 0 to 24 (pixels), `font` as `sans`, `serif` or `mono`. A `primaryColor` here wins over the `primaryColor` parameter. Unknown keys, invalid JSON or an invalid value are a 400 `INVALID_FIELD_VALUE`. Rejected without `welcome=true`. Example: `{"heading":"Link your {platform} to {brand}","cardColor":"#FFF7ED","cornerRadius":12}`.
- **logoUrl** (optional) in query: Welcome screen only (`welcome=true`): https URL of your logo, shown in a square tile, so use a square image. Without it the tile shows the first letter of `brandName`, or the Zernio mark when there is no `brandName` either. Rejected with 400 `INVALID_FIELD_VALUE` without `welcome=true`.
- **language** (optional) in query: Hosted signup page only (`signup=hosted`, WhatsApp): language of the page and its follow-along guide. Explainer videos stay in English. Default `en`. Rejected without `signup=hosted`.

### Responses

#### 200: OAuth authorization URL to redirect user to

**Response Body:**

- **authUrl** `string` (uri): URL to redirect your user to for OAuth authorization
- **state** `string`: State parameter for security (handled automatically)

#### 400: Missing/invalid parameters (e.g., invalid profileId format, a non-absolute redirect_url, or a redirect_url too long for X's 500-character state)

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

#### 402: Payment method or enterprise contract required. The authenticated
account hit a billing gate before the connection could proceed.
Three reasons:

  - `free_tier_exceeded`: the team has connected more accounts
    than the free tier allows. Add a payment method on the
    dashboard to continue (the user will be billed per
    additional connected account).

  - `twitter_passthrough`: connecting an X account
    requires a card on file from day one because X API calls
    incur real per-call pass-through costs. Applies to the 1st
    X account, not only the 3rd+.

  - `enterprise_required`: the team is on an enterprise
    contract with a negotiated connected-account cap and has
    reached it. Self-service teams have NO connected-account cap (the
    $1/account rate continues at any scale), so this reason can
    only fire for teams whose contract sets an explicit limit.
    `dashboard_url` deep-links to the enterprise contact page
    rather than the billing tab. The end-user already has a
    card on file; this gate is about contract terms, not card
    collection.

  - `card_verification_required`: the card on file was flagged
    at add time (prepaid, or issued in a different country than
    the billing address) and a one-time verification charge of
    `details.verification_amount_cents` (USD) is pending. The
    charge is credited to the team's usage balance, not a fee.
    `dashboard_url` opens the billing page on the verification
    step; the request succeeds once it is paid.

SDK consumers should switch on `reason` to render the right
prompt. For `free_tier_exceeded`, `twitter_passthrough` and
`card_verification_required`, redirect the end-user to
`dashboard_url`: it opens the add-payment-method drawer on the
Zernio billing page, and the request succeeds once the card is
on file (or verified). For `enterprise_required`, redirect to
`dashboard_url` (the enterprise contact form) to adjust the
contract's limit.


**Response Body:**

- **error** (required) `string`: Human-readable error message suitable for end-user display. (example: "X (Twitter) requires a payment method due to API pass-through costs. Add a payment method to connect an X account.")
- **code** (required) `string`: Machine-readable error code. Stable across versions. - one of: PAYMENT_REQUIRED
- **reason** (required) `string`: Discriminator for which gate fired. - one of: free_tier_exceeded, twitter_passthrough, enterprise_required, card_verification_required
- **documentation_url** `string` (uri): Link to the relevant documentation page. (example: "https://docs.zernio.com/billing/payment-method-required")
- **dashboard_url** `string` (uri): Deep-link to send the end-user to. For
`free_tier_exceeded` and `twitter_passthrough` this opens
the add-payment-method drawer on the Zernio billing page.
For `enterprise_required` this is the Zernio enterprise
contact page.
 (example: "https://zernio.com/dashboard/billing?add_payment_method=1")
- **details** `object`: Structured context for SDK clients that want to render their own UX. Keys vary by `reason`.
  - **free_tier_account_limit** `integer`: How many accounts the free tier allows. Only set when reason=free_tier_exceeded. (example: 2)
  - **current_account_count** `integer`: How many accounts the team currently has connected. Set when reason=free_tier_exceeded or reason=enterprise_required. (example: 5)
  - **has_payment_method** `boolean`: Whether the team currently has a card on file in Stripe. Set when reason=free_tier_exceeded or reason=twitter_passthrough.
  - **verification_amount_cents** `integer`: One-time card verification charge in USD cents, credited to usage. Only set when reason=card_verification_required. (example: 1000)
  - **effective_account_limit** `integer`: The negotiated connected-account cap from the
team's enterprise contract. Self-service teams
have no cap and never receive this reason. Only
set when reason=enterprise_required.
 (example: 2000)

#### 403: No access to profile, BYOK required for AppSumo X, or Snapchat closed beta (code PLATFORM_BETA_RESTRICTED)

#### 404: Profile not found

---

## POST /v1/connect/{platform}

**Complete OAuth callback**

Exchange the OAuth authorization code for tokens and connect the account to the specified profile.

Facebook, Google Business Profile, Snapchat and WhatsApp are not accepted here: their account identity is a destination chosen after OAuth, which this single-shot exchange cannot do. Connect them through the redirect flow from `GET /v1/connect/{platform}`, or, for WhatsApp Embedded Signup, through `POST /v1/connect/whatsapp/embedded-signup`.


### Parameters

- **platform** (required) in path: Social platform to complete the connect for. Discord, Slack and Telegram are absent because they are
served by their own dedicated routes, documented separately.


### Request Body

- **code** (required) `string`: No description
- **state** (required) `string`: No description
- **profileId** (required) `string`: No description

### Responses

#### 200: Account connected

#### 400: Invalid params, or the platform requires choosing a destination (code: platform_requires_destination)

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

#### 402: Payment method or enterprise contract required. The authenticated
account hit a billing gate before the connection could proceed.
Three reasons:

  - `free_tier_exceeded`: the team has connected more accounts
    than the free tier allows. Add a payment method on the
    dashboard to continue (the user will be billed per
    additional connected account).

  - `twitter_passthrough`: connecting an X account
    requires a card on file from day one because X API calls
    incur real per-call pass-through costs. Applies to the 1st
    X account, not only the 3rd+.

  - `enterprise_required`: the team is on an enterprise
    contract with a negotiated connected-account cap and has
    reached it. Self-service teams have NO connected-account cap (the
    $1/account rate continues at any scale), so this reason can
    only fire for teams whose contract sets an explicit limit.
    `dashboard_url` deep-links to the enterprise contact page
    rather than the billing tab. The end-user already has a
    card on file; this gate is about contract terms, not card
    collection.

  - `card_verification_required`: the card on file was flagged
    at add time (prepaid, or issued in a different country than
    the billing address) and a one-time verification charge of
    `details.verification_amount_cents` (USD) is pending. The
    charge is credited to the team's usage balance, not a fee.
    `dashboard_url` opens the billing page on the verification
    step; the request succeeds once it is paid.

SDK consumers should switch on `reason` to render the right
prompt. For `free_tier_exceeded`, `twitter_passthrough` and
`card_verification_required`, redirect the end-user to
`dashboard_url`: it opens the add-payment-method drawer on the
Zernio billing page, and the request succeeds once the card is
on file (or verified). For `enterprise_required`, redirect to
`dashboard_url` (the enterprise contact form) to adjust the
contract's limit.


**Response Body:**

- **error** (required) `string`: Human-readable error message suitable for end-user display. (example: "X (Twitter) requires a payment method due to API pass-through costs. Add a payment method to connect an X account.")
- **code** (required) `string`: Machine-readable error code. Stable across versions. - one of: PAYMENT_REQUIRED
- **reason** (required) `string`: Discriminator for which gate fired. - one of: free_tier_exceeded, twitter_passthrough, enterprise_required, card_verification_required
- **documentation_url** `string` (uri): Link to the relevant documentation page. (example: "https://docs.zernio.com/billing/payment-method-required")
- **dashboard_url** `string` (uri): Deep-link to send the end-user to. For
`free_tier_exceeded` and `twitter_passthrough` this opens
the add-payment-method drawer on the Zernio billing page.
For `enterprise_required` this is the Zernio enterprise
contact page.
 (example: "https://zernio.com/dashboard/billing?add_payment_method=1")
- **details** `object`: Structured context for SDK clients that want to render their own UX. Keys vary by `reason`.
  - **free_tier_account_limit** `integer`: How many accounts the free tier allows. Only set when reason=free_tier_exceeded. (example: 2)
  - **current_account_count** `integer`: How many accounts the team currently has connected. Set when reason=free_tier_exceeded or reason=enterprise_required. (example: 5)
  - **has_payment_method** `boolean`: Whether the team currently has a card on file in Stripe. Set when reason=free_tier_exceeded or reason=twitter_passthrough.
  - **verification_amount_cents** `integer`: One-time card verification charge in USD cents, credited to usage. Only set when reason=card_verification_required. (example: 1000)
  - **effective_account_limit** `integer`: The negotiated connected-account cap from the
team's enterprise contract. Self-service teams
have no cap and never receive this reason. Only
set when reason=enterprise_required.
 (example: 2000)

#### 403: No access to the profile, or BYOK required for AppSumo X

#### 404: Profile not found

#### 500: Internal error while connecting the account

#### 502: The platform rejected the token exchange (type: platform_error; an upstream 4xx status is forwarded instead of 502)

#### 503: Connections for this platform are temporarily disabled (code: platform_disabled)

---


# Related Schema Definitions

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