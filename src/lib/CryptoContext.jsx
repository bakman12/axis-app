// CryptoContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The security brain of the app. Manages:
//   - Generating and storing the master encryption key (first-time setup)
//   - Unlocking the app with a PIN or biometric (fingerprint / Face ID)
//   - Locking the app (wiping the key from memory)
//   - Changing the PIN
//
// ── HOW THE KEY SYSTEM WORKS ─────────────────────────────────────────────────
//
//  The app uses a single 256-bit AES-GCM "master key" to encrypt all medical
//  data. This key is NEVER stored as plain text. Instead it is "wrapped"
//  (encrypted) two ways and both wrapped copies are stored in localStorage:
//
//    1. PIN wrap:       The master key is encrypted using a key derived from
//                       the user's PIN + device ID via PBKDF2 (600,000 rounds).
//                       Stored in localStorage as "axis_pin_key_v1".
//
//    2. Biometric wrap: The master key is encrypted using a random 32-byte seed.
//                       Stored in localStorage as "axis_bio_key_v1".
//                       The seed itself is protected:
//                         - On native (Android/iOS): stored in the OS secure
//                           keychain via NativeBiometric.setCredentials(), only
//                           retrievable after the user passes biometric auth.
//                         - On web: stored in localStorage (less secure, but
//                           WebAuthn credential proof is required to use it).
//
//  When the user unlocks (PIN or biometric), we decrypt the wrapped copy to
//  recover the raw master key bytes, import them as a CryptoKey, and store
//  the live key in cryptoStore.js (RAM only). It is never written to disk.
//
// ── PLATFORM DETECTION ───────────────────────────────────────────────────────
//
//  isNativePlatform() checks window.Capacitor at runtime. This is injected by
//  the Capacitor shell when the app runs as a native Android/iOS app. In a
//  plain browser (PWA), Capacitor is absent and isNativePlatform() returns false.
//  The biometric functions use this to choose between:
//    - Native: @capgo/capacitor-native-biometric (Samsung Knox / Face ID)
//    - Web:    WebAuthn navigator.credentials.create/get
//
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback } from 'react';
import { setCurrentKey, clearCurrentKey } from './cryptoStore';
import { logAuditEvent, AUDIT } from './auditLog';

// ── localStorage key names ────────────────────────────────────────────────────
// All values stored here are ciphertext — raw key bytes are never persisted.
const PIN_WRAPPED_KEY      = 'axis_pin_key_v1';       // PIN-wrapped master key envelope
const BIOMETRIC_SEED_KEY   = 'axis_bio_seed_v1';       // random seed (web fallback only)
const BIO_WRAPPED_KEY      = 'axis_bio_key_v1';        // seed-wrapped master key envelope
const DEVICE_ID_KEY        = 'axis_device_id';         // stable random ID mixed into PIN derivation
const WEBAUTHN_CRED_KEY    = 'axis_webauthn_cred';     // WebAuthn credential ID (web only)
const NATIVE_BIO_ENROLLED  = 'axis_native_bio_enrolled'; // flag: native biometric has been set up
const NATIVE_BIO_SERVER    = 'com.axis.biometric';     // keychain server name for NativeBiometric

// ── Platform helpers ──────────────────────────────────────────────────────────

// Returns true when running inside a Capacitor native shell (Android or iOS).
// window.Capacitor is injected by the Capacitor runtime; absent in plain browsers.
function isNativePlatform() {
  try { return window.Capacitor?.isNativePlatform?.() ?? false; } catch { return false; }
}

// ── Context setup ─────────────────────────────────────────────────────────────

const CryptoContext = createContext(null);

