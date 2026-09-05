# Security Indicators

## Status Bar (Protected Viewer)
Always visible during protected session:

```
🔒 PROTECTED VIEW — HIGH | Session expires in 18:42 | ⚠ 1 security event
```

## Color Coding
| State | Color | Meaning |
|:---|:---|:---|
| PROTECTED_VIEW | Green | Normal protected viewing |
| SUSPICIOUS_ACTIVITY | Amber | Browser event detected |
| HEIGHTENED_PROTECTION | Orange | Repeated events |
| CONTENT_OBSCURED | Red | Content hidden |
| EXPIRED | Gray | Session expired |

## Watermark Visibility
Watermark is intentionally visible to the user.
Users should understand that their session is watermarked.
Watermark presence is shown in the status bar.

## Blockchain Evidence
After access decisions: tx hash shown with link format.
Users can copy tx hash to verify on admin audit interface.

## Protection Profile Badge
Badge shows active profile: LOW | MEDIUM | HIGH | EXTREME
Users cannot change profile; it is set by admin per resource.
