import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, INITIAL_STATE } from '../types';
import * as FirebaseService from './firebase';

const STORAGE_KEY = 'family_wealth_tracker_v1';

// Recursively strip undefined values (Firebase rejects them)
const deepCleanUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(deepCleanUndefined);
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) clean[k] = deepCleanUndefined(v);
    }
    return clean;
  }
  return obj;
};

// Helper to ensure we don't have undefined arrays
const sanitizeState = (data: any): AppState => {
  if (!data) return INITIAL_STATE;
  // Ensure milestones have trackingMode (backward compatibility)
  const milestones = (data.milestones || INITIAL_STATE.milestones).map((m: any) => ({
    ...m,
    trackingMode: m.trackingMode || 'net_worth',
  }));
  // Ensure assets have valuationMode (backward compatibility)
  const assets = (data.assets || []).map((a: any) => ({
    ...a,
    valuationMode: a.valuationMode || 'manual',
  }));
  return {
    ...INITIAL_STATE,
    ...data,
    assets,
    liabilities: data.liabilities || [],
    snapshots: data.snapshots || [],
    milestones,
    lastUpdated: data.lastUpdated || 0
  };
};

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

export const useStore = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      return local ? sanitizeState(JSON.parse(local)) : INITIAL_STATE;
    } catch {
      return INITIAL_STATE;
    }
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isSynced, setIsSynced] = useState(false);

  // Refs
  const stateRef = useRef(state);
  const syncTimeoutRef = useRef<any>(null);

  // Keep Ref updated and persist to local storage
  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Firebase Subscription Logic
  useEffect(() => {
    const setupSync = async () => {
      if (state.familyId) {
        // Ensure Firebase is ready
        if (!FirebaseService.isFirebaseInitialized()) {
          FirebaseService.initFirebase();
          try { await FirebaseService.authenticateAnonymously(); } catch (e) { console.warn("Auto-auth failed", e); }
        }

        if (FirebaseService.isFirebaseInitialized()) {
          setIsSynced(true);
          console.log(`[Sync] Subscribing to ${state.familyId}`);

          const unsub = FirebaseService.subscribeToFamilyData(state.familyId, (remoteData) => {
            const currentState = stateRef.current;

            if (!remoteData) return;

            const isFreshJoin = currentState.lastUpdated === 0;
            const isRemoteNewer = (remoteData.lastUpdated || 0) > (currentState.lastUpdated || 0);

            if (isFreshJoin || isRemoteNewer) {
              console.log(`[Sync] Incoming Data. Fresh: ${isFreshJoin}, Newer: ${isRemoteNewer}`);
              setState(prev => {
                return sanitizeState(remoteData);
              });
              setSyncStatus('saved');
            }
          });
          return unsub;
        }
      } else {
        setIsSynced(false);
        setSyncStatus('idle');
      }
    };

    const unsubPromise = setupSync();
    return () => { unsubPromise.then(unsub => unsub && unsub()); };
  }, [state.familyId]);

  // Update State Function
  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => {
      const isFamilyIdChange = updates.familyId !== undefined && updates.familyId !== prev.familyId;

      let newState = { ...prev, ...updates };

      // Handle Timestamp Logic
      if (isFamilyIdChange) {
        const explicitTimestamp = updates.lastUpdated;
        newState.lastUpdated = explicitTimestamp !== undefined ? explicitTimestamp : 0;
      } else {
        newState.lastUpdated = Date.now();
      }

      // SYNC TRIGGER
      if (newState.familyId && newState.lastUpdated > 0 && FirebaseService.isFirebaseInitialized()) {
        setSyncStatus('syncing');

        // Clear existing debounce timer
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        // Debounce sync
        syncTimeoutRef.current = setTimeout(() => {
          // Optimistic UI: We assume it saves successfully.
          // We use a race condition: If Firebase ACK takes too long, we show Saved anyway (offline support).

          const syncPromise = FirebaseService.syncFamilyData(newState.familyId!, deepCleanUndefined(newState));
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000)); // 2s max wait for UI

          Promise.race([syncPromise, timeoutPromise])
            .then(() => {
              setSyncStatus('saved');
            })
            .catch((err) => {
              console.error("Sync failed", err);
              setSyncStatus('error');
            });

          // Ensure the actual sync completes in background even if UI moved on
          syncPromise.catch(e => {
            console.error("Background sync error", e);
            setSyncStatus('error');
          });

        }, 1000);
      }

      return newState;
    });
  }, []);

  // Force Pull
  const forcePull = useCallback(() => {
    if (state.familyId) {
      console.log("[Sync] Force Pull Initiated");
      setState(prev => ({ ...prev, lastUpdated: 0 }));
    }
  }, [state.familyId]);

  // Auto-Snapshot: log once per day on visit (only if there's data worth snapshotting)
  const [autoSnapshotTaken, setAutoSnapshotTaken] = useState(false);
  const autoSnapshotDone = useRef(false);

  useEffect(() => {
    if (autoSnapshotDone.current) return;
    autoSnapshotDone.current = true;

    const currentState = stateRef.current;

    // Only auto-snapshot if user has added at least one asset
    if (currentState.assets.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const alreadyLogged = currentState.snapshots.some(s => s.date === today);
    if (alreadyLogged) return;

    const netWorth = currentState.assets.reduce((a, b) => a + b.value, 0)
      - currentState.liabilities.reduce((a, b) => a + b.value, 0);

    const snapshot = {
      id: crypto.randomUUID(),
      date: today,
      netWorth,
      isManual: false,
      note: 'Auto-captured on visit'
    };

    const updatedSnapshots = [...currentState.snapshots, snapshot]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Use a small delay so the UI has time to render first
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        snapshots: updatedSnapshots,
        lastUpdated: Date.now()
      }));
      setAutoSnapshotTaken(true);
      console.log(`[Auto-Snapshot] Logged net worth: ${netWorth} for ${today}`);
    }, 1500);
  }, []);

  return { state, updateState, isSynced, syncStatus, forcePull, autoSnapshotTaken };
};