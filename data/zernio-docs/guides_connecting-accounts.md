# Connecting accounts

Connect an account to a profile with OAuth, a hosted or headless selection step, or credentials for Bluesky, Telegram, Shopify and self-hosted WordPress.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';


By the end of this page, an account is connected to a profile and you have its `accountId`.

You need an API key, a profile id ([create a profile](/profiles/create-profile)) and a login on the platform.

Most platforms connect with OAuth. Bluesky, Telegram, Shopify and self-hosted WordPress have their own flows, covered at the end. Rules for a single platform are on its [platform page](/platforms).

## OAuth flow (most platforms)

Call `GET /v1/connect/{platform}` with your `profileId`. Zernio returns an `authUrl`.

`{platform}` is one of these values:

<PlatformConnectTable />

Send the user's browser there. When they approve, the platform sends them back and the account is connected.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4';

const { data: connect } = await zernio.connect.getConnectUrl({
  path: { platform: 'linkedin' },
  query: { profileId, redirect_url: 'https://myapp.com/callback' }
});
// Send the user's browser to connect.authUrl
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()
profile_id = "66a1f0c2a4b9d3e8f1a2b3c4"

connect = client.connect.get_connect_url(
    platform="linkedin",
    profile_id=profile_id,
    redirect_url="https://myapp.com/callback",
)
# Send the user's browser to connect["authUrl"]
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/connect/linkedin?profileId=66a1f0c2a4b9d3e8f1a2b3c4&redirect_url=https://myapp.com/callback" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "authUrl": "https://www.linkedin.com/oauth/v2/authorization?client_id=..."
}
```

After approval, the user lands on your `redirect_url` with these params added:

- `connected`, `profileId`, `accountId` and `username`
- `request_id` and `stage`, the [correlation params](#request-ids)

Your own query string is kept, but a param with the same name as one of ours is overwritten.

`redirect_url` must be an absolute http(s) URL or an app scheme such as `myapp://callback`. A relative path fails with `400 INVALID_REDIRECT_URL`, and a malformed `profileId` with `400`. The [Start OAuth endpoint](/connect/get-connect-url) lists every parameter.

## Scopes

By default, the flow asks for every scope Zernio supports on the platform.

To ask for less, pass `scopes` with the areas you use: `posting`, `analytics`, `comments`, `messaging`, `ads`.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: connect } = await zernio.connect.getConnectUrl({
  path: { platform: 'linkedin' },
  query: { profileId, scopes: 'posting,analytics', redirect_url: 'https://myapp.com/callback' }
});
```
</Tab>
<Tab value="Python">
```python
connect = client.connect.get_connect_url(
    platform="linkedin",
    profile_id=profile_id,
    scopes="posting,analytics",
    redirect_url="https://myapp.com/callback",
)
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/connect/linkedin?profileId=66a1f0c2a4b9d3e8f1a2b3c4&scopes=posting,analytics&redirect_url=https://myapp.com/callback" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

The consent screen then lists only the scopes behind those areas. It also keeps the ones every connection needs: identity, token refresh, and listing the Pages, organizations or channels to pick from. Each platform page shows which area asks for each scope, and the [Start OAuth endpoint](/connect/get-connect-url) has the full table.

<Callout type="warn">
A `posting`-only account cannot read analytics or the inbox, and it skips first comments (they need `comments`). To add areas, the user connects again.
</Callout>

Scopes the user was never asked for are missing from the account's `permissions`. [Account health](/accounts/get-all-accounts-health) reports them as not granted, through `canPost` and `canFetchAnalytics`.

`scopes` works on Facebook, Instagram (both login methods), LinkedIn, X, TikTok, YouTube, Threads, Reddit, Pinterest, Google Business Profile and Slack (`GET /v1/connect/slack`).

Bluesky, Telegram, Discord, Snapchat and WhatsApp reject it with `400 INVALID_FIELD_VALUE`, because their consent screen cannot be reduced. An empty list or an unknown area gets the same error.

## Platforms requiring secondary selection

Six platforms need one more step after OAuth: the user picks which Page, organization, board, location or public profile to connect.

