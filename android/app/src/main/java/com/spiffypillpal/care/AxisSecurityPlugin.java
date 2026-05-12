package com.spiffypillpal.care;

import android.content.pm.PackageManager;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.List;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * AxisSecurityPlugin — Hardware-backed security for Axis.
 *
 * Exposed to JavaScript via Capacitor. Provides:
 *   1. Device integrity checks (root, Frida, emulator)
 *   2. AES-256-GCM key generation inside the Android Keystore
 *      — stored in the hardware Secure Element (StrongBox) when available
 *      — key material NEVER leaves the hardware chip
 *   3. Encrypt / decrypt operations performed inside the Keystore
 *   4. Key deletion (called on security breach or app wipe)
 */
@CapacitorPlugin(name = "AxisSecurity")
public class AxisSecurityPlugin extends Plugin {

    // Alias used to identify our key inside the Android Keystore.
    private static final String KEY_ALIAS       = "axis_master_key_v1";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final int    GCM_TAG_BITS    = 128;

    // ── Public plugin methods (called from JS) ────────────────────────────────

    /**
     * Run all device integrity checks and return results.
     * JS receives: { isRooted, isFridaDetected, hasStrongBox, isEmulator }
     */
    @PluginMethod
    public void checkSecurity(PluginCall call) {
        JSObject result = new JSObject();
        result.put("isRooted",        isRooted());
        result.put("isFridaDetected", isFridaDetected());
        result.put("hasStrongBox",    hasStrongBox());
        result.put("isEmulator",      isEmulator());
        call.resolve(result);
    }

    /**
     * Generate an AES-256-GCM key inside the Android Keystore.
     * Uses StrongBox (hardware Secure Element) on supported devices (Android 9+, Pixel 3+, Samsung S20+).
     * Falls back to TEE (Trusted Execution Environment) on older hardware — still hardware-backed,
     * just not in a discrete security chip.
     *
     * The key requires user authentication (biometric or device PIN) before each use.
     * It is invalidated if the user enrolls new biometrics, preventing an attacker
     * from adding their fingerprint to take over the key.
     */
    @PluginMethod
    public void generateHardwareKey(PluginCall call) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            // Skip generation if key already exists from a previous setup.
            if (keyStore.containsAlias(KEY_ALIAS)) {
                call.resolve();
                return;
            }

