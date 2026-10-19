# Media Requirements

Image and video requirements for Instagram posts, and the rules for media URLs.

Files above these limits are compressed; original files are preserved.

## Images

| Property | Feed post | Story | Carousel |
|----------|-----------|-------|----------|
| Max images | 1 | 1 | 10 |
| Formats | JPEG, PNG | JPEG, PNG | JPEG, PNG |
| Max file size | 8 MB | 8 MB | 8 MB each |
| Recommended | 1080 x 1350 px | 1080 x 1920 px | 1080 x 1080 px |

Feed posts and carousels accept aspect ratios from tallest to widest:

- 9:16 (0.5625, 1080 x 1920 px, the tallest)
- 4:5 (1080 x 1350 px, best engagement)
- 1:1 (1080 x 1080 px)
- 1.91:1 (1080 x 566 px, the widest)

Stories and Reels are 9:16. Images outside the feed range must be posted as Stories or Reels.

## Videos

| Property | Feed | Reel | Story |
|----------|------|------|-------|
| Formats | MP4, MOV | MP4, MOV | MP4, MOV |
| Max file size | 300 MB | 300 MB | 100 MB |
| Max duration | 60 minutes | 90 seconds | 60 seconds |
| Min duration | 3 seconds | 3 seconds | 3 seconds |
| Aspect ratio | 4:5 to 1.91:1 | 9:16 | 9:16 |
| Resolution | 1080 px wide | 1080 x 1920 px | 1080 x 1920 px |
| Codec | H.264 | H.264 | H.264 |
| Frame rate | 30 fps | 30 fps | 30 fps |

## Media URLs

A media URL must:

- Be publicly accessible with no authentication.
- Return the media bytes with the correct `Content-Type` header.
- Not redirect to an HTML page.
- Sit on a fast host.

Google Drive, Dropbox, OneDrive and iCloud sharing links return an HTML page instead of the file, so Instagram's servers cannot fetch from them. Use a direct media URL or upload through the [media endpoint](/guides/media-uploads).

Test a URL in an incognito window. A webpage instead of the raw file means the post will fail.

Zernio proxies Supabase storage URLs automatically, so they work without any change.