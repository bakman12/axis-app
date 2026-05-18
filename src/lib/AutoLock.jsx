// AutoLock.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Automatically locks the app (wipes the in-memory key) after a period of
// inactivity, or immediately when the user backgrounds the app.
//
// This is an invisible component — it renders nothing to the screen. It is
// mounted inside the authenticated app shell (App.jsx) and removed when the
// app is locked (because the entire authenticated shell is replaced by BiometricGate).
//
// HOW LOCKING WORKS:
//   lock() is called from CryptoContext. It:
//     1. Calls clearCurrentKey() — wipes the AES-GCM key from RAM
//     2. Sets isUnlocked = false in React state
//     3. App.jsx sees isUnlocked = false and re-renders BiometricGate
//     4. The user must re-authenticate with PIN or biometric to continue
//
// INACTIVITY TIMER:
//   Default timeout is 60 seconds (configurable via setAutoLockTimeout).
//   Any pointer, keyboard, scroll, or touch event resets the timer.
//   The timer is paused when the app is backgrounded (page hidden) because
//   locking fires immediately on hide anyway.
//
// BACKGROUND LOCK:
//   As soon as document.hidden = true (user switches away), the app locks.
//   This means data is never visible in the app switcher thumbnail or if
//   someone picks up an unlocked phone.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useCrypto } from './CryptoContext';
import { queryClientInstance } from './query-client';

// localStorage key that stores the configured auto-lock delay in milliseconds.
const STORAGE_KEY = 'axis_auto_lock_timeout';

// Default: lock after 60 seconds of no interaction.
const DEFAULT_TIMEOUT_MS = 60_000;

// Read the current auto-lock timeout setting (used by the Settings page to display it).
export function getAutoLockTimeout() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_TIMEOUT_MS;
}

// Save a new auto-lock timeout (called from the Settings page).
// Pass 0 to disable auto-lock entirely.
export function setAutoLockTimeout(ms) {
  localStorage.setItem(STORAGE_KEY, String(ms));
}

export default function AutoLock() {
  // Pull lock() and isUnlocked from the crypto context.
  // isUnlocked is used as a dependency so the effect re-registers listeners
  // when the app unlocks (e.g. after the user re-authenticates).
  const { lock, isUnlocked } = useCrypto();

  // useRef stores the timeout ID so we can cancel it when activity resets the timer.
  const timerRef = useRef(null);

  useEffect(() => {
    // Don't start the timer while the app is locked — BiometricGate handles that.
    if (!isUnlocked) return;

    const doLock = () => {
      // Clear the React Query cache so stale decrypted data isn't sitting in memory.
      queryClientInstance.clear();
      lock();
    };

    // Cancel any running timer and start a fresh one based on the current setting.
    const resetTimer = () => {
      clearTimeout(timerRef.current);
      const timeout = getAutoLockTimeout();
      if (timeout === 0) return; // Auto-lock disabled — don't set a timer.
      timerRef.current = setTimeout(doLock, timeout);
    };

    // Lock immediately when the app goes to the background (tab switch, home button).
    // When the user returns, reset the inactivity timer so they get a full timeout window.
    const handleVisibilityChange = () => {
      if (document.hidden) doLock();
      else resetTimer();
    };

    // Intentional interactions only — pointermove and scroll are excluded because
    // they fire continuously during passive browsing and would prevent the lock
    // from ever triggering on an unattended device.
    const EVENTS = ['pointerdown', 'keydown', 'touchstart'];
    EVENTS.forEach(e => document.addEventListener(e, resetTimer, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the timer immediately when this effect runs.
    resetTimer();

    // Cleanup: cancel the timer and remove all listeners when unmounted or re-run.
    return () => {
      clearTimeout(timerRef.current);
      EVENTS.forEach(e => document.removeEventListener(e, resetTimer, { capture: true }));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUnlocked, lock]);

  // This component exists purely for side effects — it renders nothing.
  return null;
}
