# Focus Monitoring

API: `window` blur/focus events.
Detects: window loses/gains focus.
High false positive rate (address bar click, notification).
Use with debouncing: only log if focus lost for > 2 seconds.
