# Connect with MCP

Add the hosted Zernio MCP server to Claude, ChatGPT, Claude Code, Cursor, Codex, VS Code or any MCP client, sign in with your Zernio account and make your first request.

import { Step, Steps } from 'fumadocs-ui/components/steps';

Connect Zernio to the AI assistant you already use. It's one URL:

```
https://mcp.zernio.com/mcp
```

The server is hosted, so there is nothing to install. You sign in with your Zernio account, with no key to copy.

## How it works

Once connected, your assistant can post, schedule, answer DMs and comments, read analytics and manage ads on every account you've connected in Zernio.

It finds the right action on its own. You ask in plain language and approve the result.

You need a [Zernio account](https://zernio.com/signup) with at least one social account connected.

## Pick your client

<McpClients>
<McpClient id="claude" name="Claude" description="Web, desktop and mobile apps">

<Steps>
<Step>

**Open the connectors menu**

Click **+** in the message box, then **Connectors** > **Add connector** > **Add custom connector**.

<StepVideo src="/videos/for-you/claude-1-open-connectors.mp4" caption="Opening Claude's connectors menu" />

</Step>
<Step>

**Add Zernio**

Fill in:

- **Name:** Zernio
- **URL:** `https://mcp.zernio.com/mcp`

Click **Continue**.

<StepVideo src="/videos/for-you/claude-2-add-zernio.mp4" caption="Adding the Zernio server URL" />

</Step>
<Step>

**Sign in to Zernio**

Keep the settings Claude detects (**Sign in now** and **Register automatically**) and click **Add**.

Zernio asks you to approve access. Click **Authorize**, and Zernio shows up in your connectors, switched on.

<StepVideo src="/videos/for-you/claude-3-authorize.mp4" caption="Authorizing Claude in Zernio" />

</Step>
</Steps>

</McpClient>
<McpClient id="chatgpt" name="ChatGPT" description="Web and desktop apps">

<Steps>
<Step>

**Find Zernio in Plugins**

Open **Plugins** in the ChatGPT sidebar, search for **Zernio** and open it.

<StepVideo src="/videos/for-you/chatgpt-1-find-zernio.mp4" caption="Finding the Zernio plugin" />

</Step>
<Step>

**Install the plugin**

Click **Install plugin**. A Zernio sign-in window opens.

<StepVideo src="/videos/for-you/chatgpt-2-install.mp4" caption="Installing the Zernio plugin" />

</Step>
<Step>

**Authorize ChatGPT**

Click **Authorize**. The window closes, and the plugin page shows **Try in chat**.

<StepVideo src="/videos/for-you/chatgpt-3-authorize.mp4" caption="Authorizing ChatGPT in Zernio" />

</Step>
</Steps>

In ChatGPT, Zernio covers posts and analytics: it lists your accounts, schedules and edits posts and reads performance. For DMs, comments and ads, use Claude or another client on this page.

</McpClient>
<McpClient id="claude-code" name="Claude Code" description="Anthropic's coding agent in the terminal">

<Steps>
<Step>

**Add the server**

```bash
claude mcp add --transport http zernio https://mcp.zernio.com/mcp
```

`claude mcp list` then shows **zernio** as *Needs authentication* until you sign in.

<StepVideo src="/videos/for-you/claude-code-1-add.mp4" caption="Adding Zernio to Claude Code" />

</Step>
<Step>

**Sign in**

```bash
claude /mcp
```

Pick **zernio** and approve access in the browser window that opens.

</Step>
</Steps>

**Prefer a plugin?** The [Zernio plugin](https://github.com/zernio-dev/zernio-claude-plugin) adds the server plus ready-made skills and slash commands:

```
/plugin marketplace add zernio-dev/zernio-claude-plugin
/plugin install zernio@zernio
```

</McpClient>
<McpClient id="cursor" name="Cursor" description="AI code editor">

<Steps>
<Step>

**Install the server**

[Install in Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=zernio&config=eyJ1cmwiOiJodHRwczovL21jcC56ZXJuaW8uY29tL21jcCJ9). The link opens Cursor and adds Zernio.

Or add it by hand to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "zernio": {
      "url": "https://mcp.zernio.com/mcp"
    }
  }
}
```

<StepVideo src="/videos/for-you/cursor-1-config.mp4" caption="Adding Zernio to ~/.cursor/mcp.json" />

</Step>
<Step>

**Sign in**

Cursor asks you to sign in to Zernio. Approve access in the browser.

</Step>
</Steps>

</McpClient>
<McpClient id="codex" name="Codex" description="OpenAI's coding agent">

<Steps>
<Step>

**Add the server**

```bash
codex mcp add zernio --url https://mcp.zernio.com/mcp
```

Codex detects that Zernio uses sign-in and opens your browser.

<StepVideo src="/videos/for-you/codex-1-add.mp4" caption="Adding Zernio to Codex" />

</Step>
<Step>

**Sign in**

Approve access in the browser. Codex prints *Successfully logged in to MCP server 'zernio'*.

Closed the browser too early? Run `codex mcp login zernio` to sign in again.

</Step>
</Steps>

</McpClient>
<McpClient id="vscode" name="VS Code" description="GitHub Copilot agent mode">

<Steps>
<Step>

**Install the server**

[Install in VS Code](https://vscode.dev/redirect/mcp/install?name=zernio&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.zernio.com%2Fmcp%22%7D). The link opens VS Code and adds Zernio.

Or add it by hand to `.vscode/mcp.json`:

```json
{
  "servers": {
    "zernio": {
      "type": "http",
      "url": "https://mcp.zernio.com/mcp"
    }
  }
}
```

<StepVideo src="/videos/for-you/vscode-1-config.mp4" caption="Adding Zernio to .vscode/mcp.json" />

</Step>
<Step>

**Sign in**

VS Code asks you to sign in to Zernio. Approve access in the browser.

</Step>
</Steps>

</McpClient>
<McpClient id="other" name="Other MCP clients" description="Any client that supports remote MCP servers">

<Steps>
<Step>

**Add the URL**

Add a remote (HTTP) MCP server with the URL `https://mcp.zernio.com/mcp`. Zernio is also listed in the [MCP Registry](https://registry.modelcontextprotocol.io) as `com.zernio/zernio`.

