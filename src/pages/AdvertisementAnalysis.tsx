import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Download, X, ExternalLink,
  ChevronUp, ChevronDown, FolderPlus, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '../components/layout/AppShell';
import Modal from '../components/ui/Modal';
import RiskMeter from '../components/ui/RiskMeter';
import RiskBreakdown from '../components/ui/RiskBreakdown';
import { useApp } from '../context/AppContext';
import {
  riskBadgeClass, categoryLabel, statusLabel, statusBadgeClass,
  platformColor, formatDateTime, timeAgo, truncate, generateId, exportToCSV,
} from '../lib/utils';
import type { Advertisement, RiskLevel, AdCategory, Platform } from '../types';

type SortKey = 'detectedAt' | 'riskScore' | 'platform' | 'category';
type SortDir = 'asc' | 'desc';

const RISK_LEVELS: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
const CATEGORIES: AdCategory[] = [
  'bank_account_sale', 'atm_card_rental', 'identity_credential',
  'money_mule_recruitment', 'crypto_wallet', 'payment_account',
];
const PLATFORMS: Platform[] = ['Telegram', 'Facebook', 'Twitter/X', 'Dark Web Forum', 'WhatsApp', 'Reddit', 'Instagram'];
const STATUSES = ['flagged', 'under_review', 'confirmed_threat', 'dismissed'];

// Sort icon as a plain function (not a hook) to avoid rules-of-hooks violation
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-muted-2 opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-accent" />
    : <ChevronDown className="w-3 h-3 text-accent" />;
}

