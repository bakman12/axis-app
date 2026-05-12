// cryptoStore.js
// ─────────────────────────────────────────────────────────────────────────────
// A tiny module-level (non-React) singleton that holds the in-memory AES-GCM
// master key while the app is unlocked.
//
// WHY a separate module instead of React state?
//   React hooks can only be called inside components. The encrypted API client
//   (encryptedBase44Client.js) is a plain JS module that runs outside React, so
//   it can't use useContext(). This file acts as a shared memory slot that both
//   the React crypto context (CryptoContext.jsx) and the API client can reach.
//
// SECURITY NOTE:
//   The raw key bytes are NEVER written to localStorage or any persistent store.
//   They only live here in RAM. When the app locks (AutoLock, screen hide, or
//   manual lock) CryptoContext calls clearCurrentKey() which sets this to null,
//   wiping the key from memory so encrypted data cannot be read until the user
//   re-authenticates with their PIN or biometric.
// ─────────────────────────────────────────────────────────────────────────────

// The active CryptoKey object, or null when the app is locked.
/** @type {CryptoKey | null} */
let currentKey = null;

// Called by CryptoContext after a successful PIN/biometric unlock to load the
// key into memory so the API client can start encrypting/decrypting.
/** @param {CryptoKey} key */
export function setCurrentKey(key) { currentKey = key; }

// Called by encryptedBase44Client.js before every encrypt/decrypt operation.
/** @returns {CryptoKey | null} */
export function getCurrentKey() { return currentKey; }

// Called by CryptoContext.lock() to wipe the key from memory and re-lock the app.
export function clearCurrentKey() { currentKey = null; }
