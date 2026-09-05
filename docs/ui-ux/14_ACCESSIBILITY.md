# Accessibility

## WCAG 2.1 AA Target
All non-protected-content UI elements must meet WCAG 2.1 AA.

## Known Limitation: Protected Renderer
Protected content rendered on Canvas is NOT accessible to screen readers.
This is an architectural trade-off: screen readers would receive the raw text, bypassing protection.

## Mitigation
- Alternative text: "Protected document — [document title]. Screen reader access is not available for protected content for security reasons."
- Non-protected UI elements (navigation, status bar, controls) remain fully accessible.

## Reduced Motion
When `prefers-reduced-motion: reduce` is set:
- All temporal rendering effects disabled
- Protection profile automatically limited to LOW (spatial only)
- Watermark animation disabled (static position)

## Color Contrast
All text elements (outside protected renderer) meet 4.5:1 contrast ratio.
Security indicators use color + icon (not color alone) to convey state.

## Keyboard Navigation
All UI actions accessible via keyboard.
Protected viewer: keyboard navigation for page controls, not content.
