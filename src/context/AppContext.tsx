import { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Investigation, Advertisement } from '../types';
import { advertisements } from '../data/advertisements';
import { seedInvestigations } from '../data/investigations';
import { loadInvestigationsState, saveInvestigations, loadAdStatuses, saveAdStatus } from '../lib/storage';

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState {
  advertisements: Advertisement[];
  investigations: Investigation[];
}

type Action =
  | { type: 'SET_INVESTIGATIONS'; payload: Investigation[] }
  | { type: 'ADD_INVESTIGATION'; payload: Investigation }
  | { type: 'UPDATE_INVESTIGATION'; payload: Investigation }
  | { type: 'DELETE_INVESTIGATION'; payload: string }
  | { type: 'UPDATE_AD_STATUS'; payload: { id: string; status: Advertisement['status'] } };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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
    case 'UPDATE_AD_STATUS':
      return {
        ...state,
        advertisements: state.advertisements.map(a =>
          a.id === action.payload.id ? { ...a, status: action.payload.status } : a
        ),
      };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  addInvestigation: (inv: Investigation) => void;
  updateInvestigation: (inv: Investigation) => void;
  deleteInvestigation: (id: string) => void;
  updateAdStatus: (id: string, status: Advertisement['status']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(() => {
    const stored = loadInvestigationsState();
    return {
      advertisements: advertisements.map(ad => ({
        ...ad,
        status: loadAdStatuses()[ad.id] ?? ad.status,
      })),
      investigations: stored.kind === 'missing' ? seedInvestigations : stored.investigations,
      canPersistInvestigations: stored.kind !== 'malformed',
    };
  });
  const canPersistInvestigations = useRef(initialState.canPersistInvestigations);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (canPersistInvestigations.current) saveInvestigations(state.investigations);
  }, [state.investigations]);

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
  function updateAdStatus(id: string, status: Advertisement['status']) {
    saveAdStatus(id, status);
    dispatch({ type: 'UPDATE_AD_STATUS', payload: { id, status } });
  }

  return (
    <AppContext.Provider value={{ state, addInvestigation, updateInvestigation, deleteInvestigation, updateAdStatus }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
