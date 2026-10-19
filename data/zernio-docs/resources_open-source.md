# Open Source

Generate a client from the Zernio OpenAPI spec, use one of the platform specs, or start from an open-source project built on the API.

import { Cards, Card } from 'fumadocs-ui/components/card';
import { Store } from 'lucide-react';
import { SiBluesky, SiFacebook, SiInstagram, SiLinkedin, SiPinterest, SiReddit, SiSnapchat, SiTelegram, SiThreads, SiTiktok, SiWhatsapp, SiX, SiYoutube } from 'react-icons/si';

Use the Zernio OpenAPI spec to generate a client, take one of the platform specs, or start from an open-source project built on the API.

The Zernio spec is at [zernio.com/openapi.yaml](https://zernio.com/openapi.yaml). The official clients built from it are on the [SDKs page](/sdks).

export const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);

## Generate a Zernio client

Point a generator at [zernio.com/openapi.yaml](https://zernio.com/openapi.yaml):

```bash
openapi-generator-cli generate \
  -i https://zernio.com/openapi.yaml \
  -g typescript-fetch -o ./zernio-sdk
```

Set the API key on the generated configuration object before the first call. The spec's global requirement is HTTP bearer.

**`401` on every call** means the generated client is sending no credentials.

**A second auth setting.** The generator also picks up a second scheme, `connectToken` (the `X-Connect-Token` header). The page and location selection operations under `/v1/connect` accept it as an alternative.

So the configuration carries two auth settings. Leave `connectToken` empty unless you are finishing an OAuth flow with no browser session ([connecting accounts](/guides/connecting-accounts)).

## Platform API specs

OpenAPI specifications for the platform APIs Zernio publishes to, maintained in the [openapi-specs repository](https://github.com/zernio-dev/openapi-specs).

Use them to generate a client, build a request in Postman or read an API in Swagger UI.

<Cards>
  <Card
    icon={<SiX />}
    title="X API"
    description="OpenAPI spec for the X API v2: posts, users, spaces and lists"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/twitter.yaml"
  />
  <Card
    icon={<SiInstagram />}
    title="Instagram Graph API"
    description="OpenAPI spec for the Instagram Graph API: media, comments, insights and stories"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/instagram.yaml"
  />
  <Card
    icon={<SiFacebook />}
    title="Facebook Graph API"
    description="OpenAPI spec for the Facebook Graph API: pages, posts, comments and ads"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/facebook.yaml"
  />
  <Card
    icon={<SiLinkedin />}
    title="LinkedIn API"
    description="OpenAPI spec for the LinkedIn Marketing and Community APIs: posts, organizations and analytics"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/linkedin.yaml"
  />
  <Card
    icon={<SiTiktok />}
    title="TikTok API"
    description="OpenAPI spec for the TikTok Business APIs: video and photo publishing, creator info, comments and analytics"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/tiktok.yaml"
  />
  <Card
    icon={<SiYoutube />}
    title="YouTube Data API"
    description="OpenAPI spec for the YouTube Data API v3: videos, channels, playlists and comments"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/youtube.yaml"
  />
  <Card
    icon={<SiPinterest />}
    title="Pinterest API"
    description="OpenAPI spec for the Pinterest API v5: pins, boards and analytics"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/pinterest.yaml"
  />
  <Card
    icon={<SiReddit />}
    title="Reddit API"
    description="OpenAPI spec for the Reddit API: posts, comments, subreddits and users"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/reddit.yaml"
  />
  <Card
    icon={<SiThreads />}
    title="Threads API"
    description="OpenAPI spec for the Threads API: posts, replies and user profiles"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/threads.yaml"
  />
  <Card
    icon={<SiBluesky />}
    title="Bluesky API (AT Protocol)"
    description="OpenAPI spec for the Bluesky AT Protocol: posts, follows and feeds"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/bluesky.yaml"
  />
  <Card
    icon={<Store />}
    title="Google Business Profile API"
    description="OpenAPI spec for the Google Business Profile API: reviews, posts and locations"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/googlebusiness.yaml"
  />
  <Card
    icon={<SiTelegram />}
    title="Telegram Bot API"
    description="OpenAPI spec for the Telegram Bot API: messages, updates and inline queries"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/telegram.yaml"
  />
  <Card
    icon={<SiWhatsapp />}
    title="WhatsApp Business API"
    description="OpenAPI spec for the WhatsApp Business Platform: messages, templates, media and flows"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/whatsapp.yaml"
  />
  <Card
    icon={<SiSnapchat />}
    title="Snapchat Marketing API"
    description="OpenAPI spec for the Snapchat Marketing API: ads, campaigns and analytics"
    href="https://github.com/zernio-dev/openapi-specs/blob/main/snapchat.yaml"
  />
</Cards>

### Use a spec

Each spec has a raw URL:

```
https://raw.githubusercontent.com/zernio-dev/openapi-specs/main/<file>.yaml
```

`<file>` is the file the card links (`twitter.yaml` for X). Everything below takes that URL.

Import into Postman: copy the raw URL, open Postman, choose File and then Import, and paste it.

Generate a client. The generator reads the raw URL, so there is nothing to download first:

```bash
openapi-generator-cli generate \
  -i https://raw.githubusercontent.com/zernio-dev/openapi-specs/main/twitter.yaml \
  -g typescript-fetch -o ./twitter-sdk
```

View in Swagger UI:

```bash
docker run -p 8080:8080 -e SWAGGER_JSON_URL=https://raw.githubusercontent.com/zernio-dev/openapi-specs/main/twitter.yaml swaggerapi/swagger-ui
```

Issues and pull requests for the specs go to the [openapi-specs repository](https://github.com/zernio-dev/openapi-specs).

The platform specs are snapshots of other companies' APIs, so open an issue when one drifts from the live platform.

## Projects

Four open-source apps built on the Zernio API, each one a working starting point rather than a sample:

<Cards>
  <Card
    icon={<GithubIcon />}
    title="Latewiz"
    description="Open-source social media scheduler built on the Zernio API"
    href="https://github.com/zernio-dev/latewiz"
  />
  <Card
    icon={<GithubIcon />}
    title="Zernflow"
    description="Open-source visual chatbot builder for Instagram, Facebook, Telegram, X, Bluesky and Reddit"
    href="https://github.com/zernio-dev/zernflow"
  />
  <Card
    icon={<GithubIcon />}
    title="Unified Inbox"
    description="Open-source inbox for WhatsApp, Instagram, Messenger, Telegram, X, Reddit and Bluesky, built on the Zernio API"
    href="https://github.com/zernio-dev/unified-inbox"
  />
  <Card
    icon={<GithubIcon />}
    title="Ads Dashboard"
    description="Open-source ads reporting dashboard for the Zernio API. Paste your API key, see your ads data."
    href="https://github.com/zernio-dev/ads-dashboard"
  />
</Cards>