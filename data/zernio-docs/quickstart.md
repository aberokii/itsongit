# Quickstart

Create an API key and make your first calls to the Zernio API. Pick what you are building and run one script, to schedule a post, send a WhatsApp message, reply to a DM or create an ad campaign.

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Cards, Card } from 'fumadocs-ui/components/card';



What do you want to build? This page covers: Publish a post; Send a WhatsApp message; Reply to a DM; Create an ad campaign.

**Publish a post:**

<Checklist title="Before you start">
- A Zernio account ([sign up](https://zernio.com)).
- A login for one of the [16 platforms](/platforms). The example connects LinkedIn.
- A card only if you connect X (`twitter`), because X bills every API call. Your first 2 other accounts need none ([pricing](/pricing)).
</Checklist>

<CopyPrompt
  title="Using a coding agent? Give it this prompt."
  prompt={"Add the Zernio API to this project. Read https://docs.zernio.com/quickstart.mdx first and follow it.\n\n1. Install the official SDK for this project's language (@zernio/node for Node.js, zernio-sdk for Python).\n2. Read the API key from the ZERNIO_API_KEY environment variable. Never hardcode it or commit it.\n3. Create a profile with POST /v1/profiles and keep profile._id.\n4. Get a connect URL with GET /v1/connect/{platform}?profileId=..., print authUrl and ask me to open it and approve.\n5. List accounts with GET /v1/accounts and keep the _id of the account I connected.\n6. Schedule a post with POST /v1/posts, sending content, scheduledFor, timezone and platforms: [{ platform, accountId }].\n7. Confirm it with GET /v1/posts/{postId} and show me post.status.\n\nAsk me which platform to connect before you start, and stop to ask if any call returns an error."}
/>

**Send a WhatsApp message:**

<Checklist title="Before you start">
- A Zernio account ([sign up](https://zernio.com)).
- A phone with WhatsApp on it, to receive the test message.
- Nothing else: no number purchase, no WhatsApp Business Account, no Meta review, and nothing is billed.
</Checklist>

<CopyPrompt
  title="Using a coding agent? Give it this prompt."
  prompt={"Add WhatsApp sending through the Zernio API to this project, using Zernio's shared sandbox number. Read https://docs.zernio.com/platforms/whatsapp/sandbox.mdx first and follow it.\n\n1. Install the official SDK for this project's language (@zernio/node for Node.js, zernio-sdk for Python).\n2. Read the API key from the ZERNIO_API_KEY environment variable. Never hardcode it or commit it.\n3. Call GET /v1/phone-numbers and keep sandbox.accountId and sandbox.template.\n4. Call POST /v1/whatsapp/sandbox/sessions with my phone number, then ask me to reply to the WhatsApp message I receive.\n5. Call GET /v1/whatsapp/sandbox/sessions and continue only when the session status is active.\n6. Send with POST /v1/inbox/conversations, passing the sandbox accountId, my phone as participantId (digits only) and the sandbox template.\n\nAsk me for my phone number in E.164 format before you start, and stop to ask if any call returns an error."}
/>

**Reply to a DM:**

<Checklist title="Before you start">
- A Zernio account ([sign up](https://zernio.com)).
- A connected account on a platform with direct messages ([which ones](/platforms/compare#dms)). To connect one, run the "Publish a post" version first.
- At least one DM sent to that account, so there is a conversation to answer.
</Checklist>

<CopyPrompt
  title="Using a coding agent? Give it this prompt."
  prompt={"Add inbox replies through the Zernio API to this project. Read https://docs.zernio.com/multi-tenant/inbox.mdx first and follow it.\n\n1. Install the official SDK for this project's language (@zernio/node for Node.js, zernio-sdk for Python).\n2. Read the API key from the ZERNIO_API_KEY environment variable. Never hardcode it or commit it.\n3. List conversations with GET /v1/inbox/conversations (status=active) and show me each one's participantName, platform and lastMessage.\n4. Reply with POST /v1/inbox/conversations/{conversationId}/messages, sending the conversation's accountId and a message. In Node.js send an Idempotency-Key header with a new UUID per reply.\n\nEvery reply is a real message to a real person: show me the conversation and the text and wait for my OK before sending. Stop to ask if any call returns an error."}
/>

**Create an ad campaign:**

<Checklist title="Before you start">
- A Zernio account ([sign up](https://zernio.com)).
- A Meta Business account with at least one ad account, and a Facebook Page for the ads to publish as.
- Nothing to spend: the campaign is created paused, with no ads in it. Running ads is billed per active ad ([pricing](/pricing)).
</Checklist>

<CopyPrompt
  title="Using a coding agent? Give it this prompt."
  prompt={"Add Meta ads through the Zernio API to this project. Read https://docs.zernio.com/platforms/meta-ads.mdx first and follow it.\n\n1. Install the official SDK for this project's language (@zernio/node for Node.js, zernio-sdk for Python).\n2. Read the API key from the ZERNIO_API_KEY environment variable. Never hardcode it or commit it.\n3. Create a profile with POST /v1/profiles and keep profile._id.\n4. Call GET /v1/connect/facebook/ads?profileId=... If the response has alreadyConnected, continue; otherwise print authUrl and ask me to open it and approve.\n5. List accounts with GET /v1/accounts and keep the _id of the facebook or metaads account.\n6. Call GET /v1/ads/accounts?accountId=... and keep the ad account id (act_...).\n7. Create a campaign with POST /v1/ads/campaigns, sending accountId, adAccountId, name and goal. Leave status unset so it is created paused.\n\nDo not set status to ACTIVE, add a budget or create ads without asking me first: those spend money. Stop to ask if any call returns an error."}
/>


## Run it

<Steps>
<Step>

### Create an API key

1. [Sign up](https://zernio.com) or log in.
2. Open [API keys](https://zernio.com/dashboard/api-keys) and click **Create API key**.
3. Copy the key now. Zernio stores a SHA-256 hash of it and never shows it again.

A key is `sk_` followed by 64 hex characters (67 in total). Every request to `https://zernio.com/api/v1` sends it in the `Authorization: Bearer` header. The SDKs read it from the `ZERNIO_API_KEY` environment variable.

</Step>
<Step>

### Install the SDK and set the key

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```bash
npm install @zernio/node
export ZERNIO_API_KEY="sk_..."
```
</Tab>
<Tab value="Python">
```bash
pip install zernio-sdk
export ZERNIO_API_KEY="sk_..."
```
</Tab>
<Tab value="curl">
```bash
export ZERNIO_API_KEY="sk_..."
# every request below sends: -H "Authorization: Bearer $ZERNIO_API_KEY"
```
</Tab>
</Tabs>

Create one key per app and rotate keys [through the API](/api-keys/list-api-keys).

Go, Ruby, Java, PHP, .NET and Rust SDKs are on the [SDKs page](/sdks).

</Step>
<Step>

### Run the script

**Publish a post:**

Save this as `quickstart.mjs` (Node.js) or `quickstart.py` (Python) and run it.

It prints a URL, waits while you approve the account in a browser, then schedules the post.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```javascript title="quickstart.mjs"
import Zernio from '@zernio/node';
import { createInterface } from 'node:readline/promises';

const zernio = new Zernio(); // reads ZERNIO_API_KEY

// 1. A profile groups accounts: one per brand, or one per user of your app.
const { data: created } = await zernio.profiles.createProfile({
  body: { name: 'My first profile' }
});

const profileId = created.profile._id;

// 2. Get the URL where the account owner authorizes Zernio, and approve it.
const { data: connect } = await zernio.connect.getConnectUrl({
  path: { platform: 'linkedin' },
  query: { profileId }
});

console.log('Open this URL and approve:', connect.authUrl);
const prompt = createInterface({ input: process.stdin, output: process.stdout });
await prompt.question('Press Enter once the account is connected ');
prompt.close();

// 3. Posts target accounts by _id, not by username.
const { data: listed } = await zernio.accounts.listAccounts();

const accountId = listed.accounts[0]._id;

// 4. Schedule the post. scheduledFor is read in the timezone you send.
const { data: scheduled } = await zernio.posts.createPost({
  body: {
    content: 'Hello world. This is my first post from the Zernio API.',
    scheduledFor: '2027-01-01T12:00:00',
    timezone: 'America/New_York',
    platforms: [
      { platform: 'linkedin', accountId }
    ]
  }
});

const postId = scheduled.post._id;

// 5. Read it back: scheduled now, published after the scheduled time.
const { data: fetched } = await zernio.posts.getPost({
  path: { postId }
});

console.log(fetched.post.status);
```

```bash
node quickstart.mjs
```
</Tab>
<Tab value="Python">
```python title="quickstart.py"
from zernio import Zernio

client = Zernio()  # reads ZERNIO_API_KEY

# 1. A profile groups accounts: one per brand, or one per user of your app.
created = client.profiles.create_profile(name="My first profile")

profile_id = created["profile"]["_id"]

# 2. Get the URL where the account owner authorizes Zernio, and approve it.
connect = client.connect.get_connect_url(
    platform="linkedin",
    profile_id=profile_id,
)

print("Open this URL and approve:", connect["authUrl"])
input("Press Enter once the account is connected ")

# 3. Posts target accounts by _id, not by username.
listed = client.accounts.list_accounts()

account_id = listed["accounts"][0]["_id"]

# 4. Schedule the post. scheduled_for is read in the timezone you send.
scheduled = client.posts.create_post(
    content="Hello world. This is my first post from the Zernio API.",
    scheduled_for="2027-01-01T12:00:00",
    timezone="America/New_York",
    platforms=[
        {"platform": "linkedin", "accountId": account_id}
    ]
)

post_id = scheduled["post"]["_id"]

# 5. Read it back: scheduled now, published after the scheduled time.
fetched = client.posts.get_post(post_id=post_id)

print(fetched["post"]["status"])
```

```bash
python quickstart.py
```
</Tab>
<Tab value="curl">
With curl, run the calls one at a time and carry each id into the next: open [The calls, one by one](#the-calls-one-by-one) and use the curl tab in each.
</Tab>
</Tabs>

The last line it prints is `scheduled`.

**Send a WhatsApp message:**

Put your own phone number in `phone`, save this as `quickstart.mjs` (Node.js) or `quickstart.py` (Python) and run it.

It sends a WhatsApp message to your phone, waits while you reply to it, then sends through the API.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```javascript title="quickstart.mjs"
import Zernio from '@zernio/node';
import { createInterface } from 'node:readline/promises';

const zernio = new Zernio(); // reads ZERNIO_API_KEY

const phone = '+13105551234'; // your own phone, with WhatsApp on it

// 1. Find the shared sandbox number, the account to send from and its template.
const { data: numbers } = await zernio.phonenumbers.listPhoneNumbers();

if (!numbers.sandbox) throw new Error('Sandbox not configured on this environment');
const sandbox = numbers.sandbox;

// 2. Start activation: Zernio sends the sandbox template to your phone.
const { data: started } = await zernio.whatsappsandbox.createWhatsAppSandboxSession({
  body: { phone }
});

console.log('Reply to the WhatsApp message from', started.sandboxNumber);
const prompt = createInterface({ input: process.stdin, output: process.stdout });
await prompt.question('Press Enter once you have replied ');
prompt.close();

// 3. Your reply activates the session.
const { data: sessions } = await zernio.whatsappsandbox.listWhatsAppSandboxSessions();

const session = sessions.sessions[0];
if (session?.status !== 'active') throw new Error('No reply yet: answer the WhatsApp message, then run this again');

// 4. Send to the activated phone.
const { data: opened } = await zernio.messages.createInboxConversation({
  body: {
    accountId: sandbox.accountId,
    participantId: session.phoneE164,
    templateName: sandbox.template.name,
    templateLanguage: sandbox.template.language,
    templateParams: []
  }
});

console.log('Sent. Conversation:', opened.data.conversationId);
```

```bash
node quickstart.mjs
```
</Tab>
<Tab value="Python">
```python title="quickstart.py"
from zernio import Zernio

client = Zernio()  # reads ZERNIO_API_KEY

phone = "+13105551234"  # your own phone, with WhatsApp on it

# 1. Find the shared sandbox number, the account to send from and its template.
numbers = client.phone_numbers.list_phone_numbers()

if not numbers["sandbox"]:
    raise Exception("Sandbox not configured on this environment")
sandbox = numbers["sandbox"]

# 2. Start activation: Zernio sends the sandbox template to your phone.
started = client.whatsapp_sandbox.create_whats_app_sandbox_session(phone=phone)

print("Reply to the WhatsApp message from", started["sandboxNumber"])
input("Press Enter once you have replied ")

# 3. Your reply activates the session.
sessions = client.whatsapp_sandbox.list_whats_app_sandbox_sessions()

session = sessions["sessions"][0] if sessions["sessions"] else None
if not session or session["status"] != "active":
    raise Exception("No reply yet: answer the WhatsApp message, then run this again")

# 4. Send to the activated phone.
opened = client.messages.create_inbox_conversation(
    account_id=sandbox["accountId"],
    participant_id=session["phoneE164"],
    template_name=sandbox["template"]["name"],
    template_language=sandbox["template"]["language"],
    template_params=[],
)

print("Sent. Conversation:", opened["data"]["conversationId"])
```

```bash
python quickstart.py
```
</Tab>
<Tab value="curl">
With curl, run the calls one at a time: the [sandbox guide](/platforms/whatsapp/sandbox) has each one with its response.
</Tab>
</Tabs>

The last line it prints is the conversation id, and the message arrives on your phone.

**Reply to a DM:**

Save this as `quickstart.mjs` (Node.js) or `quickstart.py` (Python) and run it.

It shows the first conversation in your inbox, waits for you to confirm, then replies. The reply is a real message to that person.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```javascript title="quickstart.mjs"
import { randomUUID } from 'crypto';
import Zernio from '@zernio/node';
import { createInterface } from 'node:readline/promises';

const zernio = new Zernio(); // reads ZERNIO_API_KEY

// 1. List the conversations across your connected accounts.
const { data: conversations } = await zernio.messages.listInboxConversations({
  query: { status: 'active', limit: 50 },
});

const conversation = conversations.data[0];
if (!conversation) throw new Error('No conversations yet: send a DM to your connected account, then run this again');

// 2. Check who you are about to answer. This sends a real message.
console.log(`${conversation.participantName} on ${conversation.platform}: ${conversation.lastMessage}`);
const prompt = createInterface({ input: process.stdin, output: process.stdout });
await prompt.question('Press Enter to reply, or Ctrl+C to cancel ');
prompt.close();

// 3. Reply in that conversation, from the account that received it.
const { data: sent } = await zernio.messages.sendInboxMessage({
  path: { conversationId: conversation.id },
  headers: { 'Idempotency-Key': randomUUID() },
  body: {
    accountId: conversation.accountId,
    message: 'Thanks for your message. This reply was sent with the Zernio API.',
  },
});

console.log(sent.data.messageId);
```

```bash
node quickstart.mjs
```
</Tab>
<Tab value="Python">
```python title="quickstart.py"
from zernio import Zernio

client = Zernio()  # reads ZERNIO_API_KEY

# 1. List the conversations across your connected accounts.
conversations = client.messages.list_inbox_conversations(status="active", limit=50)

if not conversations["data"]:
    raise Exception("No conversations yet: send a DM to your connected account, then run this again")
conversation = conversations["data"][0]

# 2. Check who you are about to answer. This sends a real message.
print(f'{conversation["participantName"]} on {conversation["platform"]}: {conversation["lastMessage"]}')
input("Press Enter to reply, or Ctrl+C to cancel ")

# 3. Reply in that conversation, from the account that received it.
sent = client.messages.send_inbox_message(
    conversation_id=conversation["id"],
    account_id=conversation["accountId"],
    message="Thanks for your message. This reply was sent with the Zernio API.",
)

print(sent["data"]["messageId"])
```

```bash
python quickstart.py
```
</Tab>
<Tab value="curl">
With curl, run the two calls yourself: the [inbox guide](/multi-tenant/inbox#step-2-send-replies) has each one with its response.
</Tab>
</Tabs>

The last line it prints is the id of the message it sent.

**Create an ad campaign:**

Save this as `quickstart.mjs` (Node.js) or `quickstart.py` (Python) and run it.

It prints a URL, waits while you approve Meta ads access in a browser, then creates a paused campaign in your first ad account.

<Tabs items={['Node.js', 'Python', 'curl']}>
<Tab value="Node.js">
```javascript title="quickstart.mjs"
import Zernio from '@zernio/node';
import { createInterface } from 'node:readline/promises';

const zernio = new Zernio(); // reads ZERNIO_API_KEY

// 1. A profile groups accounts: one per brand, or one per user of your app.
const { data: created } = await zernio.profiles.createProfile({
  body: { name: 'My first profile' }
});

const profileId = created.profile._id;

// 2. Connect Meta ads. Approve in a browser unless ads are already connected.
const { data: adsStart } = await zernio.connect.connectAds({
  path: { platform: 'facebook' },
  query: { profileId },
});

if (!adsStart.alreadyConnected) {
  console.log('Open this URL and approve:', adsStart.authUrl);
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  await prompt.question('Press Enter once the account is connected ');
  prompt.close();
}

// 3. Find the connected account, then the Meta ad account it can reach.
const { data: listed } = await zernio.accounts.listAccounts();

const account = listed.accounts.find((a) => a.platform === 'facebook' || a.platform === 'metaads');
if (!account) throw new Error('No Facebook or Meta Ads account connected yet');

const { data: adAccounts } = await zernio.adaccounts.listAdAccounts({
  query: { accountId: account._id }
});

const adAccountId = adAccounts.accounts[0].id;

// 4. Create a campaign. It is created paused and has no ads, so it spends nothing.
const { data: campaign } = await zernio.adcampaigns.createAdCampaign({
  body: {
    accountId: account._id,
    adAccountId,
    name: 'Quickstart campaign',
    goal: 'traffic'
  }
});

console.log(campaign.campaignId, campaign.status);
```

```bash
node quickstart.mjs
```
</Tab>
<Tab value="Python">
```python title="quickstart.py"
from zernio import Zernio

client = Zernio()  # reads ZERNIO_API_KEY

# 1. A profile groups accounts: one per brand, or one per user of your app.
created = client.profiles.create_profile(name="My first profile")

profile_id = created["profile"]["_id"]

# 2. Connect Meta ads. Approve in a browser unless ads are already connected.
ads_start = client.connect.connect_ads(platform="facebook", profile_id=profile_id)

if not ads_start.get("alreadyConnected"):
    print("Open this URL and approve:", ads_start["authUrl"])
    input("Press Enter once the account is connected ")

# 3. Find the connected account, then the Meta ad account it can reach.
listed = client.accounts.list_accounts()

account = next((a for a in listed["accounts"] if a["platform"] in ("facebook", "metaads")), None)
if not account:
    raise Exception("No Facebook or Meta Ads account connected yet")

ad_accounts = client.ad_accounts.list_ad_accounts(account_id=account["_id"])

ad_account_id = ad_accounts["accounts"][0]["id"]

# 4. Create a campaign. It is created paused and has no ads, so it spends nothing.
campaign = client.ad_campaigns.create_ad_campaign(
    account_id=account["_id"],
    ad_account_id=ad_account_id,
    name="Quickstart campaign",
    goal="traffic",
)

print(campaign["campaignId"], campaign["status"])
```

```bash
python quickstart.py
```
</Tab>
<Tab value="curl">
With curl, run the calls one at a time. The [Meta Ads page](/platforms/meta-ads#connect) has the connect and ad-account calls.

[Campaigns](/platforms/meta-ads/campaigns#create-a-campaign-only) has the create call.
</Tab>
</Tabs>

The last line it prints is the campaign id and `PAUSED`.


</Step>
</Steps>

## What just happened

**Publish a post:**

- **A profile was created.** A profile groups accounts: one per brand, or one per user of your app.
- **An account was connected to it.** `GET /v1/connect/{platform}` returned the URL where the account owner authorized Zernio.
- **The script looked up the account id.** Posts target accounts by `_id`, not by username.
- **A post was scheduled.** `POST /v1/posts` took the content, the time, the timezone and one `platforms` entry.
- **The status was read back.** It is `scheduled` until the scheduled time, then `publishing`, then `published`.

Every id is a 24-character string in an `_id` field. Each call returns the id the next one needs.

If your users connect their own accounts, the calls are the same with one profile per user: read [Build a platform](/multi-tenant) after your first post.

**Send a WhatsApp message:**

- **The script found the sandbox.** `GET /v1/phone-numbers` returns Zernio's shared WhatsApp number, the `accountId` to send from and its one template under `sandbox`.
- **Your phone was activated.** `POST /v1/whatsapp/sandbox/sessions` sent the `sandbox_start` template to it, and your reply proved you control the phone.
- **The session turned active.** It stays active for 7 days.
- **A message was sent through the inbox.** `POST /v1/inbox/conversations` is the same call that messages any WhatsApp contact; here it used the sandbox account and template.

The sandbox allows one test phone, 50 messages a day and one template.

Your reply also opens a 24-hour window in which free-form text works ([WhatsApp inbox](/platforms/whatsapp/inbox)).

To send to your customers, [get a number of your own](/platforms/whatsapp/phone-numbers) and [connect it](/platforms/whatsapp/connection).

**Reply to a DM:**

- **The script listed your conversations.** `GET /v1/inbox/conversations` returns DMs from every connected account in one list, each with its `platform`, `accountId` and last message.
- **You confirmed the recipient.** Nothing is sent until you press Enter.
- **A reply was sent.** `POST /v1/inbox/conversations/{conversationId}/messages` takes the conversation's `accountId` and the `message`. The `200` means accepted, not yet delivered.

In Node.js the `Idempotency-Key` header stops a retry from sending the reply twice. The Python client takes no key, so a retry from Python sends a second message ([idempotency](/guides/idempotency)).

Each platform sets its own rules on when a business can message a person. The [compare page](/platforms/compare#dms) shows what each one supports.

**Create an ad campaign:**

- **A profile was created.** A profile groups accounts: one per brand, or one per user of your app.
- **Meta ads were connected.** `GET /v1/connect/facebook/ads` returned the URL to approve, or `alreadyConnected` when a connected Facebook account already carries the ads scopes.
- **The script found the ad account.** `GET /v1/ads/accounts` lists the Meta ad accounts the connection can reach; `accounts[].id` is the `adAccountId` for every other ads call.
- **A campaign was created.** `POST /v1/ads/campaigns` creates the container without an ad set or an ad. It is `PAUSED` unless you pass `status: "ACTIVE"`.

Budgets and bids are whole units of the ad account's currency (`75` is $75.00 on a USD account), never cents.

Meta reviews every ad. A successful create means the ad exists, not that it delivers. The same `/v1/ads` endpoints cover [7 ad platforms](/platforms/compare#ads).


## The calls, one by one

**Publish a post:**

The [connecting accounts guide](/guides/connecting-accounts) covers the connect call for every platform, and the API reference has each call with its response: [create a profile](/profiles/create-profile), [list accounts](/accounts/list-accounts), [create a post](/posts/create-post) and [get a post](/posts/get-post).

**Send a WhatsApp message:**

The [sandbox guide](/platforms/whatsapp/sandbox) has each of the four calls in Node.js, Python and curl with the response it returns, plus how to switch to another test phone.

**Reply to a DM:**

The [inbox guide](/multi-tenant/inbox) has both calls in Node.js, Python and curl with their responses, plus the webhooks that push new messages to you.

**Create an ad campaign:**

The [Meta Ads page](/platforms/meta-ads#connect) has the connect and ad-account calls with their responses, and [campaigns](/platforms/meta-ads/campaigns#create-a-campaign-only) has the create call.


## If it fails

**Publish a post:**

A `409` means the same content is already scheduled or was posted to this account in the last 24 hours. Running the script twice causes it:

```json
{
  "error": "This exact content is already scheduled, publishing, or was posted to this account within the last 24 hours.",
  "details": {
    "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
    "platform": "linkedin",
    "existingPostId": "65f1c0a9e2b5af0012ab34cd"
  }
}
```

Change the content, or send an `x-request-id` header so a retry returns the original post instead ([idempotency](/guides/idempotency)).

Every error uses the same envelope, described in [error handling](/guides/error-handling).

**Send a WhatsApp message:**

A `400` when you start activation while another phone still has a session names that phone, so you can revoke it first:

```json
{
  "error": "You can only test one phone at a time. Revoke +13105551234 first",
  "code": "invalid_field_value"
}
```

The script stops with "No reply yet" when the session is still `pending`. Reply to the WhatsApp message and run it again, which resends the template.

The [sandbox guide](/platforms/whatsapp/sandbox#if-it-fails) lists the other errors.

**Reply to a DM:**

The script stops with "No conversations yet" when no connected account has received a DM. Send one to the account from another profile and run it again.

For send errors, the [inbox guide](/multi-tenant/inbox#if-it-fails) lists each one and its fix.

**Create an ad campaign:**

A `422` with `linked_account_required` means the account cannot run ads.

**Instagram.** An account connected with the default Instagram Login never has ads scopes. Connect Facebook or Meta Ads in the same profile.

**Older accounts.** Accounts connected before ads were enabled do not carry the ads scopes either. Reconnect them.

The [Meta Ads page](/platforms/meta-ads#common-errors) lists the other errors.


## Next steps

**Publish a post:**

<Cards>
  <Card title="Media uploads" href="/guides/media-uploads" description="Add images and videos to a post." />
  <Card title="Queue scheduling" href="/guides/queue-scheduling" description="Recurring time slots, so posts need no scheduledFor." />
  <Card title="Webhooks" href="/webhooks" description="Get each status change pushed to you instead of polling." />
  <Card title="Build a platform" href="/multi-tenant" description="One profile per user, scoped keys and webhook routing." />
  <Card title="Before production" href="/guides/error-handling" description="Error handling, with rate limits and idempotency alongside." />
  <Card title="CLI" href="/cli" description="The same API from a terminal." />
</Cards>

The same key serves the [inbox](/messages/list-inbox-conversations), [WhatsApp](/platforms/whatsapp), [phone numbers](/platforms/phone-numbers), [ads](/ad-campaigns/list-ads), [broadcasts](/broadcasts/list-broadcasts), [workflows](/workflows/list-workflows), [comment-to-DM automations](/comment-automations/list-comment-automations) and [analytics](/analytics/get-analytics).

**Send a WhatsApp message:**

<Cards>
  <Card title="WhatsApp sandbox" href="/platforms/whatsapp/sandbox" description="Every sandbox call, its limits and how to change the test phone." />
  <Card title="Get your own number" href="/platforms/whatsapp/phone-numbers" description="Send to more than one recipient from a number you own." />
  <Card title="Templates" href="/platforms/whatsapp/templates" description="Create and send your own approved templates." />
  <Card title="Broadcasts" href="/platforms/whatsapp/broadcasts" description="Send one template to a list of contacts." />
  <Card title="Inbox" href="/platforms/whatsapp/inbox" description="Read replies and answer inside the 24-hour window." />
  <Card title="Webhooks" href="/webhooks/inbox" description="Get message.received pushed to you for each reply." />
</Cards>

**Reply to a DM:**

<Cards>
  <Card title="Inbox for your users" href="/multi-tenant/inbox" description="Write an inbox from webhooks, send replies and backfill history." />
  <Card title="Inbox webhooks" href="/webhooks/inbox" description="Get message.received pushed to you instead of polling." />
  <Card title="Compare DMs by platform" href="/platforms/compare#dms" description="Attachments, quick replies, buttons and edits per platform." />
  <Card title="Comments" href="/platforms/compare#comments" description="Read and answer comments through the same inbox." />
  <Card title="Workflows" href="/workflows" description="Answer DMs and comments automatically with a graph of steps." />
  <Card title="Idempotency" href="/guides/idempotency" description="Make retries safe so a reply is never sent twice." />
</Cards>

**Create an ad campaign:**

<Cards>
  <Card title="Create an ad" href="/platforms/meta-ads/campaigns" description="Add an ad set and an ad to the campaign you just created." />
  <Card title="Boost a post" href="/platforms/meta-ads/boost" description="Turn a published post into an ad, keeping its likes and comments." />
  <Card title="Targeting" href="/platforms/meta-ads/targeting" description="Countries, cities, interests and audiences." />
  <Card title="Meta Ads overview" href="/platforms/meta-ads" description="Connections, billing, the campaign tree and every ads page." />
  <Card title="Other ad platforms" href="/platforms/compare#ads" description="Google, LinkedIn, TikTok, Pinterest, X and OpenAI ads." />
  <Card title="Ads webhooks" href="/webhooks/ads" description="Get ad status changes pushed to you." />
</Cards>