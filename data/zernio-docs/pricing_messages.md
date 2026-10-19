# Messages Pricing

Outbound messages bill per message per month. The first 10,000 are free, then $1 per 10,000 across every inbox channel, starting 1 October 2026.

The message meter starts 1 October 2026. From that date every message Zernio delivers to a recipient on your behalf meters, whichever endpoint sends it:

- the [Inbox API](/messages/send-inbox-message)
- the [Broadcasts API](/broadcasts/create-broadcast)
- sequences and workflows
- the per-platform send endpoints

The first 10,000 each month are free, then $0.0001 per message ($1 per 10,000). One meter covers every inbox channel.

**Before 1 October 2026**, sends are counted but never billed. Nothing pauses at the free allowance until then.

## What counts as a message

Only messages leaving your account count. Everything you receive is free, and so are replies to comments and reviews.

The 2 channels that already bill per message are excluded.

| Action | Meters? |
|---|---|
| DM sent, on any channel except X and SMS (Facebook, Instagram, WhatsApp, Telegram, Slack, Reddit, Bluesky, Discord) | Yes |
| WhatsApp broadcast, per recipient | Yes |
| WhatsApp [flow](/platforms/whatsapp/flows) or sequence message sent | Yes |
| X (platform value `twitter`) DM sent | No, billed at [X's pass-through rate](/pricing#x-twitter-api-usage) |
| SMS sent | No, billed [per segment](/pricing/sms) |
| Any message received | No |
| Comment reply, review reply | No |
| Reading conversations, messages, comments and reviews | No |
| Typing indicators, read receipts, marking a conversation read | No |

X DMs and SMS are excluded outright. They do not bill on this meter and do not consume your 10,000. A failed send does not bill either.

**Broadcasts count per recipient.** A broadcast is one API call, but it meters once per contact it reaches.

A broadcast to 5,000 recipients is 5,000 messages, so it uses half the monthly allowance in a single send.

Meta's template fees are unchanged and still bill [directly to your WABA](/pricing/whatsapp). This meter is Zernio's line on top.

## Examples

| Messages sent per month | Monthly cost |
|---|---|
| 8,000 | Free |
| 10,000 | Free |
| 50,000 | $4.00 |
| 250,000 | $24.00 |
| 1,000,000 | $99.00 |

## Scope and mechanics

- **Per team, not per account.** Sends from every connected account and every team member roll up to one team total on the team owner's invoice. Free teams (1 to 2 connected accounts) get the same 10,000.
- **Monthly reset.** It resets at 00:00 UTC on the 1st of each calendar month and does not roll over.
- **No proration.** Unlike connected accounts, messages are not prorated. You get the full 10,000 in the month you sign up, and every message either counts this month or it does not.
- **No running count.** No endpoint reports it today. `GET /v1/usage` and `GET /v1/usage-stats` carry connected accounts and X API calls, not messages.
- **With no card on file**, two signals exist instead. Zernio emails the team owner at 7,500 messages, and the send that would pass 10,000 fails with `403`, code `message_allowance_exceeded`.
- **With a card on file**, nothing pauses and the overage meters at $1 per 10,000.
- It appears on your invoice as Managed Messages, itemized like every other meter. See [How billing works](/billing) for the mechanics.