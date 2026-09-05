# Design System

## MUI Theme
Custom MUI theme with:
- Primary color: #1a237e (deep navy — defense/security aesthetic)
- Secondary color: #b71c1c (alert red)
- Background: #0a0e1a (dark mode default)
- Surface: #1a1f2e

## Typography
- Display: Roboto Mono (technical feel)
- Body: Roboto
- Code: Fira Code

## Security Status Colors
See `docs/ui-ux/09_SECURITY_INDICATORS.md` for color system for security states.

## Component Library
MUI v5 components as base. Custom components:
- `<ProtectedRenderer />` — Canvas-based protected content renderer
- `<SecurityStatusBar />` — Session status bar
- `<BlockchainTxBadge txHash={hash} />` — Clickable tx hash badge
- `<WatermarkOverlay />` — Watermark rendering component
- `<ProtectionProfileBadge profile={...} />` — Profile indicator