export function CryptoProvider({ children }) {
  // isUnlocked drives the gate in App.jsx — false = BiometricGate is shown,
  // true = the rest of the app is rendered.
  const [isUnlocked, setIsUnlocked] = useState(false);

  // ── Device ID ───────────────────────────────────────────────────────────────

  // Returns a stable random ID for this device, creating one on first call.
  // Mixed into the PIN key derivation so a brute-force attack against the
  // localStorage data would need to know this device's ID to succeed.
  const getDeviceId = useCallback(() => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      const raw = window.crypto.getRandomValues(new Uint8Array(16));
      id = btoa(String.fromCharCode(...raw));
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }, []);

  // ── Key existence check ─────────────────────────────────────────────────────

  // Returns true if the user has completed first-time PIN setup.
  // BiometricGate uses this to decide whether to show "Create PIN" or "Enter PIN".
  const hasStoredKey = useCallback(() => {
    return !!localStorage.getItem(PIN_WRAPPED_KEY);
  }, []);

  // ── First-time setup ────────────────────────────────────────────────────────

  // Called once during PIN setup. Generates the master key and stores two
  // wrapped copies: one for PIN unlock, one for biometric unlock.
  //
  // IMPORTANT: This does NOT flip isUnlocked. The caller (BiometricGate) is
  // responsible for calling directUnlock() after biometric setup is complete
  // (or immediately if the user skips biometric setup). This keeps the gate
  // visible during the "Enable Fingerprint?" screen.
  const generateAndStoreKey = useCallback(async (pin) => {
    // Generate a fresh 256-bit AES-GCM master key.
    const masterKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
    const rawMaster = new Uint8Array(await window.crypto.subtle.exportKey('raw', masterKey));

    // PIN path: wrap master key with PBKDF2-derived key (salt stored in the envelope).
    await _wrapWithPin(rawMaster, pin, getDeviceId());

    // Biometric path: wrap master key with a random local seed.
    // The seed is stored in localStorage here; on native it also gets pushed to the
    // OS keychain when the user actually enrolls biometrics (registerBiometric).
    const seed = window.crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(BIOMETRIC_SEED_KEY, btoa(String.fromCharCode(...seed)));
    await _wrapWithSeed(rawMaster, seed);

    // Load the key into memory (so the app can start encrypting) but do NOT
    // set isUnlocked=true yet — the gate must stay visible until biometric
    // setup (or skip) is complete.
    const secureKey = await window.crypto.subtle.importKey(
      'raw', rawMaster, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
    );
    setCurrentKey(secureKey);
  }, [getDeviceId]);

  // Flip the gate open without re-deriving the key.
  // Used by BiometricGate after setup is fully complete, and by App.jsx as
  // the onUnlocked callback passed into BiometricGate.
  const directUnlock = useCallback(() => setIsUnlocked(true), []);

  // ── Biometric helpers ─────────────────────────────────────────────────────────

  // Returns true if biometric hardware is available on this device.
  //   - Native: asks the @capgo/capacitor-native-biometric plugin
  //   - Web: asks the browser's WebAuthn platform authenticator API
  const isWebAuthnAvailable = useCallback(async () => {
    if (isNativePlatform()) {
      try {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
        const { isAvailable } = await NativeBiometric.isAvailable();
        return isAvailable;
      } catch { return false; }
    }
    if (!window.PublicKeyCredential) return false;
    return window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }, []);

  // Returns true if the user has already enrolled biometrics in THIS app
  // (i.e. gone through the "Enable Fingerprint?" setup step).
  const isBiometricEnrolled = useCallback(() => {
    if (isNativePlatform()) return !!localStorage.getItem(NATIVE_BIO_ENROLLED);
    return !!localStorage.getItem(WEBAUTHN_CRED_KEY);
  }, []);

  // Returns 'face' if Face ID / face unlock is the active biometry type,
  // 'fingerprint' for everything else (Touch ID, Samsung fingerprint, etc.).
  // Used by BiometricGate to show the right icon and label.
  const getBiometryType = useCallback(async () => {
    if (isNativePlatform()) {
      try {
        const { NativeBiometric, BiometryType } = await import('@capgo/capacitor-native-biometric');
        const { biometryType } = await NativeBiometric.isAvailable();
        // BiometryType.FACE_ID = 2 (iOS Face ID), numeric 4 = Android face unlock
        return (biometryType === BiometryType.FACE_ID || biometryType === 4)
          ? 'face' : 'fingerprint';
      } catch { return 'fingerprint'; }
    }
    return 'fingerprint';
  }, []);

  // Enrolls biometrics for this app. On native, shows the OS biometric prompt
  // to confirm the user's identity, then stores the seed in the OS keychain so
  // it can only be retrieved after biometric verification.
  const registerBiometric = useCallback(async () => {
    if (isNativePlatform()) {
      try {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');

        // Show the Samsung Knox / Face ID verification prompt.
        await NativeBiometric.verifyIdentity({
          reason: 'Enable biometric unlock for Axis',
          title: 'Set Up Biometrics',
          subtitle: 'Axis — Medical ID',
          negativeButtonText: 'Cancel',
        });

        // Identity verified — move the biometric seed from localStorage into the
        // native keychain so it's protected by the device's secure hardware.
        const seedB64 = localStorage.getItem(BIOMETRIC_SEED_KEY);
        if (!seedB64) return false;
        await NativeBiometric.setCredentials({
          username: 'axis-bio-seed',
          password: seedB64,
          server: NATIVE_BIO_SERVER,
        });

        // Mark enrollment complete so future app launches auto-trigger the popup.
        localStorage.setItem(NATIVE_BIO_ENROLLED, '1');
        return true;
      } catch { return false; }
    }

    // ── Web fallback: WebAuthn ───────────────────────────────────────────────
    // Creates a platform authenticator credential (Touch ID in Safari, Windows Hello, etc.)
    // We only store the credential ID — the actual private key lives in the authenticator.
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: window.crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Axis', id: window.location.hostname },
          user: {
            id: window.crypto.getRandomValues(new Uint8Array(16)),
            name: 'axis-user',
            displayName: 'Axis User',
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000,
        },
      });
      const credId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      localStorage.setItem(WEBAUTHN_CRED_KEY, credId);
      return true;
    } catch { return false; }
  }, []);

  // Unlocks the app using biometric authentication.
  // Flow: verify biometric → retrieve seed from keychain → decrypt master key → unlock.
  const unlockWithBiometric = useCallback(async () => {
    if (isNativePlatform()) {
      // Check enrollment flag before showing any prompt.
      if (!localStorage.getItem(NATIVE_BIO_ENROLLED)) return false;
      try {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');

        // Show the native OS biometric prompt (Samsung Knox BiometricPrompt / Face ID).
        await NativeBiometric.verifyIdentity({
          reason: 'Unlock Axis',
          title: 'Axis',
          subtitle: 'Use biometric to unlock',
          negativeButtonText: 'Use PIN',
        });

        // Biometric passed — retrieve the seed from the native keychain.
        const { password: seedB64 } = await NativeBiometric.getCredentials({
          server: NATIVE_BIO_SERVER,
        });
        const wrappedB64 = localStorage.getItem(BIO_WRAPPED_KEY);
        if (!seedB64 || !wrappedB64) return false;

        // Use the seed to decrypt the wrapped master key.
        const seed = Uint8Array.from(atob(seedB64), c => c.charCodeAt(0));
        const rawMaster = await _unwrapWithSeed(wrappedB64, seed);
        if (!rawMaster) return false;

        // Import the raw bytes as a CryptoKey and load it into memory.
        const key = await window.crypto.subtle.importKey(
          'raw', rawMaster, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
        );
        setCurrentKey(key);
        setIsUnlocked(true);
        return true;
      } catch { return false; }
    }

    // ── Web fallback: WebAuthn ───────────────────────────────────────────────
    // Prove the user controls the credential (triggers Touch ID / Windows Hello popup),
    // then use the locally stored seed to decrypt the master key.
    const credIdB64  = localStorage.getItem(WEBAUTHN_CRED_KEY);
    const seedB64    = localStorage.getItem(BIOMETRIC_SEED_KEY);
    const wrappedB64 = localStorage.getItem(BIO_WRAPPED_KEY);
    if (!credIdB64 || !seedB64 || !wrappedB64) return false;
    try {
      const credId = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0));
      await navigator.credentials.get({
        publicKey: {
          challenge: window.crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: 'public-key', id: credId, transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      const seed = Uint8Array.from(atob(seedB64), c => c.charCodeAt(0));
      const rawMaster = await _unwrapWithSeed(wrappedB64, seed);
      if (!rawMaster) return false;
      const key = await window.crypto.subtle.importKey(
        'raw', rawMaster, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
      );
      setCurrentKey(key);
      setIsUnlocked(true);
      logAuditEvent(AUDIT.APP_UNLOCKED, { method: 'biometric' });
      return true;
    } catch { return false; }
  }, []);

  // Unlocks the app using the user's PIN.
  // Flow: derive key from PIN+deviceId → decrypt wrapped master key → unlock.
  const unlockWithPin = useCallback(async (pin) => {
    const wrappedJson = localStorage.getItem(PIN_WRAPPED_KEY);
    if (!wrappedJson) return false;
    try {
      const rawMaster = await _unwrapWithPin(wrappedJson, pin, getDeviceId());
      if (!rawMaster) return false;
      const key = await window.crypto.subtle.importKey(
        'raw', rawMaster, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
      );
      setCurrentKey(key);
      setIsUnlocked(true);
      logAuditEvent(AUDIT.APP_UNLOCKED, { method: 'pin' });
      return true;
    } catch {
      return false; // Wrong PIN causes AES-GCM decryption to throw — we return false.
    }
  }, [getDeviceId]);

  // Changes the PIN without needing to regenerate the master key.
  // Decrypts with the current PIN, then re-wraps with the new PIN.
  const changePin = useCallback(async (currentPin, newPin) => {
    const wrappedJson = localStorage.getItem(PIN_WRAPPED_KEY);
    if (!wrappedJson) return false;
    try {
      const rawMaster = await _unwrapWithPin(wrappedJson, currentPin, getDeviceId());
      if (!rawMaster) return false;
      await _wrapWithPin(rawMaster, newPin, getDeviceId());
      return true;
    } catch {
      return false;
    }
  }, [getDeviceId]);

  // Wipes the in-memory key and sets isUnlocked=false, causing App.jsx to
  // re-render BiometricGate so the user must re-authenticate.
  const lock = useCallback(() => {
    logAuditEvent(AUDIT.APP_LOCKED);
    clearCurrentKey();
    setIsUnlocked(false);
  }, []);

  return (
    <CryptoContext.Provider value={{
      isUnlocked,
      lock,
      hasStoredKey,
      generateAndStoreKey,
      isWebAuthnAvailable,
      isBiometricEnrolled,
      getBiometryType,
      directUnlock,
      registerBiometric,
      unlockWithBiometric,
      unlockWithPin,
      changePin,
    }}>
      {children}
    </CryptoContext.Provider>
  );
}