export default function AdvertisementAnalysis() {
  const { state, updateAdStatus, addInvestigation, updateInvestigation } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filterRisk, setFilterRisk] = useState(searchParams.get('risk') ?? '');
  const [filterCat, setFilterCat] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('detectedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Detail panel
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));
  const [addToInvModal, setAddToInvModal] = useState(false);

  const ads = state.advertisements;
  const investigations = state.investigations;

  // Filter + sort
  const filtered = useMemo(() => {
    let result = ads.filter(ad => {
      if (search && !ad.title.toLowerCase().includes(search.toLowerCase()) &&
          !ad.content.toLowerCase().includes(search.toLowerCase()) &&
          !ad.seller.alias.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRisk && ad.riskLevel !== filterRisk) return false;
      if (filterCat && ad.category !== filterCat) return false;
      if (filterPlatform && ad.platform !== filterPlatform) return false;
      if (filterStatus && ad.status !== filterStatus) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'detectedAt') cmp = new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime();
      else if (sortKey === 'riskScore') cmp = a.riskScore - b.riskScore;
      else if (sortKey === 'platform') cmp = a.platform.localeCompare(b.platform);
      else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [ads, search, filterRisk, filterCat, filterPlatform, filterStatus, sortKey, sortDir]);

  const selected = ads.find(a => a.id === selectedId) ?? null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function clearFilters() {
    setSearch(''); setFilterRisk(''); setFilterCat('');
    setFilterPlatform(''); setFilterStatus('');
    setSearchParams({});
  }

  function handleStatusChange(ad: Advertisement, status: Advertisement['status']) {
    updateAdStatus(ad.id, status);
    toast.success(`Status updated to "${statusLabel(status)}"`);
  }

  // FIX: properly link ad to an EXISTING investigation (was creating a new one before)
  function handleLinkToExistingInvestigation(inv: typeof investigations[0]) {
    if (!selected) return;
    if (inv.linkedAdIds.includes(selected.id)) {
      toast.info(`${selected.id} is already linked to this investigation`);
      setAddToInvModal(false);
      return;
    }
    const updated = {
      ...inv,
      linkedAdIds: [...inv.linkedAdIds, selected.id],
      updatedAt: new Date().toISOString(),
    };
    updateInvestigation(updated);
    toast.success(`Linked to "${inv.title.slice(0, 40)}…"`);
    setAddToInvModal(false);
  }

  function handleCreateInvestigation() {
    if (!selected) return;
    const inv = {
      id: generateId(),
      title: `Investigation — ${selected.title.slice(0, 50)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open' as const,
      priority: selected.riskLevel,
      linkedAdIds: [selected.id],
      notes: `Auto-created from advertisement ${selected.id}.\n\n`,
      analyst: 'A. Reyes',
      tags: selected.tags.slice(0, 3),
    };
    addInvestigation(inv);
    toast.success('Investigation created — navigating…');
    setAddToInvModal(false);
    navigate('/investigations');
  }

  function handleExportCSV() {
    const rows = filtered.map(ad => ({
      ID: ad.id,
      Title: ad.title,
      Platform: ad.platform,
      Category: categoryLabel(ad.category),
      'Risk Score': ad.riskScore,
      'Risk Level': ad.riskLevel,
      Status: statusLabel(ad.status),
      Seller: ad.seller.alias,
      'Posted At': ad.postedAt,
      'Detected At': ad.detectedAt,
      'Price Offered': ad.priceOffered ?? '',
      Location: ad.location ?? '',
    }));
    exportToCSV(rows, `tracefin-ads-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${rows.length} records`);
  }

  const hasFilters = search || filterRisk || filterCat || filterPlatform || filterStatus;

  return (
    <AppShell title="Advertisement Analysis" subtitle={`${filtered.length} of ${ads.length} advertisements under review`}>
      {/* Toolbar */}
      <div className="analysis-toolbar">
        <div className="mb-4">
          <p className="eyebrow">Investigation workspace</p>
          <h2 className="display-heading mt-1">Scan the signal</h2>
          <p className="section-subtitle mt-1">Search suspicious listings, inspect the evidence, and record the next action.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 min-h-11 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 shadow-card focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, content, seller…"
            className="flex-1 bg-transparent text-sm text-navy placeholder:text-muted-2 focus:outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-muted hover:text-navy">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          className={`btn-secondary ${showFilters ? 'border-accent text-accent' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {hasFilters && <span className="w-1.5 h-1.5 bg-accent rounded-full" />}
        </button>
        <button type="button" onClick={handleExportCSV} className="btn-secondary">
          <Download className="w-4 h-4" /> Export CSV
        </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="card-sm mb-4 animate-slide-up">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Risk Level</label>
              <select className="select text-sm" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
                <option value="">All</option>
                {RISK_LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Category</label>
              <select className="select text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">All</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Platform</label>
              <select className="select text-sm" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                <option value="">All</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Status</label>
              <select className="select text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All</option>
                {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn-ghost text-xs">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-5">
        {/* Table */}
        <div className={`content-section flex-1 overflow-hidden ${selected ? 'hidden lg:block' : ''}`}>
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="th pl-6">Advertisement</th>
                  <th className="th hidden md:table-cell">
                    <button type="button" onClick={() => toggleSort('platform')} className="flex items-center gap-1 hover:text-navy">
                      Platform <SortIcon col="platform" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="th hidden lg:table-cell">
                    <button type="button" onClick={() => toggleSort('category')} className="flex items-center gap-1 hover:text-navy">
                      Category <SortIcon col="category" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="th">
                    <button type="button" onClick={() => toggleSort('riskScore')} className="flex items-center gap-1 hover:text-navy">
                      Risk <SortIcon col="riskScore" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="th hidden sm:table-cell">Status</th>
                  <th className="th pr-6">
                    <button type="button" onClick={() => toggleSort('detectedAt')} className="flex items-center gap-1 hover:text-navy">
                      Detected <SortIcon col="detectedAt" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="td text-center py-12 text-muted">
                      No advertisements match your filters.
                    </td>
                  </tr>
                )}
                {filtered.map(ad => (
                  <tr
                    key={ad.id}
                    className={`tr-hover ${selectedId === ad.id ? 'bg-accent-light' : ''}`}
                    tabIndex={0}
                    onClick={() => setSelectedId(ad.id === selectedId ? null : ad.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(ad.id === selectedId ? null : ad.id); }}
                  >
                    <td className="td pl-6 max-w-xs">
                      <p className="font-semibold text-navy text-sm leading-snug truncate">{truncate(ad.title, 55)}</p>
                      <p className="text-[11px] text-muted">{ad.seller.alias} · {ad.id}</p>
                    </td>
                    <td className="td hidden md:table-cell">
                      <span className={`status-badge ${platformColor(ad.platform)}`}>{ad.platform}</span>
                    </td>
                    <td className="td hidden lg:table-cell">
                      <span className="chip text-[11px]">{categoryLabel(ad.category)}</span>
                    </td>
                    <td className="td">
                      <span className={`badge ${riskBadgeClass(ad.riskLevel)}`}>{ad.riskScore}</span>
                    </td>
                    <td className="td hidden sm:table-cell">
                      <span className={`status-badge ${statusBadgeClass(ad.status)}`}>{statusLabel(ad.status)}</span>
                    </td>
                    <td className="td pr-6 text-muted text-xs whitespace-nowrap">{timeAgo(ad.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel — FIX: overflow-y-auto so long content scrolls within the panel */}
        {selected && (
          <div className="w-full lg:w-[380px] flex-shrink-0 animate-slide-in-right">
            <div className="detail-panel overflow-y-auto max-h-[calc(100vh-9rem)] sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <span className={`status-badge ${statusBadgeClass(selected.status)} mb-2`}>{statusLabel(selected.status)}</span>
                  <h2 className="text-sm font-bold text-navy mt-1 leading-snug">{selected.title}</h2>
                  <p className="text-xs text-muted mt-0.5">{selected.id} · {selected.seller.alias}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 flex-shrink-0"
                  aria-label="Close detail panel"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {/* Risk meter */}
              <div className="flex items-center gap-6 py-4 border-y border-border mb-4">
                <RiskMeter score={selected.riskScore} level={selected.riskLevel} size={88} />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Platform</span>
                    <span className={`status-badge ${platformColor(selected.platform)}`}>{selected.platform}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Category</span>
                    <span className="font-medium text-navy-3">{categoryLabel(selected.category)}</span>
                  </div>
                  {selected.priceOffered && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Price</span>
                      <span className="font-semibold text-critical">{selected.priceOffered}</span>
                    </div>
                  )}
                  {selected.location && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Location</span>
                      <span className="font-medium text-navy-3">{selected.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ad content */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Advertisement Content</p>
                <p className="text-xs text-navy-3 leading-relaxed bg-surface-2 rounded-lg p-3 font-mono whitespace-pre-wrap break-words">
                  {selected.content}
                </p>
              </div>

              {/* Seller */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Seller Profile</p>
                <div className="bg-surface-2 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted">Alias</span><span className="font-semibold text-navy">{selected.seller.alias}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Total Posts</span><span className="font-medium text-navy-3">{selected.seller.postCount}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted flex-shrink-0">Contact</span><span className="font-mono text-navy-3 text-[11px] text-right break-all">{selected.seller.contactMethod}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Detected</span><span className="text-navy-3">{formatDateTime(selected.detectedAt)}</span></div>
                </div>
              </div>

              {/* Risk breakdown */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Risk Factor Breakdown</p>
                <RiskBreakdown reasons={selected.riskReasons} />
              </div>

              {/* Tags */}
              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.tags.map(tag => (
                    <span key={tag} className="chip">{tag}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selected, 'confirmed_threat')}
                    className="btn-danger text-xs py-1.5 justify-center"
                    disabled={selected.status === 'confirmed_threat'}
                  >
                    <CheckCircle className="w-3 h-3" /> Confirm Threat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selected, 'dismissed')}
                    className="btn-secondary text-xs py-1.5 justify-center"
                    disabled={selected.status === 'dismissed'}
                  >
                    <XCircle className="w-3 h-3" /> Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selected, 'under_review')}
                    className="btn-secondary text-xs py-1.5 justify-center"
                    disabled={selected.status === 'under_review'}
                  >
                    <Clock className="w-3 h-3" /> Mark Under Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddToInvModal(true)}
                    className="btn-primary text-xs py-1.5 justify-center"
                  >
                    <FolderPlus className="w-3 h-3" /> Add to Investigation
                  </button>
                </div>
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-xs w-full justify-center mt-1"
                >
                  <ExternalLink className="w-3 h-3" /> View Source URL
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add to Investigation modal */}
      <Modal
        open={addToInvModal}
        onClose={() => setAddToInvModal(false)}
        title="Add to Investigation"
        size="md"
      >
        <div className="p-6 space-y-3">
          <p className="text-sm text-muted mb-4">
            Create a new investigation for <span className="font-semibold text-navy">"{selected?.id}"</span>, or link to an existing open one.
          </p>
          <button
            type="button"
            onClick={handleCreateInvestigation}
            className="btn-primary w-full justify-center"
          >
            <FolderPlus className="w-4 h-4" /> Create New Investigation
          </button>
          {investigations.filter(i => i.status !== 'closed').length > 0 && (
            <>
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-xs text-muted">or link to existing</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {investigations.filter(i => i.status !== 'closed').map(inv => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => handleLinkToExistingInvestigation(inv)}
                    className="w-full text-left card-sm hover:border-accent hover:bg-accent-light transition-all"
                  >
                    <p className="text-sm font-semibold text-navy truncate">{inv.title}</p>
                    <p className="text-xs text-muted">{inv.id} · {inv.linkedAdIds.length} linked ad{inv.linkedAdIds.length !== 1 ? 's' : ''}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </AppShell>
  );
}
