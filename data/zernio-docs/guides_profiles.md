# Profiles

Create a profile, connect accounts into it (several of the same platform if you like), move accounts between profiles, and rename or delete it later.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

When you finish this page you have a profile with an account connected into it, with its `accountId`.

You also know how to add more accounts to it, move accounts between profiles, and rename or delete a profile.

You need an API key.

A profile is a folder for accounts: one per brand, per client or per user when you [build a platform](/multi-tenant). Every team starts with a profile named "Default". Every connected account lives in exactly one profile.

**Cost.** Profiles are free. Only [connected accounts](/pricing#what-counts-as-a-connected-account) are metered, so 10 profiles with 1 account each cost the same as 1 profile with 10 accounts.

Legacy Stripe and AppSumo plans keep their profile cap. When it is full, `POST /v1/profiles` returns `403`.

**Several accounts.** A profile holds any number of accounts, including several of the same platform. Three Instagram accounts, two TikTok accounts and five Facebook Pages can share one profile.

Connecting an account the profile already has refreshes that account instead of adding a copy. `reconnectAccountId` on the connect call targets one specific account.

**Ad accounts** are the exception. A profile holds one ad account per ads platform (one Meta ad account, one Google Ads account, and so on).

You only need more than one profile when you want to keep accounts apart, for example one profile per client.

## Step 1: Create a profile

Call `POST /v1/profiles` with a `name`. Names are unique within a team.

Add `externalId` to tag the profile with your own id for it (a customer or tenant id when you [build a platform](/multi-tenant)). It is unique among your profiles, `GET /v1/profiles?externalId=` finds the profile, and webhooks carry it back.

Send an `Idempotency-Key` header if your client retries ([idempotency](/guides/idempotency)).

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
import Zernio from '@zernio/node';

const zernio = new Zernio();

const { data: created } = await zernio.profiles.createProfile({
  body: { name: 'Second brand', color: '#4CAF50' },
});

const profileId = created.profile._id;
```
</Tab>
<Tab value="Python">
```python
from zernio import Zernio

client = Zernio()

created = client.profiles.create_profile(name="Second brand", color="#4CAF50")

profile_id = created["profile"]["_id"]
```
</Tab>
<Tab value="curl">
```bash
curl -X POST "https://zernio.com/api/v1/profiles" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Second brand", "color": "#4CAF50" }'
```
</Tab>
</Tabs>

Response (`201`):

```json
{
  "message": "Profile created successfully",
  "profile": {
    "_id": "66a1f0c2a4b9d3e8f1a2b3c4",
    "userId": "66a0e8b1c2d3e4f5a6b7c8d9",
    "name": "Second brand",
    "color": "#4CAF50",
    "externalId": null,
    "isDefault": false,
    "createdAt": "2026-09-08T10:00:00Z"
  }
}
```

`profile._id` is the `profileId` for Step 2.

To add accounts to an existing profile, skip this step and use that profile's id.

You can also create a profile in the [dashboard](https://zernio.com/dashboard). Pick the profile in the Connections page's profile selector and its id shows next to it with a copy button.

## Step 2: Connect the account into it

Call `GET /v1/connect/{platform}` with the `profileId`.

Send the user's browser to the returned `authUrl`. They sign in with the account to connect.

Repeat the call to connect more accounts of the same platform into the profile. Each different account becomes its own `accountId`.

On Facebook, Instagram and LinkedIn one sign-in can add several Pages or organizations at once.

The [connecting accounts guide](/guides/connecting-accounts) covers headless mode and the platforms that add a Page or organization selection step.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: connect } = await zernio.connect.getConnectUrl({
  path: { platform: 'tiktok' },
  query: { profileId, redirect_url: 'https://your-app.com/callback' },
});

console.log(connect.authUrl);
```
</Tab>
<Tab value="Python">
```python
connect = client.connect.get_connect_url(
    platform="tiktok",
    profile_id=profile_id,
    redirect_url="https://your-app.com/callback",
)

print(connect["authUrl"])
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/connect/tiktok?profileId=66a1f0c2a4b9d3e8f1a2b3c4&redirect_url=https://your-app.com/callback" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "authUrl": "https://www.tiktok.com/v2/auth/authorize?client_key=...",
  "state": "..."
}
```

## Step 3: Get the account id

When the user lands back on your `redirect_url`, the query string carries `accountId` and `username` for the account they just connected. Posts target accounts by that id.

To look it up instead, call `GET /v1/accounts` with `profileId` and `platform`, and match the `username`.

A profile can hold several accounts of the platform, so do not take the first one.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```typescript
const { data: listed } = await zernio.accounts.listAccounts({
  query: { profileId, platform: 'tiktok' },
});

const accountId = listed.accounts.find((account) => account.username === 'secondbrand')?._id;
```
</Tab>
<Tab value="Python">
```python
listed = client.accounts.list_accounts(profile_id=profile_id, platform="tiktok")

account_id = next(a["_id"] for a in listed["accounts"] if a["username"] == "secondbrand")
```
</Tab>
<Tab value="curl">
```bash
curl "https://zernio.com/api/v1/accounts?profileId=66a1f0c2a4b9d3e8f1a2b3c4&platform=tiktok" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Response (`200`):

```json
{
  "accounts": [
    {
      "_id": "66b2e19d8c3f5a7e9d0b1c2d",
      "platform": "tiktok",
      "username": "secondbrand",
      "displayName": "Second Brand",
      "isActive": true,
      "profileId": { "_id": "66a1f0c2a4b9d3e8f1a2b3c4", "name": "Second brand", "externalId": null }
    }
  ]
}
```

`accounts[]._id` is the `accountId` you pass in `platforms[]` on `POST /v1/posts`.

## Move an account to another profile

Call `PATCH /v1/accounts/{accountId}` with `{ "profileId": "<target profile id>" }` ([Move account to another profile](/accounts/move-account-to-profile)).

The account keeps its id, posts and analytics. Its linked ad accounts move with it.

A `409` means one of two things:

- The target profile already has that same account.
- The target profile already has an ad account of the same ads platform.

## Rename or delete a profile

`GET /v1/profiles` lists them, default first, with exact-match `name` and `externalId` filters and `limit` and `skip` paging.

`PUT /v1/profiles/{profileId}` changes the name, description, color, `externalId` (`null` clears it) and `isDefault`.

`DELETE /v1/profiles/{profileId}` is permanent. An active connected account blocks it with a `400`, so disconnect the accounts first.

Disconnected accounts and provisioned WhatsApp numbers in the profile are moved to another of your profiles rather than deleted.

## If it fails

A `403` on `POST /v1/profiles` means the plan's profile cap is full:

```json
{
  "error": "Profile limit reached. Your Build plan allows 10 profiles. You currently have 10.",
  "planName": "Build",
  "limit": 10,
  "current": 10,
  "details": {
    "resource": "profiles",
    "plan": "Build",
    "currentUsage": 10,
    "limit": 10,
    "window": "total"
  }
}
```

Delete a profile you no longer use, or move the team to usage-based billing, which has no profile cap.

This response predates the error envelope and carries no `type` or `code`. Branch on the status and `details.resource`.

A `409` means a profile with that name already exists:

```json
{
  "error": "A profile with this name already exists",
  "type": "invalid_request_error",
  "code": "profile_name_conflict",
  "param": "name",
  "details": { "existingProfileId": "66a1f0c2a4b9d3e8f1a2b3c4" }
}
```

Use `details.existingProfileId` instead of creating another, or pick a different name.

A profile of yours that already has the `externalId` you sent returns the same `409` with `code: "profile_external_id_conflict"` and `param: "externalId"`, on create and on update.

A request that reuses an `Idempotency-Key` still in flight also returns `409`, with code `idempotency_conflict`. Retry that one after the first completes.

## Related

- [Create profile](/profiles/create-profile), [List profiles](/profiles/list-profiles) and [Delete profile](/profiles/delete-profile).
- [Start OAuth](/connect/get-connect-url): the `profileId` parameter.
- [List accounts](/accounts/list-accounts): filter by `profileId`.
- [Move account to another profile](/accounts/move-account-to-profile).
- [Build a platform](/multi-tenant): one profile per customer.
- [Pricing](/pricing#what-counts-as-a-connected-account): what counts as a connected account.