# Accessibility

## Target
WCAG 2.1 AA for all non-protected-content UI elements.

## Protected Renderer Exception
See `docs/ui-ux/14_ACCESSIBILITY.md`.
Canvas content is not accessible to screen readers (security constraint).
Alternative text provided for screen readers.

## Keyboard Navigation
All UI elements reachable by keyboard.
Focus management: modals and overlays trap focus correctly.

## Color Contrast
All text: minimum 4.5:1 ratio.
Security status indicators: color + icon (never color alone).

## Reduced Motion
`prefers-reduced-motion`: temporal effects disabled, animations reduced.
