# Posting commands

Create profiles, connect accounts, publish and schedule posts, upload media and manage queue slots from the terminal, with posts:create and its flags.

The posting commands create profiles, connect accounts, publish and schedule posts, upload media, manage queue slots and validate content before it goes out.

Install the CLI with `npm install -g @zernio/cli` and log in with `zernio auth:login`. Both are covered on the [CLI page](/cli).

## First command

`posts:create` carries the whole posting surface in its flags:

| Flag | What it sets |
|---|---|
| `--text` | The post text |
| `--accounts` | The account ids to publish to; the CLI looks each one up and fills in its `platform` |
| `--scheduledAt` | The scheduled time. Omit it to publish now |
| `--timezone` | IANA name, such as `America/New_York` |
| `--draft` | Saves the post as a draft instead |
| `--media` | The `mediaItems` of [Create post](/posts/create-post) |
| `--title`, `--tags`, `--hashtags` | The fields of the same name on [Create post](/posts/create-post) |
| `--pretty` | Indents the JSON output |

Publish to one account right now:

```bash
zernio posts:create \
  --text "The spring collection is live." \
  --accounts 66b2e19d8c3f5a7e9d0b1c2d \
  --pretty
```

Output (the `201` body of [`POST /v1/posts`](/posts/create-post)):

```json
{
  "message": "Post published successfully",
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "content": "The spring collection is live.",
    "status": "published",
    "publishedAt": "2027-01-01T17:00:05Z",
    "platforms": [
      {
        "platform": "linkedin",
        "accountId": { "_id": "66b2e19d8c3f5a7e9d0b1c2d", "platform": "linkedin", "username": "acme" },
        "status": "published",
        "publishedAt": "2027-01-01T17:00:05Z",
        "platformPostId": "urn:li:share:7123456789012345678",
        "platformPostUrl": "https://www.linkedin.com/feed/update/urn:li:share:7123456789012345678"
      }
    ]
  }
}
```

## Commands

`zernio --help` prints the full command list. Each command maps to one endpoint in the reference:

| Group | Reference |
|---|---|
| `profiles:`, `accounts:` | [Profiles](/profiles/list-profiles), [accounts](/accounts/list-accounts) |
| `connect:` | [Connect an account](/connect/get-connect-url) |
| `posts:` | [Posts](/posts/create-post) |
| `media:` | [Media](/media/get-media-presigned-url) |
| `queue:` | [Queue slots](/queue/list-queue-slots) |
| `validate:` | [Validation](/validate/validate-subreddit) |

The `posts` group is written by hand. That is why its flags read `--text` and `--accounts` rather than the API's `content` and `platforms`.

The generated groups name their flags after the API fields.

## How it behaves

### Zernio reads the scheduled time in the timezone you pass

A `--scheduledAt` value without a `Z` or an offset (`2027-01-01T12:00:00`) is read as local time in `--timezone`.

A value that carries one is taken as it is, and `--timezone` has no effect on it.

An unknown timezone name returns `400`.

### Zernio publishes to every account in one request

`--accounts` takes several ids. When you omit `--scheduledAt`, all of them publish inside that one request.

That is why the response carries a `platformPostUrl` per account.

**Partial failure.** A post where some accounts published and others failed comes back as `207` with `post.status` set to `partial`. [Post lifecycle](/guides/post-lifecycle) covers the statuses.

### Zernio answers 403 when a target account is disconnected

```json
{
  "error": "Account 6a0f6d2e520992756d96bb6c (facebook \"My Page\") is disconnected and cannot be posted to. Facebook tokens expired. Please reconnect your Facebook account. After reconnecting, refresh your account IDs from GET /v1/accounts.",
  "code": "ACCOUNT_DISCONNECTED"
}
```

Reconnect the account, then run `zernio accounts:list` and use the ids it returns.

`zernio accounts:health` reports which accounts are in this state before you post.

## Related

- [CLI](/cli): install, log in, and the first `posts:create`
- [Create post](/posts/create-post): every field `posts:create` maps its flags to
- [Connecting accounts](/guides/connecting-accounts): what the `connect:` commands drive
- [Media uploads](/guides/media-uploads): limits behind `media:upload` and `validate:media`
- [Queue scheduling](/guides/queue-scheduling): what a queue slot is