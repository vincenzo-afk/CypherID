# Content Security

## Protected Content Delivery
1. Server-side authorization before any content delivery
2. Chunked delivery (no full document in one response)
3. Server-side decryption only (AES-256-GCM)
4. Session-bound delivery (content tied to session token)
5. Session expiry enforced

## Content in Browser
Protected content rendered on Canvas.
Content not present as DOM text nodes.
Not accessible via browser developer tools text inspection.

## Limitation
Canvas pixels can be captured via OS-level tools.
Camera-resistant rendering reduces readability of captured frames.
This is a reduction, not a prevention.

## Anti-Caching
Protected content responses include:
```
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
```
Content must not be cached by browser or CDN.
