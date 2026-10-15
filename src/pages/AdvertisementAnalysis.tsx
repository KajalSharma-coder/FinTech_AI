import { useState, useMemo, type ReactNode } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Download, X, ExternalLink,
  ChevronUp, ChevronDown, FolderPlus, CheckCircle, XCircle, Clock, Upload, FileBarChart, ArrowRight, ScanText,
} from 'lucide-react';
import { toast } from 'sonner';
import { extractIndicators } from '../lib/indicatorExtraction';
import { hashAdvertisementImage, type AdvertisementImageMetadata } from '../lib/imageHash';
import { findRelatedAdvertisementsFor } from '../lib/relatedAds';
import { createEvidenceRecord } from '../lib/evidence';
import { summarizeAdvertisements } from '../lib/analysisSummary';
import AppShell from '../components/layout/AppShell';
import Modal from '../components/ui/Modal';
import RiskMeter from '../components/ui/RiskMeter';
import RiskBreakdown from '../components/ui/RiskBreakdown';
import AdvertisementIngestion from '../components/ingestion/AdvertisementIngestion';
import OcrAdvertisementScanner from '../components/ocr/OcrAdvertisementScanner';
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
const PLATFORMS: Platform[] = ['Telegram', 'Facebook', 'Twitter/X', 'Dark Web Forum', 'WhatsApp', 'Reddit', 'Instagram', 'Other'];
const STATUSES = ['flagged', 'under_review', 'confirmed_threat', 'dismissed'];

function ScanLanding({ onUpload, onOcr, onSample }: { onUpload: () => void; onOcr: () => void; onSample: () => void }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-7">
        <p className="eyebrow">Begin a scan</p>
        <h2 className="display-heading mt-2 text-3xl sm:text-4xl">Analyze Suspicious Advertisements</h2>
        <p className="section-subtitle max-w-2xl mx-auto mt-3 text-base">Upload a permitted CSV or JSON dataset and TRACE//FIN will identify risk signals, explain the score, and help you decide what to investigate next.</p>
      </div>
      <div className="content-section border-2 border-dashed border-accent/40 bg-surface text-center px-5 sm:px-10 py-9 shadow-card-md">
        <div className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mx-auto mb-4"><Upload className="w-7 h-7" /></div>
        <h3 className="font-display text-xl font-semibold text-navy">Start with your advertisement data</h3>
        <p className="text-sm text-muted mt-2 max-w-xl mx-auto">Choose a file containing public advertisement records you are authorized to use. Invalid rows are shown for review and duplicate records are not imported.</p>
        <button type="button" onClick={onUpload} className="btn-primary mx-auto mt-6 min-h-12 px-6 text-sm"><Upload className="w-5 h-5" /> Choose CSV or JSON File</button>
        <p className="text-xs text-muted mt-3">CSV with headers or JSON array · maximum 2 MB</p>
        <div className="flex flex-wrap justify-center gap-3 mt-5 pt-5 border-t border-border">
          <button type="button" onClick={onSample} className="btn-secondary"><FileBarChart className="w-4 h-4" /> Try Sample Dataset</button>
          <button type="button" onClick={onOcr} className="btn-secondary"><ScanText className="w-4 h-4" /> Analyze an Image with OCR</button>
          <span className="text-xs text-muted self-center">Synthetic demonstration data</span>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-7">
        {[['1', 'Upload Data', 'Choose a CSV or JSON file.'], ['2', 'Analyze Risks', 'Review deterministic scores and explanations.'], ['3', 'View Report', 'Export results or continue to an investigation.']].map(([number, title, description]) => (
          <div key={number} className="flex gap-3 items-start"><span className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{number}</span><div><p className="text-sm font-semibold text-navy">{title}</p><p className="text-xs text-muted mt-1 leading-relaxed">{description}</p></div></div>
        ))}
      </div>
      <p className="text-xs text-muted text-center mt-7">Automated scores are screening indicators, not proof of criminal activity. You can inspect evidence, alerts, and investigations after analysis.</p>
    </div>
  );
}