| Platform | What to select | Endpoints |
|----------|---------------|-----------|
| Facebook | Page | [List Pages](/connect/list-facebook-pages) → [Select Page](/connect/select-facebook-page) |
| LinkedIn | Organization or personal profile | [List orgs](/connect/list-linkedin-organizations) → [Select org](/connect/select-linkedin-organization) |
| Pinterest | Board | [List boards](/connect/list-pinterest-boards-for-selection) → [Select board](/connect/select-pinterest-board) |
| Google Business Profile | Location | [List locations](/connect/list-google-business-locations) → [Select location](/connect/select-google-business-location) |
| Snapchat | Public profile | [List profiles](/connect/list-snapchat-profiles) → [Select profile](/connect/select-snapchat-profile) |
| Instagram (`loginMethod=facebook_login` only) | Page with a linked Instagram account | [List Pages](/connect/list-instagram-pages) → [Select account](/connect/select-instagram-account) |

Instagram needs it only with `loginMethod=facebook_login`, to pick the Page. The default Instagram Login has no selection step. Both modes below work for it, and the [Instagram page](/platforms/instagram#login-methods) explains the two login methods.

### Standard vs headless mode

**Standard mode** (default). Zernio hosts the selection screen. The user picks there, then lands on your `redirect_url`.

**Headless mode**. You build the selection screen. Pass `headless=true` when you start the flow.

In headless mode, the user lands on your `redirect_url` after OAuth with four params: `tempToken`, `userProfile` (JSON, encoded twice), `step` and `connect_token`. Your backend passes them to the list and select endpoints.

`step` names the selection endpoint to call next:

| `step` | Platform |
|--------|----------|
| `select_page` | Facebook |
| `select_organization` | LinkedIn |
| `select_board` | Pinterest |
| `select_location` | Google Business Profile |
| `select_public_profile` | Snapchat |
| `select_phone_number` | WhatsApp |
| `select_account` | Instagram via Facebook Login |

Instagram sends no `userProfile`, because its select-account endpoint does not take one.

Here is the headless flow for a Facebook Page. Start it like any OAuth flow, with `headless: true`:

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: start } = await zernio.connect.getConnectUrl({
  path: { platform: 'facebook' },
  query: { profileId, headless: true, redirect_url: 'https://your-app.com/cb' },
});
// Send the user's browser to start.authUrl
```
</Tab>
<Tab value="Python">
```python
start = client.connect.get_connect_url(
    platform="facebook",
    profile_id=profile_id,
    headless=True,
    redirect_url="https://your-app.com/cb",
)
# Send the user's browser to start["authUrl"]
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/connect/facebook?profileId=66a1f0c2a4b9d3e8f1a2b3c4&headless=true&redirect_url=https://your-app.com/cb" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "authUrl": "https://www.facebook.com/v21.0/dialog/oauth?client_id=..."
}
```

After consent, Meta sends the user to your callback:

```
https://your-app.com/cb?profileId=...&tempToken=...&userProfile=...&platform=facebook&step=select_page&connect_token=...
```

In that handler, read `tempToken` and `userProfile` from the URL. `userProfile` is encoded twice: after your framework decodes the query string, decode it once more, then parse the JSON. `tempToken` and `connect_token` are plain values.

Then list the Pages the user manages:

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
// requestUrl: the URL your handler received; searchParams decodes the values once
const { tempToken, userProfile: encodedProfile } = Object.fromEntries(new URL(requestUrl).searchParams);
const userProfile = JSON.parse(decodeURIComponent(encodedProfile));

const { data: pages } = await zernio.connect.facebook.listFacebookPages({
  query: { profileId, tempToken },
});
```
</Tab>
<Tab value="Python">
```python
import json
from urllib.parse import parse_qs, unquote, urlparse

# request_url: the URL your handler received; parse_qs decodes the values once
query = parse_qs(urlparse(request_url).query)
temp_token = query["tempToken"][0]
user_profile = json.loads(unquote(query["userProfile"][0]))

pages = client.connect.list_facebook_pages(
    profile_id=profile_id,
    temp_token=temp_token,
)
```
</Tab>
<Tab value="curl">
```bash
# TEMP_TOKEN holds tempToken from the callback query string
curl "https://zernio.com/api/v1/connect/facebook/select-page?profileId=66a1f0c2a4b9d3e8f1a2b3c4&tempToken=$TEMP_TOKEN" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "pages": [
    { "id": "123456789", "name": "My Brand Page", "username": "mybrand", "category": "Brand" }
  ]
}
```

