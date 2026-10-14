import { useState } from 'react';
import {
  FolderPlus, FolderOpen, Search, Trash2, CheckCircle,
  AlertTriangle, Clock, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '../components/layout/AppShell';
import Modal from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import {
  statusBadgeClass, statusLabel, riskBadgeClass, generateId,
  formatDate, truncate,
} from '../lib/utils';
import type { Investigation, RiskLevel } from '../types';

const PRIORITY_OPTIONS: RiskLevel[] = ['critical', 'high', 'medium', 'low'];

function InvestigationCard({
  inv,
  onOpen,
  onDelete,
}: {
  inv: Investigation;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article
      className="investigation-card cursor-pointer group"
      onClick={() => onOpen(inv.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`status-badge ${statusBadgeClass(inv.status)}`}>{statusLabel(inv.status)}</span>
            <span className={`badge ${riskBadgeClass(inv.priority)} text-[10px]`}>{inv.priority}</span>
          </div>
          <h3 className="font-display text-lg font-semibold text-navy leading-snug">{truncate(inv.title, 70)}</h3>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete(inv.id); }}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-critical-bg hover:text-critical text-muted transition-all"
          aria-label="Delete investigation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mb-3">
        <span className="font-mono text-[11px]">{inv.id}</span>
        <span>{inv.analyst}</span>
        <span>Updated {formatDate(inv.updatedAt)}</span>
        <span>{inv.linkedAdIds.length} linked ad{inv.linkedAdIds.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Notes preview */}
      {inv.notes && (
        <p className="text-xs text-navy-3 leading-relaxed bg-surface-2 rounded-lg p-2.5 mb-3"
           style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {inv.notes}
        </p>
      )}

      {/* Tags */}
      {inv.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {inv.tags.map(tag => <span key={tag} className="chip">{tag}</span>)}
        </div>
      )}

      <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
        <button type="button" onClick={() => onOpen(inv.id)} className="btn-ghost text-xs text-accent px-0 py-1 focus-visible:ring-2 focus-visible:ring-accent/30">
          View details <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </article>
  );
}

interface DetailModalProps {
  inv: Investigation;
  ads: ReturnType<typeof useApp>['state']['advertisements'];
  onClose: () => void;
  onUpdate: (inv: Investigation) => void;
  onNavigateToAd: (id: string) => void;
}