            KeyGenerator kg = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE
            );

            KeyGenParameterSpec.Builder spec = new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
            .setKeySize(256)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            // Require the user to authenticate before each use of the key.
            .setUserAuthenticationRequired(true)
            // Invalidate the key if new biometrics are enrolled — prevents
            // an attacker adding their fingerprint to unlock existing data.
            .setInvalidatedByBiometricEnrollment(true);

            // Android 11+: specify which auth methods are accepted.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                spec.setUserAuthenticationParameters(
                    0, // 0 = require auth on every use (no time window)
                    KeyProperties.AUTH_BIOMETRIC_STRONG | KeyProperties.AUTH_DEVICE_CREDENTIAL
                );
            } else {
                // Pre-Android 11: -1 = require auth on every use.
                spec.setUserAuthenticationValidityDurationSeconds(-1);
            }

            // Use StrongBox if the device has a dedicated hardware Secure Element.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && hasStrongBox()) {
                spec.setIsStrongBoxBacked(true);
            }

            kg.init(spec.build());
            kg.generateKey();
            call.resolve();
        } catch (Exception e) {
            call.reject("generateHardwareKey failed: " + e.getMessage());
        }
    }

    /**
     * Encrypt a string using the hardware Keystore key.
     * Returns { ciphertext: base64, iv: base64 }.
     * This operation only succeeds if the user has recently authenticated
     * (biometric or device PIN) — Android enforces this at the hardware level.
     */
    @PluginMethod
    public void encryptWithHardwareKey(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("data is required"); return; }

        try {
            SecretKey key = getKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key);

            byte[] iv         = cipher.getIV();
            byte[] ciphertext = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));

            JSObject result = new JSObject();
            result.put("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP));
            result.put("iv",         Base64.encodeToString(iv,         Base64.NO_WRAP));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("encryptWithHardwareKey failed: " + e.getMessage());
        }
    }

    /**
     * Decrypt ciphertext encrypted by encryptWithHardwareKey.
     * Returns { data: plaintext string }.
     */
    @PluginMethod
    public void decryptWithHardwareKey(PluginCall call) {
        String ciphertextB64 = call.getString("ciphertext");
        String ivB64         = call.getString("iv");
        if (ciphertextB64 == null || ivB64 == null) {
            call.reject("ciphertext and iv are required");
            return;
        }

        try {
            SecretKey key  = getKey();
            byte[]    iv   = Base64.decode(ivB64,         Base64.NO_WRAP);
            byte[]    ct   = Base64.decode(ciphertextB64, Base64.NO_WRAP);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));

            byte[] plaintext = cipher.doFinal(ct);
            JSObject result = new JSObject();
            result.put("data", new String(plaintext, StandardCharsets.UTF_8));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("decryptWithHardwareKey failed: " + e.getMessage());
        }
    }

    /**
     * Permanently delete the hardware key from the Keystore.
     * Called when a security breach is detected or the user resets the app.
     * Once deleted, all data encrypted with this key is permanently unreadable.
     */
    @PluginMethod
    public void deleteHardwareKey(PluginCall call) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) {
                keyStore.deleteEntry(KEY_ALIAS);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("deleteHardwareKey failed: " + e.getMessage());
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private SecretKey getKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    }

    /** True if the device has a dedicated hardware Secure Element (StrongBox). */
    private boolean hasStrongBox() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return getContext().getPackageManager()
                .hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE);
        }
        return false;
    }

    /**
     * Detect a rooted device using four independent signals.
     * Any single positive signal is enough to flag the device as rooted.
     */
    private boolean isRooted() {
        // 1. Look for the su binary in well-known locations.
        String[] suPaths = {
            "/system/bin/su",        "/system/xbin/su",
            "/sbin/su",              "/data/local/xbin/su",
            "/data/local/bin/su",    "/data/local/su",
            "/system/sd/xbin/su",    "/system/bin/failsafe/su",
            "/system/app/Superuser.apk",
            "/system/app/SuperSU.apk",
        };
        for (String path : suPaths) {
            if (new File(path).exists()) return true;
        }

        // 2. AOSP test-key builds are unsigned production images — typically rooted.
        String tags = Build.TAGS;
        if (tags != null && tags.contains("test-keys")) return true;

        // 3. Look for known root-management packages (Magisk, SuperSU, etc.).
        List<String> rootPackages = Arrays.asList(
            "com.topjohnwu.magisk",
            "com.koushikdutta.superuser",
            "com.noshufou.android.su",
            "eu.chainfire.supersu",
            "com.thirdparty.superuser",
            "com.yellowes.su",
            "com.kingroot.kinguser",
            "com.kingo.root"
        );
        PackageManager pm = getContext().getPackageManager();
        for (String pkg : rootPackages) {
            try {
                pm.getPackageInfo(pkg, 0);
                return true;
            } catch (PackageManager.NameNotFoundException ignored) {}
        }

        // 4. Check the ro.debuggable system property — enabled on rooted/debug builds.
        try {
            Process p = Runtime.getRuntime().exec(new String[]{"getprop", "ro.debuggable"});
            byte[] buf = new byte[4];
            p.getInputStream().read(buf);
            if (new String(buf).trim().equals("1")) return true;
        } catch (Exception ignored) {}

        return false;
    }

    /**
     * Detect the Frida instrumentation framework using three signals.
     * Frida is the primary tool attackers use to hook into app memory
     * and intercept encryption/decryption calls at runtime.
     */
    private boolean isFridaDetected() {
        // 1. Default Frida server listens on TCP port 27042.
        try {
            new Socket("127.0.0.1", 27042).close();
            return true; // Connection succeeded = Frida server running
        } catch (Exception ignored) {}

        // 2. Scan /proc/self/maps for Frida library names loaded into this process.
        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/self/maps"));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("frida")       ||
                    line.contains("gum-js-loop") ||
                    line.contains("linjector")) {
                    reader.close();
                    return true;
                }
            }
            reader.close();
        } catch (Exception ignored) {}

        // 3. Look for the Frida server binary on the filesystem.
        String[] fridaFiles = {
            "/data/local/tmp/frida-server",
            "/data/local/tmp/re.frida.server",
        };
        for (String path : fridaFiles) {
            if (new File(path).exists()) return true;
        }

        return false;
    }

    /**
     * Detect common Android emulators.
     * Emulators don't have real hardware Secure Elements and are used by
     * attackers to analyse apps in a controlled environment.
     */
    private boolean isEmulator() {
        return Build.FINGERPRINT.startsWith("google/sdk_gphone")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.MODEL.contains("google_sdk")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
            || Build.MANUFACTURER.contains("Genymotion")
            || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
            || Build.PRODUCT.equals("google_sdk");
    }
}
