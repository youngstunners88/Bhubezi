import { useState, useEffect, useCallback } from 'react';
import type { OfflineData } from '../types';

export interface QueuedAction {
  id: string;
  type: 'ping' | 'message' | 'status' | 'trip';
  data: unknown;
  timestamp: number;
}

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('bhubezi_offline_queue');
    if (stored) {
      try {
        setPendingActions(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  const saveOfflineData = useCallback((data: OfflineData) => {
    try {
      localStorage.setItem('bhubezi_offline_data', JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save offline data:', e);
      return false;
    }
  }, []);

  const loadOfflineData = useCallback((): OfflineData | null => {
    try {
      const stored = localStorage.getItem('bhubezi_offline_data');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load offline data:', e);
    }
    return null;
  }, []);

  const queueAction = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now()
    };
    
    setPendingActions(prev => {
      const updated = [...prev, newAction];
      localStorage.setItem('bhubezi_offline_queue', JSON.stringify(updated));
      return updated;
    });
    
    return newAction.id;
  }, []);

  const removeQueuedAction = useCallback((actionId: string) => {
    setPendingActions(prev => {
      const updated = prev.filter(a => a.id !== actionId);
      localStorage.setItem('bhubezi_offline_queue', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearQueue = useCallback(() => {
    localStorage.removeItem('bhubezi_offline_queue');
    setPendingActions([]);
  }, []);

  const syncPendingActions = useCallback(async (syncHandler: (action: QueuedAction) => Promise<boolean>) => {
    if (!isOnline || pendingActions.length === 0) return;

    const successful: string[] = [];
    
    for (const action of pendingActions) {
      try {
        const success = await syncHandler(action);
        if (success) {
          successful.push(action.id);
        }
      } catch (e) {
        console.error('Failed to sync action:', action.id, e);
      }
    }

    setPendingActions(prev => {
      const updated = prev.filter(a => !successful.includes(a.id));
      localStorage.setItem('bhubezi_offline_queue', JSON.stringify(updated));
      return updated;
    });

    return successful.length;
  }, [isOnline, pendingActions]);

  const canWorkOffline = useCallback((): boolean => {
    const data = loadOfflineData();
    return data !== null && data.ranks.length > 0;
  }, [loadOfflineData]);

  return {
    isOnline,
    pendingActions,
    pendingCount: pendingActions.length,
    saveOfflineData,
    loadOfflineData,
    queueAction,
    removeQueuedAction,
    clearQueue,
    syncPendingActions,
    canWorkOffline
  };
}

export default useOfflineStorage;
