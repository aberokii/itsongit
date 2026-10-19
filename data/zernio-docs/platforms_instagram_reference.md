# Limits & Errors

What Instagram's API does not expose and the common errors when publishing.

## What you cannot do

Instagram's API does not expose:

- Story stickers (polls, questions, links, countdowns)
- Location search by name (pass a Facebook Page id in `locationId` instead)
- Going live
- Guides
- Filters
- Product tags
- Posting to personal accounts (Business or Creator only)

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot process video from this URL. Instagram cannot fetch videos from Google Drive, Dropbox, or OneDrive." | A cloud storage sharing link instead of a direct media URL | Use a direct media URL ([Media URLs](/platforms/instagram/media#media-urls)). |
| "You have reached the maximum of 100 posts per day allowed for your account." | Instagram's rolling 24-hour limit, every content type counted | Reduce posting volume. |
| "Instagram blocked your request." | Automation detection | Reduce posting frequency, vary content, wait before retrying. |
| "Duplicate content detected." | Identical content published recently | Change the caption or media. |
| "Media fetch failed, retrying... (failed after 3 attempts)" | Zernio could not download the media | Check that the URL is public and returns media bytes, not an HTML page. |
| "Instagram access token expired." | The OAuth token expired | Reconnect the account. The `account.disconnected` webhook catches this early. |
| No DM history after connecting (new messages still arrive) | The user turned message access off on their own account | Instagram > Settings > Website permissions > Connected tools: turn it on, then reconnect. |

A `publishNow: true` post that Instagram rejects returns `207` with `post.status: "failed"` and the message in `platforms[].errorMessage`:

```json
{
  "message": "Post created but publishing failed",
  "error": "All platforms failed",
  "post": {
    "_id": "65f1c0a9e2b5af0012ab34cd",
    "status": "failed",
    "platforms": [
      {
        "platform": "instagram",
        "status": "failed",
        "errorMessage": "Cannot process video from this URL. Instagram cannot fetch videos from Google Drive, Dropbox, or OneDrive."
      }
    ]
  }
}
```

`207` is a 2xx status, so `fetch(...).ok` is `true`; branch on the status code and on `post.status`. [Error handling](/guides/error-handling) covers the envelope.