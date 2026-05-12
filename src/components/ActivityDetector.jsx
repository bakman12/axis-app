// ActivityDetector.jsx
// ─────────────────────────────────────────────────────────────────────────────
// A UI card that monitors how active the user is and tries to detect if they
// have been asleep. This is used by the Health Coach feature to decide whether
// to send "you may have missed a dose because you were asleep" style reminders.
//
// HOW ACTIVITY IS TRACKED:
//   - Any mouse move, click, key press, scroll, or touch resets the "active" timer.
//   - If no interaction happens for 5 minutes, the user is considered "inactive".
//   - The Page Visibility API tells us when the user leaves the tab/app entirely.
//     We timestamp that departure so we can measure how long they were away.
//
// HOW SLEEP IS DETECTED:
//   - If the user was away (tab hidden) for MORE than 6 hours, we fire a
//     'sleep_detected' event via the onActivityChange callback.
//   - If away for 30–360 minutes, we fire 'long_inactivity' instead.
//   - We also check every 60 seconds in case the tab stays open but the user
//     has stopped interacting for 6+ hours.
//
// PROPS:
//   onActivityChange(event) — called when a notable activity event is detected.
//     event.type: 'sleep_detected' | 'long_inactivity'
//     event.duration_minutes: how long the user was away
//     event.timestamp: ISO string of when we detected it
//
// NOTE: This is a display card — it renders a small status widget showing
//   whether the user is currently active and how long they've been inactive.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Moon, Eye, EyeOff } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

export default function ActivityDetector({ onActivityChange }) {
  // true = user has interacted in the last 5 minutes, false = idle
  const [isActive, setIsActive] = useState(true);

  // Timestamp of the most recent user interaction
  const [lastActivity, setLastActivity] = useState(new Date());

  // How many minutes since the last interaction (displayed in the card)
  const [inactivityMinutes, setInactivityMinutes] = useState(0);

  // true once we've fired the sleep_detected event, so we don't fire it repeatedly
  const [sleepDetected, setSleepDetected] = useState(false);

  useEffect(() => {
    let activityTimeout;    // fires after 5 minutes of no interaction → mark inactive
    let inactivityInterval; // ticks every 60 seconds to update the inactivity counter

    // Called whenever ANY user interaction is detected.
    // Resets the inactive timer back to 5 minutes.
    const resetActivity = () => {
      setIsActive(true);
      setLastActivity(new Date());
      setInactivityMinutes(0);
      setSleepDetected(false);

      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        // No interaction for 5 minutes — mark the user as inactive.
        setIsActive(false);
      }, 5 * 60 * 1000);
    };

    // Register all the events that count as "user interaction".
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetActivity, true);
    });

    // Page Visibility API: fires when the user switches tabs, minimises the browser,
    // or presses the home button on their phone.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left — record the exact time so we can measure absence duration.
        setIsActive(false);
        localStorage.setItem('lastActiveTime', new Date().toISOString());
      } else {
        // User returned — calculate how long they were away.
        const lastActiveTime = localStorage.getItem('lastActiveTime');
        if (lastActiveTime) {
          const awayMinutes = differenceInMinutes(new Date(), new Date(lastActiveTime));

          if (awayMinutes > 360) {
            // Away for 6+ hours — very likely the user was asleep.
            setSleepDetected(true);
            onActivityChange?.({
              type: 'sleep_detected',
              duration_minutes: awayMinutes,
              timestamp: new Date().toISOString()
            });
          } else if (awayMinutes > 30) {
            // Away for 30 minutes to 6 hours — notable but not necessarily sleep.
            onActivityChange?.({
              type: 'long_inactivity',
              duration_minutes: awayMinutes,
              timestamp: new Date().toISOString()
            });
          }
        }
        // Restart the 5-minute inactivity timer now that the user is back.
        resetActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Every 60 seconds, update the displayed inactivity counter and check for
    // sleep in case the tab was left open all night without being hidden.
    inactivityInterval = setInterval(() => {
      if (!isActive) {
        const minutes = differenceInMinutes(new Date(), lastActivity);
        setInactivityMinutes(minutes);

        if (minutes > 360 && !sleepDetected) {
          setSleepDetected(true);
          onActivityChange?.({
            type: 'sleep_detected',
            duration_minutes: minutes,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 60000);

    // Start listening immediately.
    resetActivity();

    // Remove all listeners and timers when the component unmounts.
    return () => {
      clearTimeout(activityTimeout);
      clearInterval(inactivityInterval);
      events.forEach(event => {
        document.removeEventListener(event, resetActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, lastActivity, onActivityChange, sleepDetected]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Activity Monitor
          </div>
          {/* Active/Inactive badge in the top-right of the card */}
          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
            {isActive ? (
              <><Eye className="w-3 h-3 mr-1" /> Active</>
            ) : (
              <><EyeOff className="w-3 h-3 mr-1" /> Inactive</>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-xs text-gray-600">

          {/* Sleep warning banner — shown once sleep has been detected */}
          {sleepDetected && (
            <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
              <Moon className="w-4 h-4 text-purple-600" />
              <span className="text-purple-700 font-medium">
                Disrupted sleep detected - extra reminders enabled
              </span>
            </div>
          )}

          {/* Inactivity duration — only shown while inactive */}
          {!isActive && inactivityMinutes > 0 && (
            <p className="text-gray-500">
              Inactive for {inactivityMinutes} minute{inactivityMinutes !== 1 ? 's' : ''}
            </p>
          )}

          {/* Timestamp of the last detected interaction */}
          <p className="text-gray-400">
            Last activity: {format(lastActivity, 'HH:mm:ss')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