function ResultsSummary({ ads, onExport, onReport, onOpenAd }: { ads: Advertisement[]; onExport: () => void; onReport: () => void; onOpenAd: (id: string) => void }) {
  const summary = summarizeAdvertisements(ads);
  const counts = summary.counts;
  const flagged = summary.flaggedAdvertisements.slice(0, 8);
  const highest = flagged[0];
  return (
    <section className="mb-7" aria-labelledby="analysis-results-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div><p className="eyebrow">Analysis complete</p><h2 id="analysis-results-heading" className="display-heading mt-1">Your results at a glance</h2><p className="section-subtitle mt-1">{ads.length} advertisement{ads.length === 1 ? '' : 's'} in the current workspace, scored by the existing explainable risk engine.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={onReport} className="btn-primary"><FileBarChart className="w-4 h-4" /> Generate Report</button><button type="button" onClick={onExport} className="btn-secondary"><Download className="w-4 h-4" /> Export Results CSV</button></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {RISK_LEVELS.map(level => <div key={level} className="metric-card"><p className={`text-2xl font-black capitalize ${level === 'critical' ? 'text-critical' : level === 'high' ? 'text-high' : level === 'medium' ? 'text-medium' : 'text-low'}`}>{counts[level]}</p><p className="stat-label mt-1">{level}-risk</p></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="content-section"><div className="flex items-center justify-between mb-4"><div><p className="section-title">Risk distribution</p><p className="section-subtitle mt-1">Actual results from this dataset</p></div><span className="text-xs font-semibold text-muted">{ads.length} total</span></div><div className="space-y-3">{RISK_LEVELS.map(level => { const percent = ads.length ? Math.round((counts[level] / ads.length) * 100) : 0; return <div key={level}><div className="flex justify-between text-xs mb-1"><span className="capitalize text-navy-3 font-medium">{level}</span><span className="text-muted">{counts[level]} · {percent}%</span></div><div className="h-2 bg-surface-3 rounded-full overflow-hidden"><div className={`h-full ${level === 'critical' ? 'bg-critical' : level === 'high' ? 'bg-high' : level === 'medium' ? 'bg-medium' : 'bg-low'}`} style={{ width: `${percent}%` }} /></div></div>; })}</div></div>
        <div className="risk-overview"><p className="eyebrow text-accent-mid">What this means</p><p className="text-sm leading-relaxed text-white/80 mt-3">{flagged.length ? `${flagged.length} high or critical-risk advertisements need closer review${highest ? `, led by “${highest.title}” at ${highest.riskScore}/100` : ''}.` : 'No high or critical-risk advertisements were found in the current dataset.'} Scores combine the existing category, platform, keyword, seller, price, and contact signals.</p><p className="text-xs text-white/60 mt-4">These are automated screening indicators, not proof of criminal activity. Confirm findings through evidence and investigator review.</p></div>
      </div>
      <div className="content-section mt-5"><div className="flex items-center justify-between mb-3"><div><p className="section-title">Flagged advertisements</p><p className="section-subtitle mt-1">Start with the highest-risk records</p></div><button type="button" onClick={() => document.getElementById('advanced-analysis')?.scrollIntoView({ behavior: 'smooth' })} className="btn-ghost text-xs">Open advanced analysis <ArrowRight className="w-3 h-3" /></button></div>{flagged.length === 0 ? <p className="text-sm text-muted">There are no high or critical-risk advertisements to display.</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border"><th className="th pl-0">Advertisement</th><th className="th">Risk</th><th className="th">Score</th><th className="th pr-0">Action</th></tr></thead><tbody>{flagged.map(ad => <tr key={ad.id} className="border-b border-border last:border-0"><td className="td pl-0"><p className="font-semibold text-navy text-sm truncate max-w-xs">{ad.title}</p><p className="text-[11px] text-muted">{ad.id} · {ad.platform}</p></td><td className="td"><span className={`badge ${riskBadgeClass(ad.riskLevel)}`}>{ad.riskLevel}</span></td><td className="td font-semibold text-navy">{ad.riskScore}/100</td><td className="td pr-0"><button type="button" onClick={() => onOpenAd(ad.id)} className="btn-ghost text-xs text-accent px-0">View Details <ArrowRight className="w-3 h-3" /></button></td></tr>)}</tbody></table></div>}</div>
    </section>
  );
}

// Sort icon as a plain function (not a hook) to avoid rules-of-hooks violation
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-muted-2 opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-accent" />
    : <ChevronDown className="w-3 h-3 text-accent" />;
}

