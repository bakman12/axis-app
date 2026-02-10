import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function SnoozeButton({ medication, scheduledTime, onSnooze }) {
  const [snoozedUntil, setSnoozedUntil] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    const storageKey = `snooze_${medication.id}_${scheduledTime}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const snoozeTime = new Date(stored);
      if (snoozeTime > new Date()) {
        setSnoozedUntil(snoozeTime);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [medication.id, scheduledTime]);

  useEffect(() => {
    if (!snoozedUntil) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = snoozedUntil - now;

      if (diff <= 0) {
        setSnoozedUntil(null);
        localStorage.removeItem(`snooze_${medication.id}_${scheduledTime}`);
        toast.info(`Reminder: Time to take ${medication.name}`, {
          icon: '💊',
          duration: 5000
        });
        if (onSnooze) onSnooze(null);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [snoozedUntil, medication, scheduledTime, onSnooze]);

  const handleSnooze = async () => {
    try {
      const user = await base44.auth.me();
      const snoozeDuration = user?.snooze_duration || 10;
      const snoozeTime = new Date(Date.now() + snoozeDuration * 60000);

      setSnoozedUntil(snoozeTime);
      localStorage.setItem(`snooze_${medication.id}_${scheduledTime}`, snoozeTime.toISOString());

      const soundType = user?.reminder_sound_type || 'default';
      playNotificationSound(soundType);

      toast.success(`Snoozed for ${snoozeDuration} minutes`, {
        icon: '⏰',
        description: `Will remind you at ${snoozeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });

      if (onSnooze) onSnooze(snoozeTime);
    } catch (error) {
      toast.error('Failed to snooze reminder');
    }
  };

  const playNotificationSound = (soundType) => {
    if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies = {
      default: [523.25, 659.25],
      gentle: [440, 523.25],
      chime: [523.25, 659.25, 783.99],
      bell: [659.25, 783.99],
      alert: [880, 1046.50]
    };

    const freq = frequencies[soundType] || frequencies.default;
    oscillator.frequency.value = freq[0];
    gainNode.gain.value = 0.3;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  if (snoozedUntil) {
    return (
      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
        <Clock className="w-4 h-4" />
        <span>Snoozed ({timeRemaining})</span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleSnooze}
      variant="outline"
      size="sm"
      className="h-9 select-none"
    >
      <Bell className="w-4 h-4 mr-2" />
      Snooze
    </Button>
  );
}