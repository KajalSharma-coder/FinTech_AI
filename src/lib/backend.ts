import type { Advertisement, Alert, EvidenceRecord, Investigation } from '../types';

export interface BackendWorkspace {
  importedAdvertisements: Advertisement[];
  investigations: Investigation[];
  evidence: EvidenceRecord[];
  alerts: Alert[];
  advertisementStatuses: Record<string, Advertisement['status']>;
}

export interface BackendWorkspaceSnapshot {
  state: BackendWorkspace | null;
  updatedAt: string | null;
}

export function isBackendWorkspace(value: unknown): value is BackendWorkspace {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const workspace = value as Record<string, unknown>;
  return Array.isArray(workspace.importedAdvertisements)
    && Array.isArray(workspace.investigations)
    && Array.isArray(workspace.evidence)
    && Array.isArray(workspace.alerts)
    && typeof workspace.advertisementStatuses === 'object'
    && workspace.advertisementStatuses !== null
    && !Array.isArray(workspace.advertisementStatuses);
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function loadBackendWorkspaceSnapshot(): Promise<BackendWorkspaceSnapshot> {
  const response = await fetch(`${API_BASE}/api/state`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Backend load failed (${response.status}).`);
  const payload = await response.json() as BackendWorkspaceSnapshot;
  if (payload.state !== null && !isBackendWorkspace(payload.state)) throw new Error('Backend returned an invalid workspace schema.');
  return payload;
}

export async function loadBackendWorkspace(): Promise<BackendWorkspace | null> {
  return (await loadBackendWorkspaceSnapshot()).state;
}

export async function saveBackendWorkspace(state: BackendWorkspace): Promise<string | null> {
  const response = await fetch(`${API_BASE}/api/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ state }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || `Backend save failed (${response.status}).`);
  }
  const payload = await response.json() as { updatedAt?: string };
  return payload.updatedAt ?? null;
}

export async function checkBackendHealth(): Promise<boolean> {
  try { return (await fetch(`${API_BASE}/api/health`)).ok; } catch { return false; }
}