</Step>
<Step>

**Sign in**

Choose OAuth if your client asks. It opens the Zernio sign-in page.

</Step>
</Steps>

Client without sign-in support, or one that only runs local servers? The [developer setup page](/mcp/setup#connect-your-client) has an API-key config and a local bridge.

</McpClient>
</McpClients>

## Check it works

Ask your assistant:

```
List my connected Zernio accounts.
```

It answers with one line per account:

```
Found 2 connected account(s):

- instagram: acmecorp (ID: 66b2e19d8c3f5a7e9d0b1c2d)
- linkedin: acme (ID: 66b2e19d8c3f5a7e9d0b1c2e)
```

`No accounts connected` means sign-in worked but no social account is connected yet. Connect one in the [Zernio app](https://zernio.com).

## What you can ask

Ask in plain language. Click a request to copy it.

<PromptList
  items={[
    { label: 'Schedule', prompt: 'Schedule this for tomorrow at 9am New York time on X.' },
    { label: 'Post', prompt: 'Post this to Instagram and LinkedIn now.' },
    { label: 'Fix', prompt: 'Which posts failed? Retry them.' },
    { label: 'Media', prompt: 'I want to post a photo from my computer.' },
    { label: 'Inbox', prompt: 'Show my unanswered Instagram DMs from this week.' },
    { label: 'Analytics', prompt: 'How did my Instagram posts do last month?' },
    { label: 'Ads', prompt: 'Pause the Meta campaign with the lowest click-through rate.' },
  ]}
/>

Everyday jobs are ready right away. Rarer ones, like WhatsApp templates, load only when you ask for them. The [developer tools reference](/mcp/tools) lists every tool by name.

## Next steps

- [Things to ask](/for-you/prompts): requests that work well, from scheduling to replying to DMs.
- [Post images and videos](/for-you/media): get a file from your computer into a post.
- [Troubleshooting](/for-you/troubleshooting): sign-in errors and how to fix them.

To disconnect an assistant, revoke it from your Zernio dashboard.