# Instagram

Publish feed posts, carousels, Stories and Reels to Instagram with the Zernio API, with collaborators, user tags, catalog audio, paid partnership labels and location tags.

import { Cards, Card } from 'fumadocs-ui/components/card';
import { AlertTriangle, ChartLine, Film, Inbox, ListChecks, PenLine } from 'lucide-react';

Publish feed posts, carousels, Stories and Reels to Instagram with `POST /v1/posts` and `platform: "instagram"`. The same account also serves analytics, DMs, comments and comment-to-DM automations.

## Quick reference

| Property | Value |
|----------|-------|
| Character limit | 2,200 (caption) |
| Images per post | 1 (feed), 10 (carousel) |
| Videos per post | 1 |
| Image formats | JPEG, PNG |
| Image max size | 8 MB (auto-compressed) |
| Video formats | MP4, MOV |
| Video max size | 300 MB (feed and Reels), 100 MB (Stories) |
| Video max duration | 90 seconds (Reels), 60 minutes (feed), 60 seconds (Story) |
| Post types | Feed, Carousel, Story, Reel |
| Scheduling | Yes |
| Inbox (DMs) | Yes |
| Inbox (comments) | Yes |
| Comment-to-DM automations | Yes |
| Story-reply automations | Yes |
| Story-mention and live-comment automations | Yes |
| Analytics | Yes |

## Before you start

Instagram requires a Business or Creator account. Personal accounts cannot post through the API.

Every post needs media, so there are no text-only posts.

An account can publish 100 posts per rolling 24 hours, all content types combined. Read what is left of that window with [Get Instagram publishing limit](/instagram/get-instagram-publishing-limit). Compare against the returned `quotaTotal` rather than hardcoding the cap.

The first 125 characters of a caption show before the "more" fold.

## Connect

Call `GET /v1/connect/instagram` with `profileId` and, optionally, `loginMethod` ([connecting accounts guide](/guides/connecting-accounts)).

Publishing, analytics, comments and the inbox work the same with either login method. Facebook Login is required for ads scopes, [catalog audio](/platforms/instagram/posts#reels-with-catalog-audio) and the [paid partnership label](/platforms/instagram/fields#paid-partnership-label).

### Login methods

**Instagram Login** (`loginMethod=instagram_login`, the default): the user authorizes their Instagram professional account directly, with no Facebook Page involved.

Ads permissions exist only on Facebook Login, so this method never requests them. To run ads against such an account, connect a [Facebook](/platforms/facebook) account in the same profile and use its token ([Meta Ads](/platforms/meta-ads)).

**Facebook Login** (`loginMethod=facebook_login`): the user authorizes a Facebook Page that has a linked Instagram professional account. Every API call for that account runs through the Page.

Use it when the customer manages Instagram through a Page and expects the Facebook consent screen.

Picking the Page is a second step after OAuth, in standard or headless mode ([platforms requiring secondary selection](/guides/connecting-accounts#platforms-requiring-secondary-selection)).

The Facebook Login dialog also requests `ads_management`, `ads_read`, `pages_manage_ads` and `leads_retrieval` (the `ads` area), so the same account can drive [Meta Ads](/platforms/meta-ads). Call [Connect ads](/connect/connect-ads) with `platform=instagram` to create the ads account.

Pass [`scopes`](/guides/connecting-accounts#scopes) to ask for fewer areas.

## In this section

<Cards>
  <Card icon={<PenLine />} title="Posts, Stories & Reels" href="/platforms/instagram/posts" description="Feed posts, carousels, Stories, Reels and Reels with catalog audio" />
  <Card icon={<ListChecks />} title="Platform Fields" href="/platforms/instagram/fields" description="Every platformSpecificData field, the paid partnership label and location tags" />
  <Card icon={<Film />} title="Media Requirements" href="/platforms/instagram/media" description="Image and video requirements and media URL rules" />
  <Card icon={<ChartLine />} title="Analytics" href="/platforms/instagram/analytics" description="Post metrics and Story metrics" />
  <Card icon={<Inbox />} title="Inbox" href="/platforms/instagram/inbox" description="Direct messages, ice breakers, the persistent menu, comments and webhooks" />
  <Card icon={<AlertTriangle />} title="Limits & Errors" href="/platforms/instagram/reference" description="What Instagram's API does not expose and common errors" />
</Cards>

## Related

- [Connecting accounts](/guides/connecting-accounts): the OAuth flow for Instagram Login and Facebook Login.
- [Create post](/posts/create-post): every field of the request.
- [Media uploads](/guides/media-uploads): upload images and videos instead of hosting them.
- [Messages](/messages/list-inbox-conversations) and [Comments](/comments/list-inbox-comments): the inbox API.
- [Account settings](/account-settings/get-instagram-ice-breakers): ice breakers and the persistent menu.
- [ManyChat-style automations](/guides/manychat-patterns): ref links, comment to DM, story mentions and handover.