import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Moon, Eye, EyeOff } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

export default function ActivityDetector({ onActivityChange }) {
  const [isActive, setIsActive] = useState(true);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [inactivityMinutes, setInactivityMinutes] = useState(0);
  const [sleepDetected, setSleepDetected] = useState(false);

  useEffect(() => {
    let activityTimeout;
    let inactivityInterval;

    const resetActivity = () => {
      setIsActive(true);
      setLastActivity(new Date());
      setInactivityMinutes(0);
      setSleepDetected(false);
      
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        setIsActive(false);
      }, 5 * 60 * 1000); // 5 minutes of no activity
    };

    // Track user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetActivity, true);
    });

    // Page Visibility API - detect when user leaves/returns to tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsActive(false);
        const awayTime = new Date();
        
        // Store away time
        localStorage.setItem('lastActiveTime', awayTime.toISOString());
      } else {
        // User returned
        const lastActiveTime = localStorage.getItem('lastActiveTime');
        if (lastActiveTime) {
          const awayMinutes = differenceInMinutes(new Date(), new Date(lastActiveTime));
          
          // If away for more than 6 hours, likely sleeping
          if (awayMinutes > 360) {
            setSleepDetected(true);
            onActivityChange?.({
              type: 'sleep_detected',
              duration_minutes: awayMinutes,
              timestamp: new Date().toISOString()
            });
          } else if (awayMinutes > 30) {
            onActivityChange?.({
              type: 'long_inactivity',
              duration_minutes: awayMinutes,
              timestamp: new Date().toISOString()
            });
          }
        }
        resetActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track inactivity duration
    inactivityInterval = setInterval(() => {
      if (!isActive) {
        const minutes = differenceInMinutes(new Date(), lastActivity);
        setInactivityMinutes(minutes);
        
        // Detect potential sleep (inactive for 6+ hours)
        if (minutes > 360 && !sleepDetected) {
          setSleepDetected(true);
          onActivityChange?.({
            type: 'sleep_detected',
            duration_minutes: minutes,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 60000); // Check every minute

    resetActivity();

    return () => {
      clearTimeout(activityTimeout);
      clearInterval(inactivityInterval);
      events.forEach(event => {
        document.removeEventListener(event, resetActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, lastActivity, onActivityChange, sleepDetected]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Activity Monitor
          </div>
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
          {sleepDetected && (
            <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
              <Moon className="w-4 h-4 text-purple-600" />
              <span className="text-purple-700 font-medium">
                Disrupted sleep detected - extra reminders enabled
              </span>
            </div>
          )}
          
          {!isActive && inactivityMinutes > 0 && (
            <p className="text-gray-500">
              Inactive for {inactivityMinutes} minute{inactivityMinutes !== 1 ? 's' : ''}
            </p>
          )}
          
          <p className="text-gray-400">
            Last activity: {format(lastActivity, 'HH:mm:ss')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}