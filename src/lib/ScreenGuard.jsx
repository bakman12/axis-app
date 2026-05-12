// ScreenGuard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Prevents medical data from appearing in the Android/iOS app switcher thumbnail
// and in browser tab previews.
//
// TWO LAYERS OF PROTECTION:
//
//   1. Native layer (Android):  FLAG_SECURE is set in MainActivity.java.
//      This tells the Android OS to block screenshots, screen recording, and
//      Samsung's "Circle to Search" feature at the window level — before any
//      pixel ever reaches the capture pipeline.
//
//   2. Web layer (this component): A full-screen black overlay is shown whenever
//      the browser/WebView reports the page is hidden (document.hidden = true).
//      This fires when the user:
//        - Switches to another app (app switcher thumbnail is captured AFTER this)
//        - Switches browser tabs
//        - Locks the phone screen
//      The overlay disappears instantly when the user returns to the app.
//
// WHY BOTH LAYERS?
//   FLAG_SECURE only works inside Capacitor native builds. When the app is opened
//   as a PWA in a browser, FLAG_SECURE has no effect, so the web overlay is the
//   only protection. Defense-in-depth means both always run together.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

export default function ScreenGuard() {
  // Ref to the overlay <div> so we can show/hide it without triggering a React
  // re-render (direct DOM manipulation is faster and avoids any race conditions).
  const overlayRef = useRef(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    // The Page Visibility API fires 'visibilitychange' whenever the page moves
    // between foreground (visible) and background (hidden).
    const handleVisibilityChange = () => {
      // Show the black overlay when hidden, remove it when visible again.
      overlay.style.display = document.hidden ? 'flex' : 'none';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up the listener when this component unmounts.
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // The overlay sits at z-index 9999 (above everything including dialogs).
  // pointer-events-none means it won't accidentally block taps when briefly visible.
  // The faint orange circle is a subtle brand watermark visible when switching apps.
  return (
    <div
      ref={overlayRef}
      style={{ display: 'none' }}
      className="fixed inset-0 bg-gray-950 z-[9999] flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <div className="w-16 h-16 rounded-full bg-orange-600 opacity-30" />
    </div>
  );
}