Connect the chosen Page with `POST /v1/connect/facebook/select-page`. Pass `userProfile` as the decoded object, not the encoded string:

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: result } = await zernio.connect.facebook.selectFacebookPage({
  body: {
    profileId,
    pageId: pages.pages[0].id,
    tempToken,
    userProfile,
    redirect_url: 'https://your-app.com/final-success',
  },
});
// Send the browser to result.redirect_url
```
</Tab>
<Tab value="Python">
```python
result = client.connect.select_facebook_page(
    profile_id=profile_id,
    page_id=pages["pages"][0]["id"],
    temp_token=temp_token,
    user_profile=user_profile,
    redirect_url="https://your-app.com/final-success",
)
# Send the browser to result["redirect_url"]
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/connect/facebook/select-page" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "66a1f0c2a4b9d3e8f1a2b3c4",
    "pageId": "123456789",
    "tempToken": "'"$TEMP_TOKEN"'",
    "userProfile": { "id": "1234567890", "username": "mybrand", "displayName": "My Brand Page" },
    "redirect_url": "https://your-app.com/final-success"
  }'
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "message": "Facebook page connected successfully",
  "redirect_url": "https://your-app.com/final-success?connected=facebook&profileId=66a1f0c2a4b9d3e8f1a2b3c4&accountId=66b2e19d8c3f5a7e9d0b1c2d&username=My+Brand+Page&request_id=...&stage=select_page",
  "account": {
    "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
    "platform": "facebook",
    "username": "mybrand",
    "isActive": true,
    "selectedPageName": "My Brand Page"
  }
}
```

`account.accountId` is the new account's id.

### Connect Meta Ads only (skip the Page picker)

If your user only needs ads, start at `GET /v1/connect/facebook/ads` instead. Ads covers audience uploads, the [Conversions API](/platforms/meta-ads/capi), analytics, and listing ads and campaigns.

Your backend picks the first Page, so there is no picker. The user goes from Meta's consent screen straight to your "Connected" screen.

This is the classic login (`loginMode=classic`, the default). To connect ads without a posting account, use [Facebook Login for Business](#facebook-login-for-business).

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: adsStart } = await zernio.connect.connectAds({
  path: { platform: 'facebook' },
  query: { profileId, headless: true, redirect_url: 'https://your-app.com/cb' },
});
// Send the user's browser to adsStart.authUrl, then list and select
// as above with pages.pages[0].id and no picker.
```
</Tab>
<Tab value="Python">
```python
ads_start = client.connect.connect_ads(
    platform="facebook",
    profile_id=profile_id,
    headless=True,
    redirect_url="https://your-app.com/cb",
)
# Send the user's browser to ads_start["authUrl"], then list and select
# as above with pages["pages"][0]["id"] and no picker.
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/connect/facebook/ads?profileId=66a1f0c2a4b9d3e8f1a2b3c4&headless=true&redirect_url=https://your-app.com/cb" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
# then list and select as above, passing the first page id and showing no picker
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "authUrl": "https://www.facebook.com/v21.0/dialog/oauth?client_id=..."
}
```

The callback, list and select calls are the same as in the headless flow above.

The select response adds `adsAccountId`, in the body and on `redirect_url`. It is the `metaads` account, created alongside the Facebook account: use it with the `/v1/ads` endpoints. It is absent when the ads account could not be created, and `account.accountId` is still the Facebook posting account. `POST /v1/connect/instagram/select-account` works the same way on an Instagram ads connect (`loginMethod=facebook_login`).

**Does the first Page matter?** For roughly 70% of the `metaads` API, no: everything that does not send `object_story_spec.page_id` works with whichever Page is bound.

