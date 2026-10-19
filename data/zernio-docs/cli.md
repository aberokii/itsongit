# CLI

Install the Zernio CLI, log in, and schedule a post from the terminal with one command that prints the API response as JSON.

import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { ChartLine, Globe, Inbox, Megaphone, Send, Settings } from 'lucide-react';

The Zernio CLI wraps the API for terminals and agents. Install it with `npm install -g @zernio/cli`.

Every command prints the API response as JSON, so the output pipes into `jq` or straight into an agent.

The same key works for every one of the 16 [platforms](/platforms).

## First command

<Steps>

<Step>
### Install

```bash
npm install -g @zernio/cli
```
</Step>

<Step>
### Log in

```bash
zernio auth:login
```

The browser opens for you to authorize the CLI. Zernio creates an API key and saves it to `~/.zernio/config.json`.

Pass `--device-name "my-server"` to label the key. The default is your hostname.

To use a key you already made on [API keys](https://zernio.com/dashboard/api-keys), run `zernio auth:set --key "$ZERNIO_API_KEY"` instead.

`zernio auth:check` calls `GET /v1/users`. When the key works, it prints `{"success":true,"message":"API key is valid", ...}` followed by the team's users.
</Step>

<Step>
### Schedule a post

`posts:create` takes `--text`, one or more account ids in `--accounts`, and `--scheduledAt`.

Omit `--scheduledAt` to publish now, or pass `--draft` to save a draft. Account ids come from `zernio accounts:list`.

```bash
zernio posts:create \
  --text "Hello world. This is my first post from the Zernio CLI." \
  --accounts 66b2e19d8c3f5a7e9d0b1c2d \
  --scheduledAt "2027-01-01T12:00:00" \
  --timezone "America/New_York" \
  --pretty
```

Output (the `201` body of `POST /v1/posts`):

```json
{
  "message": "Post scheduled successfully",
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "content": "Hello world. This is my first post from the Zernio CLI.",
    "status": "scheduled",
    "scheduledFor": "2027-01-01T17:00:00Z",
    "timezone": "America/New_York",
    "platforms": [
      {
        "platform": "linkedin",
        "accountId": { "_id": "66b2e19d8c3f5a7e9d0b1c2d", "platform": "linkedin", "username": "acme" },
        "status": "pending"
      }
    ]
  }
}
```

The CLI looks the account up, fills in its `platform`, and sends the request.

`--title`, `--tags` and `--hashtags` map to the fields of the same name on [Create post](/posts/create-post), and `--media` to its `mediaItems`.
</Step>

</Steps>

A failed command prints one JSON object to stderr and exits with code 1. An unknown account id, for example:

```json
{"error":true,"message":"Account 66b2e19d8c3f5a7e9d0b1c2e not found. Run \"zernio accounts:list\" to see available accounts.","status":404}
```

Run `zernio accounts:list` and copy the `_id` of the account you want.

A `status` of `401` means no valid key is configured. Run `zernio auth:login` again.

## Commands

`zernio --help` prints every command. They are grouped by area, one page each:

<Cards>
  <Card icon={<Send />} title="Posting commands" href="/cli/posting" description="Profiles, accounts, connect, posts, media, queue, validation" />
  <Card icon={<Inbox />} title="Inbox commands" href="/cli/inbox" description="Conversations, comments, reviews, contacts, broadcasts, sequences, automations, workflows" />
  <Card icon={<ChartLine />} title="Analytics commands" href="/cli/analytics" description="Post and inbox analytics, activity logs" />
  <Card icon={<Megaphone />} title="Ads commands" href="/cli/ads" description="Ads, campaigns, audiences, lead forms, conversions, tracking tags" />
  <Card icon={<Globe />} title="Platform commands" href="/cli/platforms" description="WhatsApp, Google Business Profile, Discord, Instagram, Reddit, X" />
  <Card icon={<Settings />} title="Management commands" href="/cli/management" description="Auth, API keys, users, invites, account groups, settings, webhooks" />
</Cards>

Output is compact JSON by default. Add `--pretty` for indented output.

The posts, inbox, contacts, broadcasts, sequences and automations groups are hand-written. The rest are generated from the API, so the CLI covers the full surface.

## How it behaves

### The CLI reads the key from ZERNIO_API_KEY or ~/.zernio/config.json

Environment variables win over the config file:

| Variable | Description | Required |
|----------|-------------|----------|
| `ZERNIO_API_KEY` | Your API key | Yes, unless a key was saved with `auth:login` or `auth:set` |
| `ZERNIO_API_URL` | Custom API base URL | No |

`LATE_API_KEY`, `LATE_API_URL` and `~/.late/config.json` are the names these three had before the rebrand from Late.

The CLI reads them only when the `ZERNIO_` variables and `~/.zernio/config.json` are absent.

### auth:login replaces the key for the same device

Running `zernio auth:login` again on a device that already has a key replaces that key instead of creating a second one.

### Generated command names derive from the operationId

A generated command is `<group>:<operation>` in kebab case, so the `createCtwaAd` operation becomes `ads:create-ctwa`.

Positional arguments are the path parameters (`zernio posts:get <id>`). Body and query fields are `--flags` named after the API field.

## Related

- [GitHub repository](https://github.com/zernio-dev/zernio-cli)
- [npm package](https://www.npmjs.com/package/@zernio/cli)
- [ClawHub repository](https://clawhub.ai/mikipalet/zernio-cli)
- [SDKs](/sdks)
- [Zernio dashboard](https://zernio.com)