import { useMemo, useState } from 'react';
import { Search, ShieldCheck, X, Link2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '../components/layout/AppShell';
import Modal from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { formatDateTime, riskBadgeClass, truncate } from '../lib/utils';
import type { EvidenceRecord, Platform } from '../types';

const PLATFORMS: Platform[] = ['Telegram', 'Facebook', 'Twitter/X', 'Dark Web Forum', 'WhatsApp', 'Reddit', 'Instagram', 'Other'];

function evidenceTypeLabel(type: EvidenceRecord['evidenceType']): string {
  return type === 'image_attachment' ? 'Image attachment' : 'Advertisement snapshot';
}

export default function EvidenceVault() {
  const { state, updateEvidence } = useApp();
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [investigationFilter, setInvestigationFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkInvestigationId, setLinkInvestigationId] = useState('');

  const filtered = useMemo(() => state.evidence.filter(record => {
    const needle = search.trim().toLowerCase();
    if (needle && ![record.id, record.advertisementId, record.investigatorNotes, record.sourceUrl, ...record.matchedIndicators.map(indicator => indicator.matchedValue)].some(value => value.toLowerCase().includes(needle))) return false;
    if (platform && record.platform !== platform) return false;
    if (evidenceType && record.evidenceType !== evidenceType) return false;
    if (investigationFilter === 'unlinked' && record.investigationId) return false;
    if (investigationFilter && investigationFilter !== 'unlinked' && record.investigationId !== investigationFilter) return false;
    return true;
  }), [state.evidence, search, platform, evidenceType, investigationFilter]);

  const selected = state.evidence.find(record => record.id === selectedId) ?? null;
  const selectedAdvertisement = selected ? state.advertisements.find(ad => ad.id === selected.advertisementId) : null;
  const selectedInvestigation = selected?.investigationId ? state.investigations.find(investigation => investigation.id === selected.investigationId) : undefined;

  function saveInvestigationLink() {
    if (!selected) return;
    const nextInvestigationId = linkInvestigationId || undefined;
    const action = nextInvestigationId ? 'linked' : 'unlinked';
    const updated: EvidenceRecord = {
      ...selected,
      ...(nextInvestigationId ? { investigationId: nextInvestigationId } : {}),
      ...(nextInvestigationId ? {} : { investigationId: undefined }),
      history: [...selected.history, { action, timestamp: new Date().toISOString(), actor: 'A. Reyes', note: nextInvestigationId ? `Linked to ${nextInvestigationId}.` : 'Investigation link removed.' }],
    };
    updateEvidence(updated);
    toast.success(nextInvestigationId ? 'Evidence linked to investigation' : 'Investigation link removed');
  }

  function openEvidence(record: EvidenceRecord) {
    setSelectedId(record.id);
    setLinkInvestigationId(record.investigationId ?? '');
  }

  return (
    <AppShell title="Evidence Vault" subtitle={`${filtered.length} of ${state.evidence.length} evidence records`}>
      <div className="content-section mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-56 min-h-11 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="w-4 h-4 text-muted flex-shrink-0" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search evidence, advertisement, or keyword…" className="flex-1 bg-transparent text-sm text-navy focus:outline-none" />
          </div>
          <select className="select text-sm" value={platform} onChange={event => setPlatform(event.target.value)}><option value="">All platforms</option>{PLATFORMS.map(item => <option key={item}>{item}</option>)}</select>
          <select className="select text-sm" value={evidenceType} onChange={event => setEvidenceType(event.target.value)}><option value="">All evidence types</option><option value="advertisement_snapshot">Advertisement snapshot</option><option value="image_attachment">Image attachment</option></select>
          <select className="select text-sm" value={investigationFilter} onChange={event => setInvestigationFilter(event.target.value)}><option value="">All investigations</option><option value="unlinked">Unlinked</option>{state.investigations.map(investigation => <option key={investigation.id} value={investigation.id}>{truncate(investigation.title, 32)}</option>)}</select>
        </div>
        <p className="text-xs text-muted mt-3">Evidence is stored in this browser only. Local audit history is useful for the prototype but is not tamper-proof.</p>
      </div>

      {filtered.length === 0 ? (
        <div className="content-section text-center py-16">
          <ShieldCheck className="w-8 h-8 text-muted-2 mx-auto mb-3" />
          <p className="font-semibold text-navy">No evidence records found</p>
          <p className="text-sm text-muted mt-1">Create evidence from an advertisement analysis to populate the vault.</p>
        </div>
      ) : (
        <div className="content-section overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-b border-border"><th className="th">Evidence</th><th className="th">Advertisement</th><th className="th">Type</th><th className="th">Source</th><th className="th">Investigation</th><th className="th">Created</th></tr></thead>
              <tbody>
                {filtered.map(record => {
                  const ad = state.advertisements.find(item => item.id === record.advertisementId);
                  const investigation = record.investigationId ? state.investigations.find(item => item.id === record.investigationId) : undefined;
                  return <tr key={record.id} className="tr-hover" onClick={() => openEvidence(record)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') openEvidence(record); }}>
                    <td className="td"><p className="font-semibold text-navy text-sm">{record.id}</p><p className="text-[11px] text-muted">{record.matchedIndicators.length} indicators</p></td>
                    <td className="td"><p className="font-semibold text-navy text-sm">{record.advertisementId}</p><p className="text-[11px] text-muted max-w-xs truncate">{ad?.title ?? 'Advertisement no longer available'}</p></td>
                    <td className="td text-xs">{evidenceTypeLabel(record.evidenceType)}</td>
                    <td className="td text-xs">{record.platform}</td>
                    <td className="td text-xs">{investigation ? truncate(investigation.title, 28) : <span className="text-muted">Unlinked{record.investigationId ? ' · missing' : ''}</span>}</td>
                    <td className="td text-xs whitespace-nowrap">{formatDateTime(record.createdAt)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title="Evidence Detail" size="xl">
        {selected && (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">Evidence record</p><h2 className="display-heading mt-1 text-xl">{selected.id}</h2><p className="text-xs text-muted mt-1">Advertisement {selected.advertisementId} · Created {formatDateTime(selected.createdAt)}</p></div>
              <button type="button" onClick={() => setSelectedId(null)} className="btn-ghost p-2" aria-label="Close evidence detail"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="card-sm"><p className="text-xs text-muted">Provenance</p><p className="font-semibold text-navy mt-1">{selected.platform} · {selected.collectionMethod}</p><p className="text-xs text-muted mt-1 break-all">{selected.sourceUrl || 'No source URL recorded'}</p><p className="text-xs text-muted mt-1">Captured {formatDateTime(selected.capturedAt)}</p></div>
              <div className="card-sm"><p className="text-xs text-muted">Risk assessment at creation</p><p className="font-semibold text-navy mt-1">{selectedAdvertisement ? <span className={`badge ${riskBadgeClass(selectedAdvertisement.riskLevel)}`}>{selectedAdvertisement.riskLevel} · {selectedAdvertisement.riskScore}</span> : 'Advertisement unavailable'}</p><p className="text-xs text-muted mt-2">{selected.riskExplanation.length} risk factor(s) recorded</p></div>
            </div>
            {selected.fileHash && <div className="bg-accent-light border border-accent-mid rounded-lg p-3 text-xs text-navy-3 break-all"><p className="font-semibold text-navy">Image identity metadata</p><p>{selected.fileName} · {selected.fileMimeType} · {selected.fileSize} bytes</p><p className="mt-1">SHA-256: {selected.fileHash}</p><p className="mt-1 text-muted">The hash verifies file identity only; it does not prove source authenticity. OCR is unavailable.</p></div>}
            <div><p className="section-title text-sm mb-2">Extracted indicators ({selected.matchedIndicators.length})</p>{selected.matchedIndicators.length === 0 ? <p className="text-sm text-muted">No indicators were captured.</p> : <div className="space-y-2">{selected.matchedIndicators.map(indicator => <div key={indicator.id} className="card-sm"><p className="text-xs font-semibold text-navy capitalize">{indicator.type.replaceAll('_', ' ')} · {indicator.maskedDisplayValue}</p><p className="text-xs text-muted mt-1">{indicator.sourceEvidence}</p></div>)}</div>}</div>
            <div><p className="section-title text-sm mb-2">Investigator notes</p><p className="text-sm text-navy-3 whitespace-pre-wrap">{selected.investigatorNotes || 'No investigator notes added.'}</p></div>
            <div className="flex flex-wrap items-end gap-2 pt-3 border-t border-border"><div className="flex-1 min-w-56"><label className="text-xs font-semibold text-muted block mb-1">Investigation link</label><select className="select text-sm w-full" value={linkInvestigationId} onChange={event => setLinkInvestigationId(event.target.value)}><option value="">Unlinked</option>{state.investigations.map(investigation => <option key={investigation.id} value={investigation.id}>{investigation.title}</option>)}</select></div><button type="button" onClick={saveInvestigationLink} className="btn-primary"><Link2 className="w-4 h-4" /> Save Link</button></div>
            {selectedInvestigation && <p className="text-xs text-muted">Currently linked to: <span className="font-semibold text-navy">{selectedInvestigation.title}</span></p>}
            {!selectedInvestigation && selected.investigationId && <p className="text-xs text-high">The previously linked investigation no longer exists. You can link this evidence to another investigation.</p>}
            <div><p className="section-title text-sm mb-2">Audit history</p><div className="space-y-2">{selected.history.map((entry, index) => <div key={`${entry.timestamp}-${index}`} className="flex gap-3 text-xs"><span className="text-muted whitespace-nowrap">{formatDateTime(entry.timestamp)}</span><span className="font-semibold text-navy capitalize">{entry.action}</span><span className="text-muted">{entry.note ?? ''} · {entry.actor}</span></div>)}</div></div>
            {selectedAdvertisement?.sourceUrl && <a href={selectedAdvertisement.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs px-0"><ExternalLink className="w-3 h-3" /> Open advertisement source</a>}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

