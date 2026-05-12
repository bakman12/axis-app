// AxisSecurity.js
// ─────────────────────────────────────────────────────────────────────────────
// JavaScript bridge to the AxisSecurityPlugin native Capacitor plugin.
//
// On native (Android/iOS): delegates to Java/Swift which uses:
//   - Android Keystore / iOS Secure Enclave for hardware-backed crypto
//   - Root/jailbreak detection, Frida detection, emulator detection
//
// On web (browser/PWA): returns safe defaults — hardware security isn't
// available in a browser, but the software AES-GCM layer still applies.
// ─────────────────────────────────────────────────────────────────────────────

import { registerPlugin } from '@capacitor/core';

// Web fallback implementation — used when running in a plain browser.
// Returns clean/safe values since a browser has no hardware Secure Element.
const webFallback = {
  checkSecurity: async () => ({
    isRooted:        false,
    isFridaDetected: false,
    hasStrongBox:    false,
    isEmulator:      false,
  }),
  generateHardwareKey:    async () => {},
  encryptWithHardwareKey: async ({ data }) => ({ ciphertext: data, iv: '' }),
  decryptWithHardwareKey: async ({ ciphertext }) => ({ data: ciphertext }),
  deleteHardwareKey:      async () => {},
};

// registerPlugin links the JS name 'AxisSecurity' to the native @CapacitorPlugin(name = "AxisSecurity")
// annotation in AxisSecurityPlugin.java / AxisSecurityPlugin.swift.
/** @type {typeof webFallback} */
const AxisSecurity = registerPlugin('AxisSecurity', { web: () => webFallback });

export default AxisSecurity;

// ── Convenience helpers ───────────────────────────────────────────────────────

/**
 * Run all integrity checks and return a single boolean indicating
 * whether the device is safe to use. Also returns the raw result
 * for logging/display purposes.
 *
 * A device is considered UNSAFE if it is:
 *   - Rooted (root can read localStorage + RAM)
 *   - Running Frida (can intercept function calls mid-execution)
 *
 * Emulators are flagged separately — they're blocked in production
 * but allowed during development (emulators have no StrongBox anyway).
 */
export async function runSecurityCheck() {
  const result = await AxisSecurity.checkSecurity();
  const isSafe = !result.isRooted && !result.isFridaDetected;
  return { ...result, isSafe };
}

/**
 * Generate the hardware-backed AES-256-GCM master key if it doesn't exist.
 * Safe to call on every app start — skips generation if key already present.
 */
export async function ensureHardwareKey() {
  return AxisSecurity.generateHardwareKey();
}

/**
 * Encrypt a JSON-serialisable value using the hardware Keystore key.
 * Returns { ciphertext, iv } — store both, you need both to decrypt.
 */
export async function hwEncrypt(value) {
  const data = typeof value === 'string' ? value : JSON.stringify(value);
  return AxisSecurity.encryptWithHardwareKey({ data });
}

/**
 * Decrypt a { ciphertext, iv } envelope previously produced by hwEncrypt.
 * Returns the original value as a string.
 */
export async function hwDecrypt(ciphertext, iv) {
  const { data } = await AxisSecurity.decryptWithHardwareKey({ ciphertext, iv });
  return data;
}

/**
 * Permanently wipe the hardware key.
 * Called when a security breach is detected — renders all encrypted data
 * permanently unreadable, even if the attacker has the ciphertext.
 */
export async function wipeHardwareKey() {
  return AxisSecurity.deleteHardwareKey();
}
