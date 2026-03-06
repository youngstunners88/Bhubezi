import { useState, useEffect, useCallback } from 'react';
import type { OfflineData } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * useOfflineStorage Hook
 * 
 * A React hook for managing offline data persistence and action queuing.
 * Enables the app to function during network outages by storing data locally
 * and syncing when connectivity is restored.
 * 
 * Offline Queue System:
 * - Actions (ping, message, status, trip) are queued when offline
 * - Queue persists in localStorage with unique IDs
 * - Automatic sync attempts when connection is restored
 * - Failed actions remain in queue for retry
 * 
 * Sync Mechanism:
 * - Listens for browser online/offline events
 * - Manual sync via syncPendingActions() with custom handler
 * - Successfully synced actions are removed from queue
 * - Failed actions persist for future retry attempts
 * 
 * @security WARNING: localStorage is NOT encrypted.
 * Do NOT store sensitive user data (passwords, IDs, financial info) in offline storage.
 * This is suitable for cached app data and non-sensitive queue items only.
 * 
 * @returns {Object} Offline storage state and control methods
 * @returns {boolean} isOnline - Current network connectivity status
 * @returns {QueuedAction[]} pendingActions - Array of queued actions awaiting sync
 * @returns {number} pendingCount - Count of pending actions
 * @returns {Function} saveOfflineData - Save data for offline access
 * @returns {Function} loadOfflineData - Retrieve cached offline data
 * @returns {Function} queueAction - Add an action to the sync queue
 * @returns {Function} removeQueuedAction - Remove a specific action from queue
 * @returns {Function} clearQueue - Remove all pending actions
 * @returns {Function} syncPendingActions - Process queue with sync handler
 * @returns {Function} canWorkOffline - Check if offline data is available
 * 
 * @example
 * const { isOnline, queueAction, syncPendingActions, pendingCount } = useOfflineStorage();
 * 
 * // Queue an action when offline
 * if (!isOnline) {
 *   queueAction({ type: 'message', data: { text: 'Hello' } });
 * }
 * 
 * // Sync when back online
 * const syncedCount = await syncPendingActions(async (action) => {
 *   // Send to server
 *   return await api.send(action);
 * });
 */

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
        // SECURITY FIX: Clear corrupted data to prevent persistent errors
        console.error('Failed to parse offline queue:', e);
        localStorage.removeItem('bhubezi_offline_queue');
        setPendingActions([]);
      }
    }
  }, []);

  const saveOfflineData = useCallback((data: OfflineData) => {
    try {
      localStorage.setItem('bhubezi_offline_data', JSON.stringify(data));
      return true;
    } catch (e) {
      // Error saving offline data - silently fail
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
      // SECURITY FIX: Clear corrupted data to prevent persistent errors
      console.error('Failed to load offline data:', e);
      localStorage.removeItem('bhubezi_offline_data');
    }
    return null;
  }, []);

  const queueAction = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${uuidv4().slice(0, 5)}`, // SECURITY FIX: Using uuid instead of Math.random()
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
        // Error syncing action - silently continue
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
