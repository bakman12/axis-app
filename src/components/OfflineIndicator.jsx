import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, Cloud, CloudOff } from 'lucide-react';
import { toast } from 'sonner';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...', {
        icon: <Wifi className="w-4 h-4" />
      });
      
      // Trigger sync of pending operations
      window.dispatchEvent(new CustomEvent('online-sync'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will sync when reconnected.', {
        icon: <WifiOff className="w-4 h-4" />,
        duration: 5000
      });
    };

    const handlePendingUpdate = (e) => {
      setPendingOperations(e.detail.count);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pending-operations-updated', handlePendingUpdate);

    // Check initial pending operations
    const stored = localStorage.getItem('offline_queue');
    if (stored) {
      const queue = JSON.parse(stored);
      setPendingOperations(queue.length);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pending-operations-updated', handlePendingUpdate);
    };
  }, []);

  if (isOnline && pendingOperations === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}>
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className="shadow-lg flex items-center gap-2"
      >
        {isOnline ? (
          <>
            <Cloud className="w-3 h-3" />
            Syncing {pendingOperations} change{pendingOperations !== 1 ? 's' : ''}...
          </>
        ) : (
          <>
            <CloudOff className="w-3 h-3" />
            Offline Mode
            {pendingOperations > 0 && ` • ${pendingOperations} pending`}
          </>
        )}
      </Badge>
    </div>
  );
}