The other 30% is Page-specific: boosting Page posts, [Click-to-WhatsApp ads](/platforms/meta-ads/ctwa#click-to-whatsapp-ads) and Lead Gen Forms. When your user needs those for a particular Page, show a picker then and POST the new `pageId` to `/v1/connect/facebook/select-page`. Zernio updates the Facebook account in place, with no second OAuth.

If the profile had no Facebook account for that Page, the one created here has `enabled: false`: hidden, not postable and not billed. See [Connections and billing](/platforms/meta-ads#connections-and-billing).

#### Facebook Login for Business

Call [`GET /v1/connect/{platform}/ads`](/connect/connect-ads) with `platform` set to `facebook` or `instagram`, plus `profileId` and `loginMode=business`. Without `loginMode`, the flow is `classic`.

```
GET /v1/connect/facebook/ads?profileId=...&loginMode=business
```

Business login always returns an `authUrl` to open in the user's browser. The callback creates or reconnects a standalone `metaads` account with a Business Integration System User token. No posting account is created or needed.

`GET /v1/accounts` marks it with `metadata.tokenType: "system-user"`. When Meta returns no `expires_in`, `tokenExpiresAt` is absent, and Zernio does not re-exchange it as a personal token.

Pick the granted Facebook Page used for ad creatives and lead forms:

- Pass `pageId` on the connect request to choose a specific granted Page. A `pageId` outside the grant fails with `page_not_granted`.
- Without `pageId`, a reconnect reuses the previous Page; a new connection binds the first granted Page. Change the default later with `PUT /v1/accounts/{accountId}/facebook-page`.
- With zero granted Pages, the connection is refused with `no_pages_granted`.

The Pages live on the `metaads` account; no Facebook account is created. [Connections and billing](/platforms/meta-ads#connections-and-billing) covers how this relates to organic Facebook and Instagram accounts, and which accounts bill.

**Reconnecting** keeps the connection's id and history. Re-run the dialog to add, drop or swap ad accounts.

The new grant must share at least one ad account with the connection. A grant with none in common is refused before anything changes, with `error=invalid_field_value` and `error_reason=reconnect_mismatch`. To move to unrelated ad accounts, disconnect and connect again.

On an accepted reconnect, the ad-account scope is rebuilt from the new grant:

- `adAccountIds` passed on the re-auth become the scope.
- Otherwise, a narrowed scope keeps its still-granted ad accounts, plus any granted for the first time.
- An unscoped connection follows the new grant.

**Errors.** Every failure after Meta's dialog redirects to `redirect_url` with `error`, `platform=metaads`, `error_message`, `request_id` and `stage`. `is_user_fixable` and `error_reason` are added when known. `error` is the API error code:

| `error` | `error_reason` | Meaning |
|---------|----------------|---------|
| `invalid_field_value` | `no_pages_granted` | No Page was ticked in Meta's dialog. |
| `invalid_field_value` | `page_not_granted` | The `pageId` you passed is not in the grant. |
| `invalid_field_value` | `ad_accounts_not_granted` | No ad account was granted. |
| `invalid_field_value` | `reconnect_mismatch` | The grant shares no ad account with the existing connection. |
| `invalid_state` | `state_expired` | The user came back after the 30-minute window. Start again. |
| `connection_failed` | | Meta refused the code, for example a replayed callback. |

The gates of `GET /v1/connect/{platform}` arrive the same way: `reconnect_required`, `ads_addon_required`, `payment_required` and the profile gates. A denial in the dialog is `meta_ads_authorization_denied`, with the `platform_error*` params from [If it fails](#if-it-fails).

Only a state that cannot be decrypted at all still answers with `400` JSON, because it names no `redirect_url`.

#### Scoping sync to specific ad accounts

By default, sync covers every `act_*` ad account the Meta token can see.

That is fine for one person's account. For agencies and setups with several Business Managers it leaks: the token sees every account in every Business Manager the user has a role on.

To sync an allowlist instead, pass `adAccountId` (one) or `adAccountIds` (several) on `GET /v1/connect/facebook/ads`:

```
?adAccountId=act_1330190928038136
?adAccountIds=act_1330190928038136,act_3686966528111132
```

Zernio checks each id against the token's `/me/adaccounts` and stores the list. The latest connect wins: new ids replace the earlier list. Omit both params to sync everything the token can see.

To confirm what was synced, read the `account.ads.initial_sync_completed` webhook. It always carries `account.platformAdAccountIds`, and `account.platformAdAccountId` when the scope is exactly one account.

## Credential and store-specific connections

### Bluesky

Bluesky connects with an app password.

Pass `state` as `{userId}-{profileId}`. `userId` is `currentUserId` from `GET /v1/users`, and `profileId` comes from `GET /v1/profiles`.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: bluesky } = await zernio.connect.bluesky.connectBlueskyCredentials({
  body: {
    identifier: 'yourhandle.bsky.social',
    appPassword: 'your-app-password',
    state: '66a0e8b1c2d3e4f5a6b7c8d9-66a1f0c2a4b9d3e8f1a2b3c4',
  },
});
console.log(`Connected ${bluesky.account.username}`);
```
</Tab>
<Tab value="Python">
```python
bluesky = client.connect.connect_bluesky_credentials(
    identifier="yourhandle.bsky.social",
    app_password="your-app-password",
    state="66a0e8b1c2d3e4f5a6b7c8d9-66a1f0c2a4b9d3e8f1a2b3c4",
)
print(f"Connected {bluesky['account']['username']}")
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/connect/bluesky/credentials" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "yourhandle.bsky.social",
    "appPassword": "your-app-password",
    "state": "66a0e8b1c2d3e4f5a6b7c8d9-66a1f0c2a4b9d3e8f1a2b3c4"
  }'
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "message": "Bluesky connected successfully",
  "account": {
    "platform": "bluesky",
    "username": "yourhandle.bsky.social",
    "displayName": "Your Name",
    "isActive": true
  }
}
```

The [Connect Bluesky endpoint](/connect/connect-bluesky-credentials) lists every field.

### Telegram

Telegram connects with an access code:

1. Call `GET /v1/connect/telegram` to [generate an access code](/connect/get-telegram-connect-status), valid for 15 minutes.
2. The user adds the Zernio Telegram bot as an admin of the channel or group and sends it the code.
3. Poll `PATCH /v1/connect/telegram` to [check the status](/connect/complete-telegram-connect) until it reports connected.

If the bot is already an admin of the channel or group, skip the code and [connect directly](/connect/initiate-telegram-connect) with `POST /v1/connect/telegram` and the chat id.

### Shopify

Shopify uses OAuth, but the authorization URL is built per store. You need the merchant's `myshopify.com` domain first, because Shopify has no store picker and no way to look up a merchant's shops.

1. Collect the store domain from the merchant (`your-store.myshopify.com`; the bare `your-store` prefix is accepted).
2. Call `GET /v1/connect/shopify` with `profileId` and `shop` to [get the authorization URL](/connect/get-shopify-connect-url).
3. Redirect the merchant to the returned `authUrl`; after approval they land on your `redirect_url`.

A merchant who installs from the Shopify App Store never types the domain: Shopify sends it to Zernio directly.

**Without the browser flow.** The merchant creates a custom app in their Shopify admin with the `read_content`, `write_content`, `read_products` and `write_products` scopes, and gives you its Admin API access token. You [exchange it for a connected store](/connect/connect-shopify-with-token) with `POST /v1/connect/shopify/token`.

`shop` is required there too, because an Admin token does not identify its own store.

A connected store publishes no social posts. It powers the [Blogs API](/blogs/list-blogs) and the [Commerce API](/guides/commerce); see the [Shopify page](/platforms/shopify).

### WordPress

WordPress has two ways to connect.

**WordPress.com.** Call `GET /v1/connect/wordpress` with `profileId` and `redirect_url`, then send the user to the returned `authUrl`. WordPress.com shows its own consent screen and returns the chosen site in the callback. See [Get WordPress.com authorization URL](/connect/get-wordpress-auth-url).

**Self-hosted.** Create an Application Password in the site's WordPress admin. Send the site's HTTPS URL, the login username and the Application Password to [`POST /v1/connect/wordpress/token`](/connect/connect-wordpress-with-application-password).

Zernio finds the site's REST API and checks that the user can publish posts and upload media before saving the account. Do not put the username or the Application Password in `siteUrl`.

Each WordPress account is one site with one blog. It publishes no social posts: use the [Blogs API](/blogs/list-blogs) and the [WordPress guide](/platforms/wordpress). A self-hosted site running WooCommerce is also a store for the [Commerce API](/guides/commerce).

## Change a selection without reconnecting

Change the Page, organization, board, location or subreddit of an existing account, without a second OAuth:

- [Update Facebook Page](/connect/update-facebook-page)
- [Update LinkedIn organization](/connect/update-linkedin-organization)
- [Update Pinterest board](/connect/update-pinterest-boards)
- [Update Google Business Profile location](/connect/update-gmb-location)
- [Update Reddit subreddit](/connect/update-reddit-subreddits)

## If it fails

When the user denies consent or the platform rejects the callback, the browser lands on your `redirect_url` with `error` and `platform` added:

```
?error=oauth_denied&platform=linkedin&request_id=...&stage=authorize
```

Check for `error` first, before reading any success param. Treat an unknown value as a generic failure, because new values are added without notice. The [Start OAuth endpoint](/connect/get-connect-url) lists the known ones.

`error` and `platform` are always present. The rest are optional:

| Param | Meaning |
|-------|---------|
| `error_message` | Human-readable explanation you can show the user. |
| `is_user_fixable` | `true` when the user can fix it by connecting again (for example they cancelled, declined a permission or ticked no Page). |
| `error_reason` | Finer reason for some `error` values, listed below. |
| `platform_error`, `platform_error_reason`, `platform_error_description` | On `oauth_denied` (and `meta_ads_authorization_denied`), the platform's own values when it sent them, for example `access_denied` and `user_denied`. The description is truncated to 500 characters. |

The internal `headless`, `adsConnect` and `adsScope` markers used during the flow are removed from error redirects.

**`no_facebook_pages`** comes with `is_user_fixable=true` and an `error_message`. Ask the user to connect again, click "Edit previous settings" in Meta's dialog and tick the Page, or create a Page first.

When Meta's token debug answered, `error_reason` says which case it is:

| `error_reason` | Meaning |
|----------------|---------|
| `pages_permission_declined` | The user declined the `pages_show_list` permission. |
| `no_pages_granted` | The permission was granted with no Page ticked. A user who manages no Page looks the same to Meta, so this covers both. |
| `granted_pages_not_listed` | Pages were ticked, but Meta listed none the user can manage. |

### Request ids

Every redirect from an OAuth callback carries `request_id` and `stage`, on success and on failure. So does the `redirect_url` returned by the selection endpoints: select-page, select-account, select-organization, select-board, select-location, select-profile and select-phone-number.

Every API response also carries an `X-Request-Id` header. Quote `request_id` or `X-Request-Id` when you contact support: it is the id we log that request under.

`stage` says where the flow ended:

- `authorize`: the platform's consent dialog returned an error or denial instead of a code.
- `callback`: Zernio processed the returned code (success, a selection step or a failure).
- `select_page`: a selection endpoint completed the flow.

### Billing gates

The connect call itself returns `402` when billing blocks it:

```json
{
  "error": "X (Twitter) requires a payment method due to API pass-through costs. Add a payment method to connect an X account.",
  "code": "PAYMENT_REQUIRED",
  "reason": "twitter_passthrough",
  "dashboard_url": "https://zernio.com/dashboard?tab=billing"
}
```

`reason` is one of:

- `free_tier_exceeded`: more than the free connected accounts, and no card on file.
- `twitter_passthrough`: any X account without a card.
- `enterprise_required`: a contract cap.

Send the user to `dashboard_url` to fix it.

## Related

- [List accounts](/accounts/list-accounts): every connected account and its `isActive` state.
- [Update an account](/accounts/update-account): change settings such as default Pages or boards.
- [Account health](/accounts/get-all-accounts-health): verify tokens and permissions.
- [Disconnect an account](/accounts/delete-account): remove it from the profile.
- [Instagram](/platforms/instagram#login-methods): Instagram Login versus Facebook Login.