# Pricing

Every account includes every feature. You pay per connected account, with usage-based billing for messages, ads, phone numbers, calls, SMS and WhatsApp on one invoice.

You pay per connected account. Every account includes every feature: publishing, analytics, inbox and ads on all 16 platforms.

Profiles and platforms cost nothing; only accounts count.

Messages, ads, phone numbers, calls, SMS and RCS meter as usage on the same invoice.

WhatsApp template delivery and Meta's per-minute call fee are billed by Meta to your WhatsApp Business Account, never by Zernio.

Every rate on this page is what the billing engine charges. Invoices are itemized to the account, number, message and API call.

## Connected accounts

The primary meter. You pay for the accounts you connect and can add or remove them at any time. Billing prorates by the day.

| Connected accounts | Price per account per month |
|---|---|
| 1 to 2 | Free, no credit card required |
| 3 to 10 | $6 each |
| 11 to 100 | $3 each |
| 101 to 2,000 | $1 each |
| 2,001 and up | $1 each, no cap |

Pricing is graduated. Each account bills at the rate of the band it falls in, not one flat rate for all of them.

20 connected accounts, for example:

| Accounts | Rate | Subtotal |
|---|---|---|
| 1 to 2 (2 accounts) | free | $0 |
| 3 to 10 (8 accounts) | $6 each | $48 |
| 11 to 20 (10 accounts) | $3 each | $30 |
| 20 accounts | | $78 per month |

### What counts as a connected account

Every active connection counts once, and profiles never count.

