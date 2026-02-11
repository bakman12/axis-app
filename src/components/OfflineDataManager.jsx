import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Store for offline data
const CACHE_PREFIX = 'medmind_cache_';
const QUEUE_KEY = 'offline_queue';
const LAST_SYNC_KEY = 'last_sync_time';

export const OfflineStorage = {
  // Cache data
  setCache(key, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to cache data:', e);
    }
  },

  getCache(key, maxAge = 1000 * 60 * 60 * 24) { // 24 hours default
    try {
      const stored = localStorage.getItem(CACHE_PREFIX + key);
      if (!stored) return null;
      
      const { data, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      
      return data;
    } catch (e) {
      return null;
    }
  },

  // Queue operations
  addToQueue(operation) {
    try {
      const queue = this.getQueue();
      queue.push({
        ...operation,
        id: Date.now() + Math.random(),
        timestamp: Date.now()
      });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      
      window.dispatchEvent(new CustomEvent('pending-operations-updated', {
        detail: { count: queue.length }
      }));
    } catch (e) {
      console.error('Failed to add to queue:', e);
    }
  },

  getQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  clearQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('pending-operations-updated', {
      detail: { count: 0 }
    }));
  },

  removeFromQueue(operationId) {
    const queue = this.getQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    
    window.dispatchEvent(new CustomEvent('pending-operations-updated', {
      detail: { count: filtered.length }
    }));
  }
};

// Wrapper for base44 entities with offline support
export function createOfflineEntity(entityName) {
  const original = base44.entities[entityName];

  return {
    ...original,

    async list(...args) {
      try {
        const data = await original.list(...args);
        OfflineStorage.setCache(`${entityName}_list`, data);
        return data;
      } catch (e) {
        if (!navigator.onLine) {
          const cached = OfflineStorage.getCache(`${entityName}_list`);
          if (cached) return cached;
        }
        throw e;
      }
    },

    async filter(query, ...args) {
      try {
        const data = await original.filter(query, ...args);
        OfflineStorage.setCache(`${entityName}_filter_${JSON.stringify(query)}`, data);
        return data;
      } catch (e) {
        if (!navigator.onLine) {
          const cached = OfflineStorage.getCache(`${entityName}_filter_${JSON.stringify(query)}`);
          if (cached) return cached;
        }
        throw e;
      }
    },

    async create(data) {
      if (!navigator.onLine) {
        OfflineStorage.addToQueue({
          entity: entityName,
          operation: 'create',
          data
        });
        toast.info('Saved offline. Will sync when online.');
        return { id: 'offline_' + Date.now(), ...data };
      }
      return original.create(data);
    },

    async update(id, data) {
      if (!navigator.onLine) {
        OfflineStorage.addToQueue({
          entity: entityName,
          operation: 'update',
          id,
          data
        });
        toast.info('Saved offline. Will sync when online.');
        return { id, ...data };
      }
      return original.update(id, data);
    },

    async delete(id) {
      if (!navigator.onLine) {
        OfflineStorage.addToQueue({
          entity: entityName,
          operation: 'delete',
          id
        });
        toast.info('Saved offline. Will sync when online.');
        return { id };
      }
      return original.delete(id);
    }
  };
}

export default function OfflineDataManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncQueue = async () => {
      if (!navigator.onLine) return;

      const queue = OfflineStorage.getQueue();
      if (queue.length === 0) return;

      toast.info(`Syncing ${queue.length} pending changes...`);
      
      let successCount = 0;
      let failCount = 0;

      for (const operation of queue) {
        try {
          const entity = base44.entities[operation.entity];
          
          switch (operation.operation) {
            case 'create':
              await entity.create(operation.data);
              break;
            case 'update':
              await entity.update(operation.id, operation.data);
              break;
            case 'delete':
              await entity.delete(operation.id);
              break;
          }
          
          OfflineStorage.removeFromQueue(operation.id);
          successCount++;
        } catch (e) {
          console.error('Failed to sync operation:', operation, e);
          failCount++;
          
          // If error is not network-related, remove from queue to prevent infinite retry
          if (e.message && !e.message.includes('network') && !e.message.includes('fetch')) {
            OfflineStorage.removeFromQueue(operation.id);
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} change${successCount !== 1 ? 's' : ''}!`);
        queryClient.invalidateQueries();
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      }

      if (failCount > 0) {
        toast.error(`Failed to sync ${failCount} change${failCount !== 1 ? 's' : ''}`);
      }
    };

    // Sync when coming online
    window.addEventListener('online-sync', syncQueue);

    // Try to sync on mount if online
    if (navigator.onLine) {
      syncQueue();
    }

    // Periodic sync every 5 minutes when online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncQueue();
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online-sync', syncQueue);
      clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}