function HighlightedAdvertisementText({ text, indicators }: { text: string; indicators: ReturnType<typeof extractIndicators> }) {
  const matches = indicators
    .filter(indicator => indicator.source === 'content')
    .map(indicator => ({ value: indicator.matchedValue, index: text.toLowerCase().indexOf(indicator.matchedValue.toLowerCase()) }))
    .filter(match => match.index >= 0)
    .sort((a, b) => a.index - b.index || b.value.length - a.value.length);

  const visibleMatches: typeof matches = [];
  let end = 0;
  for (const match of matches) {
    if (match.index < end) continue;
    visibleMatches.push(match);
    end = match.index + match.value.length;
  }

  if (visibleMatches.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let cursor = 0;
  visibleMatches.forEach((match, index) => {
    parts.push(text.slice(cursor, match.index));
    parts.push(<mark key={`${match.index}-${index}`} className="bg-medium-bg text-navy rounded px-0.5">{text.slice(match.index, match.index + match.value.length)}</mark>);
    cursor = match.index + match.value.length;
  });
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export default function AdvertisementAnalysis() {
  const { state, updateAdStatus, addInvestigation, updateInvestigation, addEvidence } = useApp();
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
  const [ingestionOpen, setIngestionOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<{ advertisementId: string; metadata: AdvertisementImageMetadata } | null>(null);
  const [relatedToLinkId, setRelatedToLinkId] = useState<string | null>(null);
  const [evidenceModal, setEvidenceModal] = useState(false);
  const [evidenceInvestigationId, setEvidenceInvestigationId] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [scanStarted, setScanStarted] = useState(Boolean(searchParams.get('id') || searchParams.get('search') || searchParams.get('risk')));
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
  const selectedIndicators = useMemo(
    () => selected ? extractIndicators(selected) : [],
    [selected],
  );
  const relatedMatches = useMemo(
    () => selected ? findRelatedAdvertisementsFor(selected, ads) : [],
    [selected, ads],
  );

  async function handleImageSelection(file: File | undefined) {
    if (!file) return;
    try {
      const metadata = await hashAdvertisementImage(file);
      setImageMetadata(selected ? { advertisementId: selected.id, metadata } : null);
    toast.success('Image metadata captured. Use the upload-first OCR workflow to extract text.');
    } catch (error) {
      setImageMetadata(null);
      toast.error(error instanceof Error ? error.message : 'Unable to process image.');
    }
  }

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
    const idsToLink = [selected.id, relatedToLinkId].filter((id): id is string => Boolean(id));
    const newIds = idsToLink.filter(id => !inv.linkedAdIds.includes(id));
    if (newIds.length === 0) {
      toast.info('These advertisements are already linked to this investigation');
      setAddToInvModal(false);
      return;
    }
    const updated = {
      ...inv,
      linkedAdIds: [...inv.linkedAdIds, ...newIds],
      updatedAt: new Date().toISOString(),
    };
    updateInvestigation(updated);
    toast.success(`Linked ${newIds.length} advertisement${newIds.length === 1 ? '' : 's'} to "${inv.title.slice(0, 40)}…"`);
    setAddToInvModal(false);
    setRelatedToLinkId(null);
  }

  function handleCreateInvestigation() {
    if (!selected) return;
    const linkedAdIds = [selected.id, relatedToLinkId].filter((id): id is string => Boolean(id));
    const inv = {
      id: generateId(),
      title: `Investigation — ${selected.title.slice(0, 50)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open' as const,
      priority: selected.riskLevel,
      linkedAdIds,
      notes: `Auto-created from advertisement ${selected.id}.\n\n`,
      analyst: 'A. Reyes',
      tags: selected.tags.slice(0, 3),
    };
    addInvestigation(inv);
    toast.success('Investigation created — navigating…');
    setAddToInvModal(false);
    setRelatedToLinkId(null);
    navigate('/investigations');
  }

  function openRelatedAdvertisement(id: string) {
    setSelectedId(id);
    setSearchParams({ id });
  }

  function handleCreateEvidence() {
    if (!selected) return;
    const image = imageMetadata?.advertisementId === selected.id ? imageMetadata.metadata : undefined;
    const record = createEvidenceRecord(selected, selectedIndicators, evidenceInvestigationId || undefined, image, evidenceNotes);
    addEvidence(record);
    toast.success(`Evidence ${record.id} created`);
    setEvidenceModal(false);
    setEvidenceInvestigationId('');
    setEvidenceNotes('');
  }

  function handleExportCSV(records = filtered) {
    const rows = records.map(ad => ({
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

  function handleOpenAd(id: string) {
    setScanStarted(true);
    setSelectedId(id);
    setSearchParams({ id });
  }

  const hasFilters = search || filterRisk || filterCat || filterPlatform || filterStatus;

  return (
    <AppShell title="Advertisement Analysis" subtitle={`${filtered.length} of ${ads.length} advertisements under review`}>
      {!scanStarted ? (
        <ScanLanding onUpload={() => setIngestionOpen(true)} onOcr={() => setOcrOpen(true)} onSample={() => { setScanStarted(true); toast.success('Synthetic sample dataset loaded.'); }} />
      ) : (
        <>
          <ResultsSummary ads={ads} onExport={() => handleExportCSV(ads)} onReport={() => navigate('/reports')} onOpenAd={handleOpenAd} />
          <details id="advanced-analysis" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)} className="mb-5">
            <summary className="list-none cursor-pointer content-section flex items-center justify-between gap-3 hover:border-accent transition-colors">
              <span><span className="section-title">Advanced Analysis</span><span className="section-subtitle block mt-1">Search, filter, sort, inspect indicators, manage evidence, and link investigations.</span></span>
              <span className="btn-secondary text-xs">{advancedOpen ? 'Collapse' : 'Open'}</span>
            </summary>
            <div className="pt-5">
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
        <button type="button" onClick={() => handleExportCSV()} className="btn-secondary">
          <Download className="w-4 h-4" /> Export CSV
        </button>
        <button type="button" onClick={() => setIngestionOpen(true)} className="btn-primary">
          <Upload className="w-4 h-4" /> Import Advertisements
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
                  <HighlightedAdvertisementText text={selected.content} indicators={selectedIndicators} />
                </p>
              </div>

              {/* Extracted indicators */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">Extracted Indicators</p>
                  <span className="text-[10px] text-muted">Automated signals</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Array.from(new Set(selectedIndicators.map(indicator => indicator.type))).map(type => (
                    <span key={type} className="chip text-[10px]">{type.replaceAll('_', ' ')} · {selectedIndicators.filter(indicator => indicator.type === type).length}</span>
                  ))}
                  {selectedIndicators.length === 0 && <span className="text-xs text-muted">No indicators extracted from this advertisement.</span>}
                </div>
                <div className="space-y-2">
                  {selectedIndicators.map(indicator => (
                    <div key={indicator.id} className="bg-surface-2 rounded-lg p-2.5 border border-border">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-navy capitalize">{indicator.type.replaceAll('_', ' ')}</span>
                        <span className="status-badge bg-accent-light text-accent border-accent-mid">Automated</span>
                      </div>
                      <p className="text-xs font-mono text-navy-3 mt-1 break-all">{indicator.maskedDisplayValue}</p>
                      <p className="text-[11px] text-muted mt-1 leading-relaxed">{indicator.explanation}</p>
                      <p className="text-[11px] text-navy-3 mt-1 italic break-words">“{indicator.sourceEvidence}”</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-2">Extracted indicators are investigative leads, not proof. Investigator-confirmed findings remain separate from automated assessment.</p>
                {selected.assessment === 'investigator_confirmed' && <p className="text-[11px] text-accent mt-1 font-semibold">Investigator-confirmed finding recorded.</p>}
              </div>

              {/* Related advertisements */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">Related Advertisements</p>
                  <span className="text-[10px] text-muted">{relatedMatches.length} lead{relatedMatches.length === 1 ? '' : 's'}</span>
                </div>
                {relatedMatches.length === 0 && <p className="text-xs text-muted bg-surface-2 rounded-lg p-3">No related advertisements found using the current similarity and shared-indicator checks.</p>}
                <div className="space-y-2">
                  {relatedMatches.map(match => {
                    const related = ads.find(ad => ad.id === match.relatedAdvertisementId);
                    if (!related) return null;
                    return (
                      <div key={match.id} className="bg-surface-2 rounded-lg p-3 border border-border">
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => openRelatedAdvertisement(related.id)} className="text-left min-w-0 hover:text-accent">
                            <p className="text-xs font-semibold text-navy truncate">{related.title}</p>
                            <p className="text-[11px] text-muted">{related.platform} · {related.id}</p>
                          </button>
                          <span className={`badge ${riskBadgeClass(related.riskLevel)}`}>{related.riskScore}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {match.reasons.map(reason => <span key={`${reason.type}-${reason.matchedValue}`} className="chip text-[10px]">{reason.type.replaceAll('_', ' ')}</span>)}
                        </div>
                        <p className="text-[11px] text-muted mt-2 leading-relaxed">{match.reasons.map(reason => reason.explanation).join(' ')}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button type="button" onClick={() => openRelatedAdvertisement(related.id)} className="btn-ghost text-[11px] px-0">Open advertisement</button>
                          <button type="button" onClick={() => { setRelatedToLinkId(related.id); setAddToInvModal(true); }} className="btn-ghost text-[11px] px-0">Link to investigation</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {relatedMatches.length > 0 && <p className="text-[11px] text-muted mt-2">Shared indicators and similarity are investigative leads, not proof of coordinated activity.</p>}
              </div>

              {/* Optional image metadata */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Optional Image Context</p>
                <label className="btn-secondary text-xs w-full justify-center cursor-pointer">
                  <Upload className="w-3 h-3" /> Add PNG, JPEG, or WebP image
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => void handleImageSelection(event.target.files?.[0])} />
                </label>
                <p className="text-[11px] text-muted mt-1.5">This detail-panel upload stores image metadata only. Use “Analyze an Image with OCR” from the scan start screen to extract and review text.</p>
                {imageMetadata?.advertisementId === selected.id && (
                  <div className="mt-2 bg-surface-2 rounded-lg p-2.5 text-[11px] text-muted break-all">
                    <p className="font-semibold text-navy">{imageMetadata.metadata.fileName} · {imageMetadata.metadata.mimeType}</p>
                    <p>SHA-256: {imageMetadata.metadata.sha256}</p>
                  </div>
                )}
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
                  <button
                    type="button"
                    onClick={() => setEvidenceModal(true)}
                    className="btn-secondary text-xs py-1.5 justify-center col-span-2"
                  >
                    Create Evidence Record
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

            </div>
          </details>
        </>
      )}

      {/* Add to Investigation modal */}
      <Modal
        open={addToInvModal}
        onClose={() => setAddToInvModal(false)}
        title="Add to Investigation"
        size="md"
      >
        <div className="p-6 space-y-3">
          <p className="text-sm text-muted mb-4">
            Create a new investigation for <span className="font-semibold text-navy">"{selected?.id}"</span>{relatedToLinkId ? ` and related advertisement "${relatedToLinkId}"` : ''}, or link to an existing open one.
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
      <Modal
        open={evidenceModal}
        onClose={() => setEvidenceModal(false)}
        title="Create Evidence Record"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted">Capture the current advertisement analysis as a local evidence record. Source provenance and investigator notes remain separate.</p>
          <div className="bg-accent-light border border-accent-mid rounded-lg p-3 text-xs text-navy-3">
            <p className="font-semibold text-navy">{selected?.id} · {selected?.title}</p>
            <p className="mt-1">{selectedIndicators.length} extracted indicator{selectedIndicators.length === 1 ? '' : 's'} · Risk {selected?.riskScore}</p>
            {imageMetadata?.advertisementId === selected?.id && <p className="mt-1">Image hash will be stored; the image binary will not.</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Link to investigation (optional)</label>
            <select className="select w-full text-sm" value={evidenceInvestigationId} onChange={event => setEvidenceInvestigationId(event.target.value)}>
              <option value="">No investigation link</option>
              {investigations.map(investigation => <option key={investigation.id} value={investigation.id}>{investigation.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Investigator notes</label>
            <textarea className="textarea min-h-24 text-sm" value={evidenceNotes} onChange={event => setEvidenceNotes(event.target.value)} placeholder="Add context or next steps; this is not source evidence." />
          </div>
          <p className="text-[11px] text-muted">SHA-256 verifies file identity only; it does not prove the original advertisement is authentic. OCR evidence is captured through the upload-first image workflow.</p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => setEvidenceModal(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleCreateEvidence} className="btn-primary">Create Evidence</button>
          </div>
        </div>
      </Modal>
      <AdvertisementIngestion open={ingestionOpen} onClose={() => setIngestionOpen(false)} onImported={() => setScanStarted(true)} />
      <OcrAdvertisementScanner open={ocrOpen} onClose={() => setOcrOpen(false)} onAnalyzed={id => { setScanStarted(true); setSelectedId(id); setSearchParams({ id }); }} />
    </AppShell>
  );
}
