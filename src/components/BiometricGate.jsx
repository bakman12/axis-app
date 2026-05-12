// BiometricGate.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The full-screen lock screen shown when the app starts or after auto-lock.
// The user must pass through this gate before any medical data is visible.
//
// ── PHASES (screens within the gate) ─────────────────────────────────────────
//
//   'checking'        — brief loading spinner while we detect biometric hardware
//   'setup-pin'       — first-time: user types a new 6-digit PIN
//   'setup-confirm'   — first-time: user re-types the PIN to confirm it matches
//   'setup-biometric' — first-time: "Enable Fingerprint?" offer after PIN is set
//   'pin'             — returning user: enter PIN to unlock (biometric button shown too)
//   'emergency'       — shows the Emergency Medical ID card without unlocking the app
//
// ── BIOMETRIC AUTO-TRIGGER ────────────────────────────────────────────────────
//
//   When the gate opens and biometrics are enrolled, it automatically fires the
//   native OS biometric popup (Samsung Knox / Face ID) 250ms after the PIN screen
//   renders. This saves the user from having to tap a button.
//   The autoTriggered ref prevents this from firing more than once per gate open.
//
// ── FIRST-TIME SETUP FLOW ─────────────────────────────────────────────────────
//
//   setup-pin → (6 digits entered) → setup-confirm → (matches) →
//   generateAndStoreKey(pin) → setup-biometric → user taps "Enable" →
//   registerBiometric() → onUnlocked()  (app opens)
//
//   If the user skips biometrics: setup-biometric → "Skip" → onUnlocked()
//
// ── RETURNING USER FLOW ───────────────────────────────────────────────────────
//
//   pin screen opens → auto-trigger biometric popup (250ms delay) →
//     SUCCESS: onUnlocked()
//     FAIL:    "Biometric failed — enter your PIN" error shown, user types PIN
//   User can also tap the fingerprint/face button to re-trigger the popup.
//
// PROPS:
//   onUnlocked — called with no arguments once the gate should open.
//                In App.jsx this is wired to directUnlock() from CryptoContext.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCrypto } from '@/lib/CryptoContext';
import { Lock, Fingerprint, ScanFace, AlertCircle, Heart, ShieldX } from 'lucide-react';
import EmergencyIDCard from './EmergencyIDCard';
import { runSecurityCheck, ensureHardwareKey, wipeHardwareKey } from '@/lib/AxisSecurity';

const PIN_LENGTH = 6; // Number of digits in the PIN