- Posting accounts: an Instagram account, a Facebook Page, a YouTube channel, a LinkedIn page, a TikTok account, and so on. One each.
- Ad accounts (`metaads`, `googleads`, `linkedinads`, `tiktokads`, `xads`, `pinterestads`, `openaiads`, `redditads`) count like posting accounts. A Facebook Page, its Instagram account and the Meta ad account behind them are 3 connected accounts.
- WhatsApp numbers: each number is its own account on its own profile, so it counts once here. A number Zernio provisions for you also carries its [per-number fee](#phone-numbers-calls-sms-and-whatsapp).
- SMS and voice capability rows on a number never count. The number's monthly fee covers them.
- Profiles are free. A profile groups accounts, for example one per client or brand, and can hold several accounts of the same platform.
- 4 profiles with nothing connected cost $0. See [Profiles](/guides/profiles).

Accounts are counted across your whole team (owner plus invited members), and the first 2 are free.

**Example.** An agency runs 4 profiles, one per client. Each profile has a Facebook Page, an Instagram account and a Meta ad account connected.

That is 3 accounts × 4 profiles = 12 connected accounts:

- Accounts 1 to 2 are free.
- Accounts 3 to 10 are 8 × $6 = $48.
- Accounts 11 and 12 are 2 × $3 = $6.

The month costs $54. The 4 profiles add nothing.

The free allowance is a $12 monthly credit against the connected-accounts line only (2 accounts × $6).

These bill from the first unit, even with 2 or fewer accounts:

- [X API pass-through](#x-twitter-api-usage)
- [provisioned phone numbers](#phone-numbers-calls-sms-and-whatsapp)
- [outbound messages](#outbound-messages) past the free 10,000
- [managed ads](#managed-ads) past the free 500
- Meta's own WhatsApp template and call fees, which Meta bills to your WhatsApp Business Account directly

Every account, free or paid, includes full API access, unlimited posts, all 16 platforms, analytics, inbox and ads.

Posts are unlimited on every current plan. They are subject to the per-account publishing caps in [rate limits](/guides/rate-limits#posting-velocity-limits), which stop a platform throttling an account.

Profiles are unlimited too, except on legacy Stripe and AppSumo plans. Those keep the profile cap they came with ([Profiles](/guides/profiles)).

Two features meter on their own usage past a free monthly allowance: [outbound messages](#outbound-messages) and [managed ads](#managed-ads).

Past 2,000 accounts the rate stays at $1 per account, self-service. Connect 10,000 accounts and nothing changes except the invoice.

<PricingCalculator />

The calculator uses the same math as the billing engine, including daily proration and the monthly free credit. [How billing works](/billing) explains the mechanics.

## X (`twitter`) API usage

X (platform value `twitter`) charges per API call. Zernio passes each call through at X's published rate with no markup.

It applies only when you have an X account connected.

| X operation | Rate |
|---|---|
| Posts: Read (analytics, post lookups) | $0.005 per resource |
| Content: Create (publishing a post) | $0.015 per request |
| Content: Create with URL (a post containing an http/https link) | $0.200 per request |
| DM: Read | $0.010 per resource |
| DM: Send | $0.015 per resource |

The full rate table is at [docs.x.com/x-api/getting-started/pricing](https://docs.x.com/x-api/getting-started/pricing). Zernio's per-call price always equals X's published price.

Set a monthly X spend cap from the dashboard:

- At 80% you get a warning email.
- At 100% X analytics and inbox polling pause for the rest of the period.

## Outbound messages

Every message Zernio delivers on your behalf meters: inbox replies, broadcasts metered per recipient, sequences and workflows.

The first 10,000 each month are free, then $0.0001 per message ($1 per 10,000). X DMs and SMS are excluded.

The meter starts 1 October 2026. [Messages pricing](/pricing/messages) lists what counts.

## Managed ads

Ads created or synced through the [Ads API](/ad-campaigns/list-ads) meter per active ad per month. The first 500 are free, then $0.01 per active ad per month.

Only running or in-review ads count. Paused, ended and rejected ads never bill, and there is no percentage of ad spend.

[Ads pricing](/pricing/ads) lists the states.

## Support Assistant

You pay per question you ask the [Support Assistant](/support-assistant), once it finishes. A typical question costs $0.10 to $0.50, never more than its `maxCostUsd` cap ($3 by default), and failed questions are free. The exact amount charged comes back as `costUsd` on each answer. Spend is capped at $100 per account per month, and it appears as "Support API" on your invoice. [Support Assistant pricing](/support-assistant#pricing) has the per-question table and a worked example.

## Phone numbers, calls, SMS and WhatsApp

A phone number is a usage line on the same invoice. Provision a number, then enable [Calls](/platforms/voice), [SMS](/platforms/sms) or [WhatsApp](/platforms/whatsapp) on it and pay for what you use.

Numbers bill a flat monthly price, charged at activation and on the 1st of each month. The price is shown before you buy.

The headline rates. Each row links to the per-country price list the billing engine charges from:

| Meter | Rate | Full price list |
|---|---|---|
| Phone number | $3 to $30 per month per number, by country and number type (US: $3) | [All <NumberCountryCount /> countries](/pricing/phone-numbers), plus <PreOrderCountryCount /> by [pre-order](/pricing/phone-numbers#pre-order-numbers) |
| Calls | From $0.010 per minute (US, Canada), per minute by destination. Recording adds $0.004 per minute and transcription $0.03 per minute, both optional | [Every destination](/pricing/calls) |
| SMS | From $0.008 per segment (US long code), per segment by destination | [Rates and 10DLC fees](/pricing/sms) |
| RCS | Per agent: $150 setup, then $160 per month in the US or $75 per month elsewhere (plus $750 on US carrier approval). Messages from $0.0098 (US rich text) | [Agent fees and message rates](/pricing/rcs) |
| WhatsApp | Number as above. Messages in the 24-hour service window carry no Meta fee (they still count as [outbound messages](#outbound-messages)). Template delivery and outbound-call fees are billed by Meta directly to your WABA | [Meta's rates by country](/pricing/whatsapp) |

Before you buy:

- **KYC.** Regulated countries need a one-time KYC before a number activates (1 to 3 business days). The rest are instant. See [availability by country](/platforms/phone-numbers/availability).
- **US SMS** requires 10DLC registration: $9 one-time plus a $20 monthly campaign fee, or $4 for a sole proprietor. One approved registration [covers all your numbers](/platforms/sms/registration#reuse-an-approval-skip-the-fee). Other countries send with no registration.
- **WhatsApp has two billers.** Zernio bills the number and the carrier leg of calls. Meta bills template delivery and its per-minute call fee directly to your WhatsApp Business Account, with no Zernio markup. See [who bills what](/pricing/whatsapp).

## How you're charged

[How billing works](/billing) owns the mechanics:

- when your card is charged
- the daily proration math
- how the graduated bands compute
- a worked example

Connect or disconnect anything at any time.

## Enterprise

Everything above is available the moment you sign up, from the dashboard or the API, with a card on file.

No usage level requires a contract, a quote or a call.

Teams that want more than the standard terms can take the optional [enterprise track](https://zernio.com/enterprise):

- Custom contracts: volume pricing and invoicing terms for your scale.
- Dedicated Slack channel: a direct line to engineering, with people on call for incidents.
- Compliance package: SOC 2 Type II report and GDPR documentation via the [trust portal](https://trust.zernio.com).
- Single sign-on and SCIM, enabled per team:
  - SAML and OIDC SSO with any identity provider (Okta, Microsoft Entra, Google Workspace and others)
  - MFA enforced through your IdP
  - SCIM provisioning for automatic onboarding and offboarding
- Security controls: role-based access control, audit logs, and API access controls (key rotation, IP allowlisting).