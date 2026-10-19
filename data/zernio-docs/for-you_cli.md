# Zernio CLI

Install the Zernio CLI, log in with your browser and schedule a post from the terminal. The everyday commands for posts, DMs and analytics.

import { Step, Steps } from 'fumadocs-ui/components/steps';

The Zernio CLI posts, reads DMs and pulls analytics from your terminal.

It also gives coding agents like Claude Code and Codex a simple tool to call.

## Get started

<Steps>

<Step>
### Install

You need [Node.js](https://nodejs.org) installed.

```bash
npm install -g @zernio/cli
```
</Step>

<Step>
### Log in

```bash
zernio auth:login
```

Your browser opens so you can approve the CLI. The key is saved on your computer, in `~/.zernio/config.json`.
</Step>

<Step>
### Find your accounts

```bash
zernio accounts:list --pretty
```

Copy the `_id` of the account you want to post from.
</Step>

<Step>
### Schedule a post

```bash
zernio posts:create \
  --text "Hello from the terminal." \
  --accounts 66b2e19d8c3f5a7e9d0b1c2d \
  --scheduledAt "2027-01-01T12:00:00" \
  --timezone "America/New_York"
```

Leave out `--scheduledAt` to publish now, or add `--draft` to save a draft. List several ids in `--accounts` to post to several accounts at once.
</Step>

</Steps>

## Everyday commands

| Command | What it does |
|---|---|
| `zernio accounts:list` | Lists your connected accounts |
| `zernio accounts:health` | Shows accounts that need reconnecting |
| `zernio posts:create` | Publishes, schedules or drafts a post |
| `zernio posts:get <id>` | Shows one post and its status |
| `zernio inbox:conversations --accountId <id>` | Lists DM conversations |
| `zernio inbox:messages <conversationId>` | Reads a conversation |
| `zernio analytics:posts --platform instagram` | Shows how your posts performed |

Add `--pretty` to any command for readable output. `zernio --help` lists everything else.

## Good to know

- **Output is JSON.** That makes it easy to pipe into `jq` or hand to an agent.
- **Errors say what to do.** An unknown account id tells you to run `zernio accounts:list`.
- **Logged out?** A `401` means the saved key is gone or revoked. Run `zernio auth:login` again.

Writing scripts or automating at scale? The [developer CLI docs](/cli) cover every command group.