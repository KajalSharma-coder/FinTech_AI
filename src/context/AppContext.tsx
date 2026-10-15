import { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Investigation, Advertisement, EvidenceRecord, Alert, AlertStatus } from '../types';
import { advertisements } from '../data/advertisements';
import { seedInvestigations } from '../data/investigations';
import {
  loadInvestigationsState, saveInvestigations, loadAdStatuses, saveAdStatus,
  loadImportedAdvertisementsState, saveImportedAdvertisements,
  loadEvidenceState, saveEvidence,
  loadAlertsState, saveAlerts,
} from '../lib/storage';
import { findRelatedAdvertisements } from '../lib/relatedAds';
import { generateAlerts, reconcileAlerts } from '../lib/alerts';
import { loadBackendWorkspaceSnapshot, saveBackendWorkspace, type BackendWorkspace } from '../lib/backend';

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState {
  advertisements: Advertisement[];
  importedAdvertisements: Advertisement[];
  investigations: Investigation[];
  evidence: EvidenceRecord[];
  alerts: Alert[];
}

type Action =
  | { type: 'SET_INVESTIGATIONS'; payload: Investigation[] }
  | { type: 'HYDRATE_BACKEND'; payload: BackendWorkspace }
  | { type: 'ADD_INVESTIGATION'; payload: Investigation }
  | { type: 'UPDATE_INVESTIGATION'; payload: Investigation }
  | { type: 'DELETE_INVESTIGATION'; payload: string }
  | { type: 'ADD_IMPORTED_ADVERTISEMENTS'; payload: Advertisement[] }
  | { type: 'UPDATE_AD_STATUS'; payload: { id: string; status: Advertisement['status'] } }
  | { type: 'ADD_EVIDENCE'; payload: EvidenceRecord }
  | { type: 'UPDATE_EVIDENCE'; payload: EvidenceRecord }
  | { type: 'SYNC_ALERTS'; payload: Alert[] }
  | { type: 'UPDATE_ALERT'; payload: Alert };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE_BACKEND': {
      const statuses = action.payload.advertisementStatuses;
      const importedAdvertisements = action.payload.importedAdvertisements.map(ad => ({ ...ad, status: statuses[ad.id] ?? ad.status }));
      const allAdvertisements = [...advertisements, ...importedAdvertisements].map(ad => ({ ...ad, status: statuses[ad.id] ?? ad.status }));
      return { ...state, advertisements: allAdvertisements, importedAdvertisements, investigations: action.payload.investigations, evidence: action.payload.evidence, alerts: action.payload.alerts };
    }
    case 'SET_INVESTIGATIONS':
      return { ...state, investigations: action.payload };
    case 'ADD_INVESTIGATION':
      return { ...state, investigations: [action.payload, ...state.investigations] };
    case 'UPDATE_INVESTIGATION':
      return {
        ...state,
        investigations: state.investigations.map(i =>
          i.id === action.payload.id ? action.payload : i
        ),
      };
    case 'DELETE_INVESTIGATION':
      return {
        ...state,
        investigations: state.investigations.filter(i => i.id !== action.payload),
      };
    case 'ADD_IMPORTED_ADVERTISEMENTS':
      return {
        ...state,
        importedAdvertisements: [...state.importedAdvertisements, ...action.payload],
        advertisements: [...state.advertisements, ...action.payload],
      };
    case 'UPDATE_AD_STATUS':
      return {
        ...state,
        importedAdvertisements: state.importedAdvertisements.map(a =>
          a.id === action.payload.id ? { ...a, status: action.payload.status } : a
        ),
        advertisements: state.advertisements.map(a =>
          a.id === action.payload.id ? { ...a, status: action.payload.status } : a
        ),
      };
    case 'ADD_EVIDENCE':
      return { ...state, evidence: state.evidence.some(record => record.id === action.payload.id) ? state.evidence : [action.payload, ...state.evidence] };
    case 'UPDATE_EVIDENCE':
      return { ...state, evidence: state.evidence.map(record => record.id === action.payload.id ? action.payload : record) };
    case 'SYNC_ALERTS':
      return { ...state, alerts: action.payload };
    case 'UPDATE_ALERT':
      return { ...state, alerts: state.alerts.map(alert => alert.id === action.payload.id ? action.payload : alert) };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  backendLive: boolean;
  lastSyncedAt: string | null;
  refreshWorkspace: () => Promise<void>;
  addInvestigation: (inv: Investigation) => void;
  updateInvestigation: (inv: Investigation) => void;
  deleteInvestigation: (id: string) => void;
  addImportedAdvertisements: (ads: Advertisement[]) => void;
  updateAdStatus: (id: string, status: Advertisement['status']) => void;
  addEvidence: (record: EvidenceRecord) => void;
  updateEvidence: (record: EvidenceRecord) => void;
  updateAlertStatus: (id: string, status: AlertStatus) => void;
  linkAlertToInvestigation: (id: string, investigationId?: string) => void;
  markAlertRead: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(() => {
    const stored = loadInvestigationsState();
    const imported = loadImportedAdvertisementsState();
    const evidence = loadEvidenceState();
    const storedAlerts = loadAlertsState();
    const savedStatuses = loadAdStatuses();
    const importedAdvertisements = imported.kind === 'malformed'
      ? []
      : imported.advertisements.map(ad => ({ ...ad, status: savedStatuses[ad.id] ?? ad.status }));
    const allAdvertisements = [...advertisements, ...importedAdvertisements];
    const generatedAlerts = generateAlerts(allAdvertisements, evidence.kind === 'malformed' ? [] : evidence.records, findRelatedAdvertisements(allAdvertisements), stored.kind === 'missing' ? seedInvestigations : stored.investigations);
    return {
      advertisements: allAdvertisements.map(ad => ({
        ...ad,
        status: savedStatuses[ad.id] ?? ad.status,
      })),
      importedAdvertisements,
      investigations: stored.kind === 'missing' ? seedInvestigations : stored.investigations,
      canPersistInvestigations: stored.kind !== 'malformed',
      canPersistImportedAdvertisements: imported.kind !== 'malformed',
      evidence: evidence.kind === 'malformed' ? [] : evidence.records,
      canPersistEvidence: evidence.kind !== 'malformed',
      alerts: reconcileAlerts(generatedAlerts, storedAlerts.kind === 'malformed' ? [] : storedAlerts.alerts),
      canPersistAlerts: storedAlerts.kind !== 'malformed',
    };
  });
  const canPersistInvestigations = useRef(initialState.canPersistInvestigations);
  const canPersistImportedAdvertisements = useRef(initialState.canPersistImportedAdvertisements);
  const canPersistEvidence = useRef(initialState.canPersistEvidence);
  const canPersistAlerts = useRef(initialState.canPersistAlerts);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [backendReady, setBackendReady] = useState(false);
  const [backendLive, setBackendLive] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const backendUpdatedAt = useRef<string | null>(null);
  const backendSyncQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await loadBackendWorkspaceSnapshot();
        if (cancelled) return;
        backendUpdatedAt.current = snapshot.updatedAt;
        setLastSyncedAt(snapshot.updatedAt);
        setBackendLive(true);
        if (snapshot.state) {
          dispatch({ type: 'HYDRATE_BACKEND', payload: snapshot.state });
        } else {
          const statuses = Object.fromEntries(state.advertisements.map(ad => [ad.id, ad.status]));
          await saveBackendWorkspace({ importedAdvertisements: state.importedAdvertisements, investigations: state.investigations, evidence: state.evidence, alerts: state.alerts, advertisementStatuses: statuses });
        }
      } catch (error) {
        setBackendLive(false);
        console.warn('TRACE//FIN backend unavailable; using browser-local persistence for this session.', error);
      } finally {
        if (!cancelled) setBackendReady(true);
      }
    })();
    return () => { cancelled = true; };
    // Initial state is intentionally captured once for backend bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!backendReady) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const snapshot = await loadBackendWorkspaceSnapshot();
        if (cancelled) return;
        setBackendLive(true);
        if (snapshot.updatedAt && snapshot.updatedAt !== backendUpdatedAt.current && snapshot.state) {
          backendUpdatedAt.current = snapshot.updatedAt;
          setLastSyncedAt(snapshot.updatedAt);
          dispatch({ type: 'HYDRATE_BACKEND', payload: snapshot.state });
        }
      } catch {
        if (!cancelled) setBackendLive(false);
      }
    };
    const interval = window.setInterval(poll, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [backendReady]);

  useEffect(() => {
    if (canPersistInvestigations.current) saveInvestigations(state.investigations);
  }, [state.investigations]);

  useEffect(() => {
    if (canPersistImportedAdvertisements.current) saveImportedAdvertisements(state.importedAdvertisements);
  }, [state.importedAdvertisements]);

  useEffect(() => {
    if (canPersistEvidence.current) saveEvidence(state.evidence);
  }, [state.evidence]);

  useEffect(() => {
    const generated = generateAlerts(state.advertisements, state.evidence, findRelatedAdvertisements(state.advertisements), state.investigations);
    const reconciled = reconcileAlerts(generated, state.alerts);
    if (JSON.stringify(reconciled) !== JSON.stringify(state.alerts)) dispatch({ type: 'SYNC_ALERTS', payload: reconciled });
  }, [state.advertisements, state.evidence, state.investigations, state.alerts]);

  useEffect(() => {
    if (canPersistAlerts.current) saveAlerts(state.alerts);
  }, [state.alerts]);

  useEffect(() => {
    if (!backendReady) return;
    const advertisementStatuses = Object.fromEntries(state.advertisements.map(ad => [ad.id, ad.status]));
    const snapshot: BackendWorkspace = { importedAdvertisements: state.importedAdvertisements, investigations: state.investigations, evidence: state.evidence, alerts: state.alerts, advertisementStatuses };
    backendSyncQueue.current = backendSyncQueue.current
      .catch(() => undefined)
      .then(() => saveBackendWorkspace(snapshot))
      .then(updatedAt => {
        if (updatedAt) {
          backendUpdatedAt.current = updatedAt;
          setLastSyncedAt(updatedAt);
          setBackendLive(true);
        }
      })
      .catch(error => console.warn('TRACE//FIN could not sync workspace to backend.', error));
  }, [backendReady, state.advertisements, state.importedAdvertisements, state.investigations, state.evidence, state.alerts]);

  async function refreshWorkspace() {
    try {
      const snapshot = await loadBackendWorkspaceSnapshot();
      setBackendLive(true);
      if (snapshot.updatedAt && snapshot.updatedAt !== backendUpdatedAt.current && snapshot.state) {
        backendUpdatedAt.current = snapshot.updatedAt;
        setLastSyncedAt(snapshot.updatedAt);
        dispatch({ type: 'HYDRATE_BACKEND', payload: snapshot.state });
      }
    } catch {
      setBackendLive(false);
    }
  }

  function addInvestigation(inv: Investigation) {
    canPersistInvestigations.current = true;
    dispatch({ type: 'ADD_INVESTIGATION', payload: inv });
  }
  function updateInvestigation(inv: Investigation) {
    canPersistInvestigations.current = true;
    dispatch({ type: 'UPDATE_INVESTIGATION', payload: inv });
  }
  function deleteInvestigation(id: string) {
    canPersistInvestigations.current = true;
    dispatch({ type: 'DELETE_INVESTIGATION', payload: id });
  }
  function addImportedAdvertisements(ads: Advertisement[]) {
    canPersistImportedAdvertisements.current = true;
    dispatch({ type: 'ADD_IMPORTED_ADVERTISEMENTS', payload: ads });
  }
  function updateAdStatus(id: string, status: Advertisement['status']) {
    saveAdStatus(id, status);
    dispatch({ type: 'UPDATE_AD_STATUS', payload: { id, status } });
  }

  function addEvidence(record: EvidenceRecord) {
    canPersistEvidence.current = true;
    dispatch({ type: 'ADD_EVIDENCE', payload: record });
  }

  function updateEvidence(record: EvidenceRecord) {
    canPersistEvidence.current = true;
    dispatch({ type: 'UPDATE_EVIDENCE', payload: record });
  }

  function updateAlertStatus(id: string, status: AlertStatus) {
    const alert = state.alerts.find(item => item.id === id);
    if (!alert) return;
    const now = new Date().toISOString();
    dispatch({ type: 'UPDATE_ALERT', payload: { ...alert, status, read: true, auditHistory: [...alert.auditHistory, { action: status === 'new' ? 'updated' : status, timestamp: now, actor: 'A. Reyes', note: `Alert marked ${status}.` }] } });
    canPersistAlerts.current = true;
  }

  function linkAlertToInvestigation(id: string, investigationId?: string) {
    const alert = state.alerts.find(item => item.id === id);
    if (!alert) return;
    const now = new Date().toISOString();
    const action = investigationId ? 'linked' : 'unlinked';
    dispatch({ type: 'UPDATE_ALERT', payload: { ...alert, investigationId, status: investigationId && (alert.status === 'new' || alert.status === 'acknowledged') ? 'investigating' : alert.status, read: true, auditHistory: [...alert.auditHistory, { action, timestamp: now, actor: 'A. Reyes', note: investigationId ? `Linked to ${investigationId}.` : 'Investigation link removed.' }] } });
    canPersistAlerts.current = true;
  }

  function markAlertRead(id: string) {
    const alert = state.alerts.find(item => item.id === id);
    if (!alert || alert.read) return;
    canPersistAlerts.current = true;
    dispatch({ type: 'UPDATE_ALERT', payload: { ...alert, read: true } });
  }

  return (
    <AppContext.Provider value={{ state, backendLive, lastSyncedAt, refreshWorkspace, addInvestigation, updateInvestigation, deleteInvestigation, addImportedAdvertisements, updateAdStatus, addEvidence, updateEvidence, updateAlertStatus, linkAlertToInvestigation, markAlertRead }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
