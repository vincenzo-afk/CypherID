# Browser-Observable Events

## What the Browser Can Actually Observe

The following events are observable via standard browser APIs:

### 1. Visibility Change
API: `document.addEventListener('visibilitychange', ...)`
Detects: Tab hidden (user switches tab, minimizes window)
Limitation: Does not indicate why tab was hidden

### 2. Focus Events
API: `window.addEventListener('blur', ...)` / `window.addEventListener('focus', ...)`
Detects: Window/document loses/gains focus
Limitation: Triggered by many benign actions (clicking address bar, notifications)

### 3. Fullscreen Change
API: `document.addEventListener('fullscreenchange', ...)`
Detects: Fullscreen entered or exited
Limitation: Cannot determine if screen recorder is active

### 4. Page Lifecycle (Freeze/Discard)
API: `document.addEventListener('freeze', ...)` / `document.addEventListener('resume', ...)`
Detects: Browser throttles or discards page
Limitation: Not a capture event, but indicates page is not in foreground

### 5. Print Events
API: `window.addEventListener('beforeprint', ...)`
Detects: Print dialog opened
Limitation: Does not prevent OS-level print to PDF

### 6. Keyboard Events (Heuristic)
Specific key combinations (PrintScreen, ⌘⇧3, ⌘⇧4) can be detected and their default action blocked in some browsers.
Limitation: Does NOT prevent OS-level screenshot tools; OS capture does not go through browser key handling.

## What the Browser CANNOT Observe
- OS-level screen recording (OBS, ShareX, Snip & Sketch, macOS screen recording)
- VM-level screen capture
- Physical camera pointing at display
- GPU-level frame capture
- Another browser tab doing screen capture via screen sharing API (only detectable if permission was requested through same browser context)

## Engineering Rule
NEVER report OS-level capture events. NEVER claim "screenshot detected" when a keyboard shortcut was blocked. The browser blocked a key event; it did not detect a screenshot.
