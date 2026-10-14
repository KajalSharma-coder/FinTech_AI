import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowUpDown, ExternalLink, Link2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '../components/layout/AppShell';
import Modal from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { alertStatusLabel } from '../lib/alerts';
import { formatDateTime, generateId, riskBadgeClass, truncate } from '../lib/utils';
import type { Alert as AlertRecord, AlertStatus, AlertType, RiskLevel } from '../types';

const STATUSES: AlertStatus[] = ['new', 'acknowledged', 'investigating', 'resolved', 'dismissed'];
const SEVERITIES: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
const TYPES: AlertType[] = ['high_risk', 'related_pattern', 'new_evidence'];

function alertTypeLabel(type: AlertType) {
  return type === 'high_risk' ? 'High risk' : type === 'related_pattern' ? 'Related pattern' : 'New evidence';
}

function statusClass(status: AlertStatus) {
  return status === 'new' ? 'bg-high-bg text-high border-high-border' : status === 'resolved' ? 'bg-low-bg text-low border-low-border' : status === 'dismissed' ? 'bg-surface-2 text-muted border-border' : 'bg-blue-50 text-blue-700 border-blue-200';
}

export default function Alerts() {
  const { state, updateAlertStatus, linkAlertToInvestigation, addInvestigation, markAlertRead } = useApp();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));
  const [linkInvestigationId, setLinkInvestigationId] = useState('');

  const filtered = useMemo(() => state.alerts.filter(alert => {
    const needle = search.trim().toLowerCase();
    if (needle && ![alert.id, alert.title, alert.summary, ...alert.advertisementIds].some(value => value.toLowerCase().includes(needle))) return false;
    if (severity && alert.severity !== severity) return false;
    if (type && alert.type !== type) return false;
    if (status && alert.status !== status) return false;
    return true;
  }).sort((left, right) => sortNewest ? new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()), [state.alerts, search, severity, type, status, sortNewest]);

  const selected = state.alerts.find(alert => alert.id === selectedId) ?? null;
  const selectedInvestigation = selected?.investigationId ? state.investigations.find(investigation => investigation.id === selected.investigationId) : undefined;

  function openAlert(alert: AlertRecord) {
    setSelectedId(alert.id);
    setLinkInvestigationId(alert.investigationId ?? '');
    markAlertRead(alert.id);
  }

  function updateStatus(nextStatus: AlertStatus) {
    if (!selected) return;
    updateAlertStatus(selected.id, nextStatus);
    toast.success(`Alert marked ${alertStatusLabel(nextStatus).toLowerCase()}`);
  }

  function saveLink() {
    if (!selected) return;
    linkAlertToInvestigation(selected.id, linkInvestigationId || undefined);
    toast.success(linkInvestigationId ? 'Alert linked to investigation' : 'Alert unlinked');
  }

  function createInvestigationFromAlert() {
    if (!selected) return;
    const now = new Date().toISOString();
    const investigationId = generateId();
    addInvestigation({
      id: investigationId,
      title: `Investigation — ${selected.title.slice(0, 50)}`,
      createdAt: now,
      updatedAt: now,
      status: 'open',
      priority: selected.severity,
      linkedAdIds: selected.advertisementIds,
      notes: `Created from alert ${selected.id}.\n\n${selected.summary}`,
      analyst: 'A. Reyes',
      tags: ['alert', selected.type],
    });
    linkAlertToInvestigation(selected.id, investigationId);
    setLinkInvestigationId(investigationId);
    toast.success('Investigation created from alert');
  }

  return (
    <AppShell title="Alerts" subtitle={`${filtered.length} of ${state.alerts.length} local threat alerts`}>
      <div className="content-section mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-56 min-h-11 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"><Search className="w-4 h-4 text-muted" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search alert, advertisement, or ID…" className="flex-1 bg-transparent text-sm text-navy focus:outline-none" /></div>
          <select className="select text-sm" value={severity} onChange={event => setSeverity(event.target.value)}><option value="">All severities</option>{SEVERITIES.map(item => <option key={item}>{item}</option>)}</select>
          <select className="select text-sm" value={type} onChange={event => setType(event.target.value)}><option value="">All types</option>{TYPES.map(item => <option key={item} value={item}>{alertTypeLabel(item)}</option>)}</select>
          <select className="select text-sm" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{STATUSES.map(item => <option key={item} value={item}>{alertStatusLabel(item)}</option>)}</select>
          <button type="button" className="btn-secondary" onClick={() => setSortNewest(value => !value)}><ArrowUpDown className="w-4 h-4" /> {sortNewest ? 'Newest' : 'Oldest'}</button>
        </div>
        <p className="text-xs text-muted mt-3">Alerts are deterministic local analysis outputs. Shared indicators and similarity are leads, not proof of criminal coordination.</p>
      </div>

      {filtered.length === 0 ? <div className="content-section py-16 text-center"><AlertTriangle className="w-8 h-8 text-muted-2 mx-auto mb-3" /><p className="font-semibold text-navy">No alerts match these filters</p><p className="text-sm text-muted mt-1">New alerts are generated from high-risk ads, repeated indicators, related patterns, and evidence records.</p></div> : <div className="content-section overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[780px]"><thead><tr className="border-b border-border"><th className="th">Alert</th><th className="th">Type</th><th className="th">Severity</th><th className="th">Ads</th><th className="th">Status</th><th className="th">Created</th></tr></thead><tbody>{filtered.map(alert => <tr key={alert.id} className={`tr-hover ${!alert.read ? 'bg-accent-light/40' : ''}`} onClick={() => openAlert(alert)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') openAlert(alert); }}><td className="td"><p className="font-semibold text-navy text-sm">{alert.title}</p><p className="text-[11px] text-muted font-mono">{alert.id}</p></td><td className="td text-xs">{alertTypeLabel(alert.type)}</td><td className="td"><span className={`badge ${riskBadgeClass(alert.severity)}`}>{alert.severity}</span></td><td className="td text-xs">{alert.advertisementIds.length}</td><td className="td"><span className={`status-badge ${statusClass(alert.status)}`}>{alertStatusLabel(alert.status)}{!alert.read ? ' · unread' : ''}</span></td><td className="td text-xs whitespace-nowrap">{formatDateTime(alert.createdAt)}</td></tr>)}</tbody></table></div></div>}

      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title="Alert Detail" size="xl">
        {selected && <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{alertTypeLabel(selected.type)}</p><h2 className="display-heading mt-1 text-xl">{selected.title}</h2><p className="text-xs text-muted mt-1">{selected.id} · Created {formatDateTime(selected.createdAt)}</p></div><button type="button" onClick={() => setSelectedId(null)} className="btn-ghost p-2" aria-label="Close alert detail"><X className="w-4 h-4" /></button></div>
          <div className="flex flex-wrap gap-2"><span className={`badge ${riskBadgeClass(selected.severity)}`}>{selected.severity} severity</span><span className={`status-badge ${statusClass(selected.status)}`}>{alertStatusLabel(selected.status)}</span><span className="chip">{selected.advertisementIds.length} affected ad{selected.advertisementIds.length === 1 ? '' : 's'}</span></div>
          <p className="text-sm text-navy-3 leading-relaxed">{selected.summary}</p>
          <div><p className="section-title text-sm mb-2">Affected advertisements</p><div className="space-y-2">{selected.advertisementIds.map(id => { const ad = state.advertisements.find(item => item.id === id); return <div key={id} className="card-sm flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-navy">{id}</p><p className="text-xs text-muted">{ad ? truncate(ad.title, 70) : 'Advertisement no longer available'}</p></div>{ad ? <a href={`/advertisements?id=${id}`} className="btn-ghost text-xs px-0" onClick={event => event.stopPropagation()}>Open <ExternalLink className="w-3 h-3" /></a> : <span className="text-xs text-high">Orphaned reference</span>}</div>; })}</div></div>
          <div><p className="section-title text-sm mb-2">Supporting signals</p><p className="text-xs text-muted">{selected.supportingIndicatorIds.length} indicator reference(s) · {selected.supportingEvidenceIds.length} evidence reference(s)</p><p className="text-xs text-muted mt-1">Automated findings are separate from investigator-confirmed findings. Review the linked advertisement or evidence record before making a determination.</p></div>
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border"><button type="button" className="btn-secondary" onClick={() => updateStatus('acknowledged')}>Acknowledge</button><button type="button" className="btn-primary" onClick={() => updateStatus('investigating')}>Investigate</button><button type="button" className="btn-secondary" onClick={() => updateStatus('resolved')}>Resolve</button><button type="button" className="btn-secondary" onClick={() => updateStatus('dismissed')}>Dismiss</button></div>
          <div className="flex flex-wrap items-end gap-2"><div className="flex-1 min-w-56"><label className="text-xs font-semibold text-muted block mb-1">Linked investigation</label><select className="select text-sm w-full" value={linkInvestigationId} onChange={event => setLinkInvestigationId(event.target.value)}><option value="">Unlinked</option>{state.investigations.map(investigation => <option key={investigation.id} value={investigation.id}>{investigation.title}</option>)}</select></div><button type="button" className="btn-primary" onClick={saveLink}><Link2 className="w-4 h-4" /> Save Link</button><button type="button" className="btn-secondary" onClick={createInvestigationFromAlert}>Create Investigation</button></div>
          {selectedInvestigation && <p className="text-xs text-muted">Currently linked to: <span className="font-semibold text-navy">{selectedInvestigation.title}</span></p>}{!selectedInvestigation && selected.investigationId && <p className="text-xs text-high">The linked investigation is unavailable. The alert is preserved.</p>}
          <div><p className="section-title text-sm mb-2">Audit history</p><div className="space-y-2">{selected.auditHistory.map((entry, index) => <div key={`${entry.timestamp}-${index}`} className="flex flex-wrap gap-2 text-xs"><span className="text-muted">{formatDateTime(entry.timestamp)}</span><span className="font-semibold text-navy capitalize">{entry.action}</span><span className="text-muted">{entry.note ?? ''} · {entry.actor}</span></div>)}</div></div>
        </div>}
      </Modal>
    </AppShell>
  );
}

