# Document Copy Protection

## Applied Techniques

### Text Selection
```css
user-select: none;
-webkit-user-select: none;
```
Prevents mouse-drag text selection in most browsers.
Limitation: CSS can be disabled via developer tools.

### Right-Click Context Menu
```javascript
document.addEventListener('contextmenu', e => e.preventDefault());
```
Disables browser default context menu on protected content area.
Limitation: Can be bypassed via browser extensions or developer tools.

### Keyboard Shortcuts
Selected copy shortcuts (Ctrl+C, Ctrl+A) are intercepted and blocked on protected content area.
Limitation: Does not prevent OS-level clipboard access.

### Drag Prevention
```css
-webkit-user-drag: none;
pointer-events: none; /* on content layer */
```

## Honest Limitations
These techniques reduce casual copying. A determined user can bypass them using:
- Browser developer tools
- Browser extensions
- OS-level tools

Copy protection is a deterrent layer, not an absolute control.
