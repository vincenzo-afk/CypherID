// Capture monitoring — ONLY browser-observable events per
// docs/protection/capture/02_BROWSER_OBSERVABLE_EVENTS.md.
// Observable: visibilitychange, blur/focus, fullscreenchange, freeze/resume,
// beforeprint, PrintScreen-class key heuristics (key blocked, NOT screenshot detected).
// NEVER report OS-level capture. NEVER claim "screenshot detected".
export const EVENT_TYPES = {
  TAB_HIDDEN: 'TAB_HIDDEN',
  TAB_VISIBLE: 'TAB_VISIBLE',
  WINDOW_BLUR: 'WINDOW_BLUR',
  WINDOW_FOCUS: 'WINDOW_FOCUS',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  PAGE_FROZEN: 'PAGE_FROZEN',
  PAGE_RESUMED: 'PAGE_RESUMED',
  PRINT_ATTEMPT: 'PRINT_ATTEMPT',
  PRINT_KEY_BLOCKED: 'PRINT_KEY_BLOCKED'
};

export function startCaptureMonitoring(onEvent) {
  const emit = (eventType, metadata = {}) => {
    onEvent && onEvent({
      eventType,
      timestamp: new Date().toISOString(),
      metadata
    });
  };

  const onVisibility = () => {
    emit(document.hidden ? EVENT_TYPES.TAB_HIDDEN : EVENT_TYPES.TAB_VISIBLE, { hidden: document.hidden });
  };
  const onBlur = () => emit(EVENT_TYPES.WINDOW_BLUR, {});
  const onFocus = () => emit(EVENT_TYPES.WINDOW_FOCUS, {});
  const onFullscreen = () => {
    if (!document.fullscreenElement) emit(EVENT_TYPES.FULLSCREEN_EXIT, {});
  };
  const onFreeze = () => emit(EVENT_TYPES.PAGE_FROZEN, {});
  const onResume = () => emit(EVENT_TYPES.PAGE_RESUMED, {});
  const onBeforePrint = () => emit(EVENT_TYPES.PRINT_ATTEMPT, { source: 'beforeprint' });
  const onKeyDown = (e) => {
    // Heuristic only: block the key default where possible. This does NOT
    // detect or prevent OS-level screenshots.
    if (e.key === 'PrintScreen' || ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === 'S'))) {
      e.preventDefault();
      emit(EVENT_TYPES.PRINT_KEY_BLOCKED, { key: e.key });
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  document.addEventListener('fullscreenchange', onFullscreen);
  document.addEventListener('freeze', onFreeze);
  document.addEventListener('resume', onResume);
  window.addEventListener('beforeprint', onBeforePrint);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('fullscreenchange', onFullscreen);
    document.removeEventListener('freeze', onFreeze);
    document.removeEventListener('resume', onResume);
    window.removeEventListener('beforeprint', onBeforePrint);
    window.removeEventListener('keydown', onKeyDown);
  };
}