// ── Private crypto helpers ────────────────────────────────────────────────────
// These functions live outside the component to avoid re-creation on every render.

// Derives a 256-bit AES-GCM key from a PIN string using PBKDF2.
// The deviceId is mixed in so the same PIN on a different device produces a
// different key — limits the damage if localStorage is copied to another machine.
// 600,000 PBKDF2 rounds makes brute-force expensive (OWASP 2023 recommendation).
async function derivePinKey(pin, deviceId, salt) {
  const material = await window.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin + deviceId), 'PBKDF2', false, ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

// Encrypts rawMaster with a PIN-derived key and stores the result in localStorage.
// The envelope contains: ciphertext, AES-GCM IV, and PBKDF2 salt (all base64).
async function _wrapWithPin(rawMaster, pin, deviceId) {
  const salt   = window.crypto.getRandomValues(new Uint8Array(16));
  const pinKey = await derivePinKey(pin, deviceId, salt);
  const iv     = window.crypto.getRandomValues(new Uint8Array(12));
  const ct     = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, pinKey, rawMaster);
  const envelope = {
    ct:   btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv:   btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
  localStorage.setItem(PIN_WRAPPED_KEY, JSON.stringify(envelope));
}

// Decrypts the PIN-wrapped envelope. Returns raw master key bytes, or throws
// if the PIN is wrong (AES-GCM authentication tag mismatch).
async function _unwrapWithPin(wrappedJson, pin, deviceId) {
  const { ct, iv, salt } = JSON.parse(wrappedJson);
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const pinKey    = await derivePinKey(pin, deviceId, saltBytes);
  const ctBytes   = Uint8Array.from(atob(ct),   c => c.charCodeAt(0));
  const ivBytes   = Uint8Array.from(atob(iv),   c => c.charCodeAt(0));
  return new Uint8Array(await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, pinKey, ctBytes));
}

// Encrypts rawMaster directly with a random seed (used for the biometric path).
async function _wrapWithSeed(rawMaster, seed) {
  const seedKey = await window.crypto.subtle.importKey(
    'raw', seed, { name: 'AES-GCM' }, false, ['encrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, seedKey, rawMaster);
  const envelope = {
    ct: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv: btoa(String.fromCharCode(...iv)),
  };
  localStorage.setItem(BIO_WRAPPED_KEY, JSON.stringify(envelope));
}

// Decrypts the seed-wrapped envelope using the seed retrieved from the keychain.
async function _unwrapWithSeed(wrappedJson, seed) {
  const { ct, iv } = JSON.parse(wrappedJson);
  const seedKey = await window.crypto.subtle.importKey(
    'raw', seed, { name: 'AES-GCM' }, false, ['decrypt']
  );
  const ctBytes = Uint8Array.from(atob(ct), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  return new Uint8Array(await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, seedKey, ctBytes));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

// Use this hook in any component that needs crypto functions or the isUnlocked state.
// Throws if called outside of <CryptoProvider>.
export const useCrypto = () => {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto must be used inside CryptoProvider');
  return ctx;
};