function InvestigationDetailModal({ inv, ads, onClose, onUpdate }: DetailModalProps) {
  const [notes, setNotes] = useState(inv.notes);
  const [status, setStatus] = useState(inv.status);
  const [isDirty, setIsDirty] = useState(false);

  function handleSave() {
    onUpdate({ ...inv, notes, status, updatedAt: new Date().toISOString() });
    setIsDirty(false);
    toast.success('Investigation updated');
  }

  const linkedAds = ads.filter(a => inv.linkedAdIds.includes(a.id));

  return (
    <Modal open onClose={onClose} title={inv.title} size="xl">
      <div className="p-6 space-y-5">
        {/* Meta row */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className={`badge ${riskBadgeClass(inv.priority)}`}>{inv.priority} priority</span>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted">Status:</label>
            <select
              className="select text-xs py-1"
              value={status}
              onChange={e => { setStatus(e.target.value as Investigation['status']); setIsDirty(true); }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <span className="text-xs text-muted">{inv.id} · Analyst: {inv.analyst}</span>
        </div>

        {/* Linked ads */}
        {linkedAds.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Linked Advertisements ({linkedAds.length})
            </p>
            <div className="space-y-2">
              {linkedAds.map(ad => (
                <div key={ad.id} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-navy">{ad.id}</span>
                    <span className="text-muted ml-2">{truncate(ad.title, 50)}</span>
                  </div>
                  <span className={`badge ${riskBadgeClass(ad.riskLevel)}`}>{ad.riskScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Analyst Notes</p>
          <textarea
            className="textarea h-36 font-mono text-xs"
            value={notes}
            onChange={e => { setNotes(e.target.value); setIsDirty(true); }}
            placeholder="Add investigation notes here…"
          />
        </div>

        {/* Tags */}
        {inv.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {inv.tags.map(tag => <span key={tag} className="chip">{tag}</span>)}
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
            disabled={!isDirty}
          >
            <CheckCircle className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Investigations() {
  const { state, addInvestigation, updateInvestigation, deleteInvestigation } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [newModal, setNewModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // New investigation form
  const [form, setForm] = useState({
    title: '',
    priority: 'high' as RiskLevel,
    analyst: 'A. Reyes',
    notes: '',
    tags: '',
  });

  const investigations = state.investigations;
  const ads = state.advertisements;

  const filtered = investigations.filter(inv => {
    if (search && !inv.title.toLowerCase().includes(search.toLowerCase()) &&
        !inv.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && inv.status !== filterStatus) return false;
    if (filterPriority && inv.priority !== filterPriority) return false;
    return true;
  });

  const openCount = investigations.filter(i => i.status === 'open').length;
  const inProgCount = investigations.filter(i => i.status === 'in_progress').length;
  const closedCount = investigations.filter(i => i.status === 'closed').length;

  function handleCreate() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const inv: Investigation = {
      id: generateId(),
      title: form.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open',
      priority: form.priority,
      linkedAdIds: [],
      notes: form.notes,
      analyst: form.analyst,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    addInvestigation(inv);
    toast.success('Investigation created');
    setNewModal(false);
    setForm({ title: '', priority: 'high', analyst: 'A. Reyes', notes: '', tags: '' });
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this investigation?')) {
      deleteInvestigation(id);
      toast.success('Investigation deleted');
    }
  }

  const selected = investigations.find(i => i.id === detailId) ?? null;

  return (
    <AppShell title="Investigations" subtitle={`${investigations.length} total investigations`}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Open', count: openCount, icon: AlertTriangle, color: 'text-high bg-high-bg' },
          { label: 'In Progress', count: inProgCount, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Closed', count: closedCount, icon: CheckCircle, color: 'text-low bg-low-bg' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-black text-navy">{count}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-48 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search investigations…"
            className="flex-1 bg-transparent text-sm text-navy placeholder:text-muted-2 focus:outline-none"
          />
        </div>
        <select className="select text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
        <select className="select text-sm" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <button type="button" onClick={() => setNewModal(true)} className="btn-primary">
          <FolderPlus className="w-4 h-4" /> New Investigation
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FolderOpen className="w-10 h-10 text-muted-2 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted">No investigations found</p>
          <p className="text-xs text-muted-2 mt-1">Create one from the Advertisements page or use the button above.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(inv => (
            <InvestigationCard
              key={inv.id}
              inv={inv}
              onOpen={setDetailId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* New Investigation Modal */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="New Investigation" size="md">
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted block mb-1.5">Title *</label>
            <input
              type="text"
              className="input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Telegram Bank Account Marketplace — Channel XYZ"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">Priority</label>
              <select className="select w-full text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as RiskLevel }))}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">Analyst</label>
              <input type="text" className="input text-sm" value={form.analyst} onChange={e => setForm(f => ({ ...f, analyst: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted block mb-1.5">Initial Notes</label>
            <textarea className="textarea h-24" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Initial findings…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted block mb-1.5">Tags (comma-separated)</label>
            <input type="text" className="input text-sm" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. Telegram, Philippines, bank account" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setNewModal(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleCreate} className="btn-primary">
              <FolderPlus className="w-4 h-4" /> Create
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <InvestigationDetailModal
          inv={selected}
          ads={ads}
          onClose={() => setDetailId(null)}
          onUpdate={inv => { updateInvestigation(inv); setDetailId(null); }}
          onNavigateToAd={() => {}}
        />
      )}
    </AppShell>
  );
}
