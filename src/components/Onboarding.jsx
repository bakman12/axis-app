// Onboarding.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Three-screen first-launch flow shown once before the app shell renders.
// Stored completion flag: localStorage 'axis_onboarded' = '1'
//
// Screens:
//   1. Security    — your data is encrypted, only you can read it
//   2. Tracking    — never miss a dose, reminders that work
//   3. Travel      — the USP — medication management built for travel
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Lock, Bell, Plane, ChevronRight, Check } from 'lucide-react';

const STORAGE_KEY = 'axis_onboarded';

export function hasCompletedOnboarding() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function markOnboardingComplete() {
  localStorage.setItem(STORAGE_KEY, '1');
}

const SCREENS = [
  {
    icon:     Lock,
    color:    'bg-orange-600',
    title:    'Your data, encrypted',
    subtitle: 'Medical data is sensitive. Axis encrypts everything on your device with military-grade AES-256. We cannot read it. Nobody can.',
    bullets:  [
      'PIN + biometric protection',
      'Zero-knowledge encryption',
      'Works fully offline',
    ],
  },
  {
    icon:     Bell,
    color:    'bg-blue-600',
    title:    'Never miss a dose',
    subtitle: "Set your medication schedule once. Axis reminds you at the right time, every day — even when you're busy.",
    bullets:  [
      'Daily reminders per medication',
      'Mark doses taken in one tap',
      'Refill alerts before you run out',
    ],
  },
  {
    icon:     Plane,
    color:    'bg-emerald-600',
    title:    'Built for travel',
    subtitle: 'Going abroad? Axis calculates exactly how many pills to pack, handles time zone changes, and keeps your schedule on track anywhere in the world.',
    bullets:  [
      'Trip packing calculator',
      'Time zone aware scheduling',
      'Emergency medical ID — no unlock needed',
    ],
  },
];

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0);
  const isLast = screen === SCREENS.length - 1;
  const { icon: Icon, color, title, subtitle, bullets } = SCREENS[screen];

  const advance = () => {
    if (isLast) {
      markOnboardingComplete();
      onComplete();
    } else {
      setScreen(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-between px-6 py-12">

      {/* Progress dots */}
      <div className="flex gap-2 self-center">
        {SCREENS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === screen ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-8 text-center max-w-xs">
        {/* Icon */}
        <div className={`w-24 h-24 rounded-3xl ${color} flex items-center justify-center shadow-2xl`}>
          <Icon className="w-12 h-12 text-white" />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-white text-2xl font-bold leading-tight">{title}</h1>
          <p className="text-gray-400 text-sm leading-relaxed">{subtitle}</p>
        </div>

        {/* Bullet points */}
        <div className="space-y-2 self-start w-full">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-orange-600/20 border border-orange-600/40 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-orange-400" />
              </div>
              <span className="text-gray-300 text-sm">{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={advance}
          className="w-full py-4 rounded-2xl bg-orange-600 active:bg-orange-700 text-white font-bold text-lg flex items-center justify-center gap-2 select-none"
        >
          {isLast ? 'Get started' : 'Next'}
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Skip — only shown on non-last screens */}
        {!isLast && (
          <button
            onClick={() => { markOnboardingComplete(); onComplete(); }}
            className="w-full py-2 text-gray-500 text-sm select-none"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
