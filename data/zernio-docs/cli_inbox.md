# Inbox commands

Read and answer DMs, comments and reviews from the terminal, with one runnable example and the response it prints.

The inbox commands read and answer DMs, comments and reviews, manage contacts, send broadcasts, run sequences, and drive comment automations and workflows.

Install the CLI with `npm install -g @zernio/cli` and log in with `zernio auth:login`. Both are covered on the [CLI page](/cli).

## First command

List the open conversations of one account:

```bash
zernio inbox:conversations --accountId 66b2e19d8c3f5a7e9d0b1c2d --pretty
```

Output (the `200` body of [`GET /v1/inbox/conversations`](/messages/list-inbox-conversations), trimmed to the first conversation):

```json
{
  "data": [
    {
      "id": "66c3d2ae7b4f6c8d0e1f2a3b",
      "platform": "instagram",
      "accountId": "66b2e19d8c3f5a7e9d0b1c2d",
      "accountUsername": "acme",
      "participantId": "17841400000000000",
      "participantName": "Dana Ruiz",
      "lastMessage": "Do you ship to Portugal?",
      "updatedTime": "2027-01-01T16:42:11Z",
      "status": "active",
      "unreadCount": 2,
      "threadControl": "app"
    }
  ],
  "pagination": { "hasMore": true, "nextCursor": "WzE3NjcyODk3MzFd" },
  "meta": { "accountsQueried": 1, "accountsFailed": 0 }
}
```

`id` is the conversation id the rest of the group takes:

- `zernio inbox:messages 66c3d2ae7b4f6c8d0e1f2a3b` reads the messages.
- `zernio inbox:send 66c3d2ae7b4f6c8d0e1f2a3b` answers.

## Commands

`zernio --help` prints the full command list. Each command maps to one endpoint in the reference:

| Group | Reference |
|---|---|
| `inbox:` | [Conversations](/messages/list-inbox-conversations), [comments](/comments/list-inbox-comments), [reviews](/reviews/list-inbox-reviews) |
| `contacts:`, `customfields:` | [Contacts](/contacts/list-contacts), [custom fields](/custom-fields/list-custom-fields) |
| `broadcasts:`, `sequences:` | [Broadcasts](/broadcasts/list-broadcasts), [sequences](/sequences/list-sequences) |
| `automations:` | [Comment automations](/comment-automations/list-comment-automations) |
| `workflows:` | [Workflows](/workflows/list-workflows) |

The `inbox`, `contacts`, `broadcasts`, `sequences` and `automations` groups are written by hand, so their flags are short. `--accountId` says which account acts.

The generated groups name their flags after the API fields instead.

### Workflows

`workflows:create` and `workflows:update` take the trigger and node graph described on the [Workflows page](/workflows).

Each update stores a version, so `workflows:list-versions` and `workflows:restore-version` roll a workflow back.

`workflows:list-executions` takes the workflow id and reports the runs:

```bash
zernio workflows:list-executions 66d4a1b2c3e4f5a6b7c8d9e1 --status waiting --limit 1 --pretty
```

Output (the `200` body of [`GET /v1/workflows/{workflowId}/executions`](/workflows/list-workflow-executions), trimmed to the first run):

```json
{
  "success": true,
  "executions": [
    {
      "id": "66e5f1a2b3c4d5e6f7a8b9c0",
      "status": "waiting",
      "currentNodeId": "n_wait",
      "waitingFor": { "kind": "reply", "nodeId": "n_wait" },
      "conversationId": "66c3d2ae7b4f6c8d0e1f2a3b",
      "stepCount": 3,
      "lastError": null,
      "createdAt": "2027-01-01T16:40:02Z"
    }
  ],
  "pagination": { "total": 12, "limit": 1, "skip": 0, "hasMore": true }
}
```

`status` is `running`, `waiting`, `completed`, `exited` or `failed`.

`waitingFor` says whether the run is parked on a timer or on a reply.

## How it behaves

### Zernio reads every connected account in one call

`inbox:conversations` queries all messaging accounts unless `--accountId` narrows it to one.

`meta.accountsQueried` and `meta.accountsFailed` report the sweep. Each entry of `meta.failedAccounts` carries `accountId`, `platform`, `error`, `code` and `retryAfter`.

One account failing leaves the other accounts' conversations in `data`.

### Zernio pages with a cursor

A page holds 50 conversations by default and 100 at most.

When `pagination.hasMore` is `true`, pass `pagination.nextCursor` back as `--cursor` for the next page.

### Zernio refuses a restricted key with 403

Zernio refuses these commands to a key created with the `messages` resource group disabled:

```json
{
  "error": "This API key has the 'messages' resource group disabled. GET /api/v1/inbox/conversations requires it. Create a key with 'messages' enabled in the dashboard API keys tab.",
  "code": "insufficient_permissions",
  "required_group": "messages"
}
```

Resource groups are fixed when the key is created. To fix it:

1. Create a key with `messages` enabled on [API keys](https://zernio.com/dashboard/api-keys).
2. Save it with `zernio auth:set --key "$ZERNIO_API_KEY"`.
3. Revoke the old one.

## Related

- [CLI](/cli): install, log in, and the first command
- [List conversations](/messages/list-inbox-conversations): the endpoint behind `inbox:conversations`
- [Broadcasts](/broadcasts/list-broadcasts): bulk messages and their recipients
- [Comment automations](/comment-automations/list-comment-automations): DM people who comment a keyword
- [Workflows](/workflows): trigger and node graph behind `workflows:create`