export default function BiometricGate({ onUnlocked }) {
  // Pull everything we need from the crypto context.
  const {
    hasStoredKey, generateAndStoreKey,
    isWebAuthnAvailable, isBiometricEnrolled, getBiometryType,
    registerBiometric,
    unlockWithBiometric, unlockWithPin,
  } = useCrypto();

  // Current screen within the gate (see phases listed above).
  // 'compromised' is added here — shown when root/Frida is detected.
  const [phase, setPhase] = useState('checking');

  // Stores the reason the device was flagged (shown to user on compromised screen).
  const [threatReason, setThreatReason] = useState('');

  // PIN digits during first-time setup (setup-pin phase).
  const [setupPin, setSetupPin] = useState('');

  // PIN digits during confirmation (setup-confirm phase).
  const [confirmPin, setConfirmPin] = useState('');

  // PIN digits during normal unlock (pin phase).
  const [pin, setPin] = useState('');

  // Error message displayed below the PIN dots (wrong PIN, biometric failed, etc.)
  const [error, setError] = useState('');

  // How many times the user has entered an incorrect PIN this session.
  const [attempts, setAttempts] = useState(0);

  // true if the device has biometric hardware (fingerprint sensor / Face ID camera).
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // 'face' or 'fingerprint' — determines which icon and label to show.
  const [biometryType, setBiometryType] = useState('fingerprint');

  // Prevents the auto-biometric popup from firing more than once per gate open.
  const autoTriggered = useRef(false);

  // ── Biometric unlock ────────────────────────────────────────────────────────

  // Shows the native OS biometric popup. If it succeeds, calls onUnlocked() to
  // open the app. If it fails, shows an error and leaves the PIN screen visible.
  const tryBiometric = useCallback(async () => {
    const ok = await unlockWithBiometric();
    if (ok) { onUnlocked(); return; }
    setError('Biometric failed — enter your PIN');
  }, [unlockWithBiometric, onUnlocked]);

  // ── Initialisation ──────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      // ── Step 1: Device integrity check ──────────────────────────────────────
      // Run before showing any UI so a compromised device never reaches the PIN screen.
      const security = await runSecurityCheck();

      if (!security.isSafe) {
        // Device is rooted or Frida is active. Wipe the hardware key so even
        // the ciphertext in localStorage is permanently unreadable.
        await wipeHardwareKey();
        setThreatReason(
          security.isRooted        ? 'Root access detected on this device.' :
          security.isFridaDetected ? 'Instrumentation framework detected (Frida).' :
          'Device integrity check failed.'
        );
        setPhase('compromised');
        return;
      }

      // ── Step 2: Ensure hardware key exists ──────────────────────────────────
      // Generates the Keystore key on first run; no-op if already exists.
      await ensureHardwareKey();

      // ── Step 3: Normal unlock flow ───────────────────────────────────────────
      const available = await isWebAuthnAvailable();
      setBiometricAvailable(available);
      setBiometryType(await getBiometryType());

      if (!hasStoredKey()) {
        setPhase('setup-pin');
        return;
      }

      setPhase('pin');

      if (available && isBiometricEnrolled() && !autoTriggered.current) {
        autoTriggered.current = true;
        setTimeout(() => tryBiometric(), 250);
      }
    })();
  }, [hasStoredKey, isWebAuthnAvailable, isBiometricEnrolled, getBiometryType, tryBiometric]);

  // ── PIN digit input ─────────────────────────────────────────────────────────

  // Called when a dial-pad digit is tapped.
  // Appends the digit to whichever PIN string is active for the current phase,
  // then triggers the next action when PIN_LENGTH digits are accumulated.
  const handleDigit = (d) => {
    setError('');
    if (phase === 'setup-pin') {
      const next = setupPin + d;
      setSetupPin(next);
      if (next.length === PIN_LENGTH) setPhase('setup-confirm');
    } else if (phase === 'setup-confirm') {
      const next = confirmPin + d;
      setConfirmPin(next);
      if (next.length === PIN_LENGTH) finishPinSetup(next);
    } else if (phase === 'pin') {
      const next = pin + d;
      setPin(next);
      if (next.length === PIN_LENGTH) attemptPinUnlock(next);
    }
  };

  // Called when the backspace button is tapped.
  const handleBack = () => {
    setError('');
    if (phase === 'setup-pin')     setSetupPin(p => p.slice(0, -1));
    else if (phase === 'setup-confirm') setConfirmPin(p => p.slice(0, -1));
    else if (phase === 'pin')      setPin(p => p.slice(0, -1));
  };

  // ── Setup flow ──────────────────────────────────────────────────────────────

  // Called when the user finishes typing the confirmation PIN.
  // Checks it matches the original, generates the master key, then moves to
  // the biometric offer screen (or unlocks directly if biometrics unavailable).
  const finishPinSetup = async (confirmed) => {
    if (confirmed !== setupPin) {
      // Mismatch — clear both and restart from step 1.
      setConfirmPin('');
      setSetupPin('');
      setPhase('setup-pin');
      setError("PINs don't match — try again");
      return;
    }

    // Generate master key wrapped with this PIN (key loaded into memory but
    // app stays locked until the user completes/skips biometric setup).
    await generateAndStoreKey(confirmed);

    if (biometricAvailable) {
      setPhase('setup-biometric'); // Offer fingerprint/Face ID enrolment
    } else {
      onUnlocked(); // No biometric hardware — open the app immediately
    }
  };

  // Called from the "Enable Biometrics" / "Skip" buttons on setup-biometric screen.
  // enroll=true: shows Samsung Knox / Face ID prompt then stores seed in keychain.
  // enroll=false: skips biometric setup entirely.
  const handleBiometricSetup = async (enroll) => {
    if (enroll) await registerBiometric();
    onUnlocked(); // Open the app regardless of whether enrolment succeeded
  };

  // ── PIN unlock ──────────────────────────────────────────────────────────────

  // Called when the user has entered all PIN_LENGTH digits on the unlock screen.
  // Wrong PINs increment the attempt counter and show an error.
  // After 5 wrong attempts, a stronger error message is shown (no lockout yet,
  // but this signals that something is wrong).
  const attemptPinUnlock = async (entered) => {
    const ok = await unlockWithPin(entered);
    if (ok) { onUnlocked(); return; }
    const next = attempts + 1;
    setAttempts(next);
    setPin('');
    setError(next >= 5 ? 'Too many attempts — please restart the app' : 'Incorrect PIN');
  };

  // ── Shared helpers ──────────────────────────────────────────────────────────

  // Which PIN string to use for the dot indicators depending on current phase.
  const activeDots = phase === 'setup-pin' ? setupPin
    : phase === 'setup-confirm' ? confirmPin
    : pin;

  // Heading text for each PIN phase.
  const screenTitle = {
    'setup-pin':     'Create your PIN',
    'setup-confirm': 'Confirm your PIN',
    'pin':           'Enter PIN',
  }[phase];

  // Subtitle text for each PIN phase.
  const screenSubtitle = {
    'setup-pin':     `Choose a ${PIN_LENGTH}-digit PIN to protect your medical data`,
    'setup-confirm': 'Re-enter your PIN to confirm',
    'pin':           'Enter your PIN to unlock Axis',
  }[phase];

  const bioLabel = biometryType === 'face' ? 'Face ID' : 'Fingerprint';

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'checking') return <LoadingScreen />;

  // Device failed integrity check — block access entirely and show reason.
  if (phase === 'compromised') {
    return (
      <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center px-8 gap-6">
        <div className="w-20 h-20 rounded-full bg-red-950 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <div className="text-center space-y-3">
          <p className="text-white text-2xl font-bold">Device Compromised</p>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            {threatReason}
          </p>
          <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
            Axis has wiped its encryption key to protect your medical data.
            Restore your device to factory settings to use Axis again.
          </p>
        </div>
        <div className="mt-4 px-4 py-2 bg-red-950/50 border border-red-800 rounded-xl">
          <p className="text-red-400 text-xs text-center font-mono">AXIS-SEC-001</p>
        </div>
      </div>
    );
  }

  // Emergency ID screen — shown without unlocking the app so bystanders can
  // see critical medical info (allergies, blood type, etc.) in an emergency.
  if (phase === 'emergency') {
    return (
      <div className="fixed inset-0 bg-gray-950 z-50 overflow-y-auto flex flex-col items-center justify-center py-8">
        <EmergencyIDCard onClose={() => setPhase(hasStoredKey() ? 'pin' : 'setup-pin')} />
      </div>
    );
  }

  // Biometric enrolment offer shown once after first-time PIN setup.
  if (phase === 'setup-biometric') {
    const BiometryIcon = biometryType === 'face' ? ScanFace : Fingerprint;
    return (
      <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center gap-6 px-6">
        <AppLogo />
        <div className="text-center space-y-2">
          <BiometryIcon className="w-16 h-16 text-orange-500 mx-auto" />
          <p className="text-white text-xl font-semibold">Enable {bioLabel}?</p>
          <p className="text-gray-400 text-sm text-center max-w-xs">
            Use {bioLabel} to unlock instead of typing your PIN every time.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <BigButton label={`Enable ${bioLabel}`} onClick={() => handleBiometricSetup(true)} />
          <GhostButton label="Skip — use PIN only" onClick={() => handleBiometricSetup(false)} />
        </div>
      </div>
    );
  }

  // PIN entry screen (setup-pin, setup-confirm, and pin phases all share this layout).
  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center px-6 gap-6">
      <AppLogo />

      {/* Screen heading */}
      <div className="text-center">
        <p className="text-white text-xl font-bold">{screenTitle}</p>
        <p className="text-gray-400 text-sm mt-1">{screenSubtitle}</p>
      </div>

      {/* Dot indicators — one dot per digit, filled dots show how many have been entered */}
      <PinDots filled={activeDots.length} total={PIN_LENGTH} />

      {/* Error message (wrong PIN, biometric failed, etc.) */}
      {error && <ErrorMessage msg={error} />}

      {/* Number pad */}
      <DialPad onDigit={handleDigit} onBack={handleBack} />

      {/* Biometric button — shown on the unlock screen whenever biometrics are available.
          If already enrolled: tapping shows the OS popup to unlock.
          If not enrolled yet: tapping triggers the enrolment flow so the user can
          set up fingerprint/Face ID without going through first-time setup again. */}
      {phase === 'pin' && biometricAvailable && (
        isBiometricEnrolled()
          ? <BiometricButton
              type={biometryType}
              label={biometryType === 'face' ? 'Use Face ID' : 'Use Fingerprint'}
              onClick={() => { setError(''); tryBiometric(); }}
            />
          : <BiometricButton
              type={biometryType}
              label={biometryType === 'face' ? 'Set up Face ID' : 'Set up Fingerprint'}
              onClick={async () => {
                setError('');
                const ok = await registerBiometric();
                if (ok) tryBiometric(); // Immediately try to unlock after enrolling
                else setError('Biometric setup failed — use PIN');
              }}
            />
      )}

      {/* Emergency button — opens medical ID card without unlocking the full app */}
      <EmergencyBtn onPress={() => setPhase('emergency')} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
