# Frontend Security

## Content Security Policy
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' (MUI requires inline styles);
  img-src 'self' data:;
  connect-src 'self' wss://;
  frame-ancestors 'none';
```

## No Sensitive Data in Local Storage
JWT tokens stored in memory only (not localStorage or sessionStorage).
Refresh tokens in httpOnly secure cookies.

## XSS Prevention
- No `dangerouslySetInnerHTML` usage
- All user-generated content sanitized before render
- React default JSX escaping relies on framework

## No Secrets Client-Side
No API keys, signing secrets, or encryption keys in frontend code.

## Protected Renderer Security
- Canvas content not accessible via DOM inspection
- No document text rendered as DOM text nodes
- `pointer-events: none` on canvas overlay prevents interaction-based content extraction

## Subresource Integrity
All CDN resources (if any) use SRI hashes.