// Small presentational components kept at the bottom to keep the main component readable.

// Full-screen spinner shown during the async initialisation check.
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// App logo shown at the top of every gate screen.
function AppLogo() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg">
        <Lock className="w-8 h-8 text-white" />
      </div>
      <p className="text-orange-500 font-bold text-lg tracking-widest">AXIS</p>
    </div>
  );
}

// Row of circles indicating PIN entry progress.
// Filled (orange) = digit entered, empty = waiting.
function PinDots({ filled, total }) {
  return (
    <div className="flex gap-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all ${
            i < filled ? 'bg-orange-500 border-orange-500' : 'bg-transparent border-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

// Standard phone-style number dial pad (1–9, 0, backspace).
function DialPad({ onDigit, onBack }) {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
      {[1,2,3,4,5,6,7,8,9].map(d => (
        <button
          key={d}
          onClick={() => onDigit(String(d))}
          className="h-16 rounded-2xl bg-gray-800 active:bg-gray-700 text-white text-2xl font-semibold select-none"
        >
          {d}
        </button>
      ))}
      {/* Empty cell to pad the bottom row so 0 sits in the centre */}
      <div />
      <button
        onClick={() => onDigit('0')}
        className="h-16 rounded-2xl bg-gray-800 active:bg-gray-700 text-white text-2xl font-semibold select-none"
      >
        0
      </button>
      <button
        onClick={onBack}
        className="h-16 rounded-2xl bg-gray-800 active:bg-gray-700 flex items-center justify-center select-none"
        aria-label="Delete"
      >
        <span className="text-orange-400 text-2xl">⌫</span>
      </button>
    </div>
  );
}

// Biometric action button shown below the dial pad.
// Used for both "Use Fingerprint" (unlock) and "Set up Fingerprint" (enroll).
function BiometricButton({ type, label, onClick }) {
  const Icon = type === 'face' ? ScanFace : Fingerprint;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full max-w-xs px-5 py-4 rounded-2xl bg-gray-800 active:bg-gray-700 select-none"
    >
      <Icon className="w-6 h-6 text-orange-400 flex-shrink-0" />
      <span className="text-orange-400 font-semibold text-base">{label}</span>
    </button>
  );
}

// Primary action button (solid orange background).
function BigButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 rounded-2xl bg-orange-600 active:bg-orange-700 text-white font-bold text-lg select-none"
    >
      {label}
    </button>
  );
}

// Secondary action button (dark background, orange text).
function GhostButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-2xl bg-gray-800 active:bg-gray-700 text-orange-400 font-semibold select-none"
    >
      {label}
    </button>
  );
}

// Inline error message with an alert icon.
function ErrorMessage({ msg }) {
  return (
    <div className="flex items-center gap-2 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {msg}
    </div>
  );
}

// Red-bordered button at the bottom of the gate that opens the Emergency Medical ID
// without requiring authentication — accessible to first responders.
function EmergencyBtn({ onPress }) {
  return (
    <button
      onClick={onPress}
      className="flex items-center gap-2 mt-1 px-5 py-3 rounded-xl border-2 border-red-600 text-red-400 font-semibold text-sm active:bg-red-900/20 select-none"
    >
      <Heart className="w-4 h-4" />
      Emergency Medical ID
    </button>
  );
}
