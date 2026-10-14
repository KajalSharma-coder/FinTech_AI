import { useMemo, useState } from 'react';
import {
  FileBarChart, TrendingUp, AlertTriangle, CheckCircle, Download, ChevronDown, ChevronUp,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import { reports } from '../data/reports';
import { useApp } from '../context/AppContext';
import { formatDate, categoryLabel, riskHex } from '../lib/utils';
import type { Report, RiskLevel, AdCategory, Platform } from '../types';

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low'];

function RiskDistBar({ distribution }: { distribution: Report['riskDistribution'] }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-2">
      {RISK_ORDER.map(level => {
        const count = distribution[level] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={level}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="capitalize font-medium text-navy-3">{level}</span>
              <span className="font-bold tabular-nums" style={{ color: riskHex(level) }}>{count}</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: riskHex(level) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const [expanded, setExpanded] = useState(false);

  function handlePrint() {
    const content = `
TRACE//FIN — ${report.title}
Generated: ${new Date(report.generatedAt).toLocaleString()}
Period: ${report.period.label}

SUMMARY
${report.summary}

STATISTICS
Total Threats: ${report.threatCount}
New Threats: ${report.newThreats}
Resolved: ${report.resolvedThreats}

RISK DISTRIBUTION
Critical: ${report.riskDistribution.critical}
High: ${report.riskDistribution.high}
Medium: ${report.riskDistribution.medium}
Low: ${report.riskDistribution.low}

TOP CATEGORIES
${report.topCategories.map(c => `  ${categoryLabel(c.category)}: ${c.count}`).join('\n')}

TOP PLATFORMS
${report.topPlatforms.map(p => `  ${p.platform}: ${p.count}`).join('\n')}

KEY FINDINGS
${report.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}
    `.trim();

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family:monospace;padding:2rem;max-width:800px;margin:0 auto;white-space:pre-wrap;">${content}</pre>`);
      win.document.title = report.title;
      win.print();
    }
  }

  return (
    <article className="report-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
              <FileBarChart className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-navy leading-tight">{report.title}</h2>
              <p className="text-xs text-muted">{report.period.label} · Generated {formatDate(report.generatedAt)}</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={handlePrint} className="btn-secondary text-xs flex-shrink-0">
          <Download className="w-3.5 h-3.5" /> Print / Save as PDF
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-navy">{report.threatCount}</p>
          <p className="text-[10px] text-muted font-semibold uppercase tracking-wide mt-0.5">Total</p>
        </div>
        <div className="bg-high-bg border border-high-border rounded-xl p-3 text-center">
          <p className="text-xl font-black text-high">{report.newThreats}</p>
          <p className="text-[10px] text-muted font-semibold uppercase tracking-wide mt-0.5">New</p>
        </div>
        <div className="bg-low-bg border border-low-border rounded-xl p-3 text-center">
          <p className="text-xl font-black text-low">{report.resolvedThreats}</p>
          <p className="text-[10px] text-muted font-semibold uppercase tracking-wide mt-0.5">Resolved</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-navy-3 leading-relaxed mb-6 max-w-3xl">{report.summary}</p>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Risk Distribution</p>
          <RiskDistBar distribution={report.riskDistribution} />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">By Category</p>
          <CategoryPieChart data={report.topCategories} />
        </div>
      </div>

      {/* Expandable key findings */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between w-full pt-3 border-t border-border text-xs font-semibold text-muted hover:text-navy transition-colors"
      >
        Key Findings ({report.keyFindings.length})
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 animate-slide-up">
          {report.keyFindings.map((finding, i) => (
            <div key={i} className="flex gap-3 bg-surface-2 rounded-lg p-3">
              <span className="w-5 h-5 rounded-full bg-accent-mid text-accent text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <p className="text-xs text-navy-3 leading-relaxed">{finding}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function Reports() {
  const { state } = useApp();
  const [generatedAt] = useState(() => new Date().toISOString());
  const currentReport = useMemo<Report>(() => {
    const categoryCounts = new Map<AdCategory, number>();
    const platformCounts = new Map<Platform, number>();
    const riskDistribution: Report['riskDistribution'] = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const ad of state.advertisements) {
      categoryCounts.set(ad.category, (categoryCounts.get(ad.category) ?? 0) + 1);
      platformCounts.set(ad.platform, (platformCounts.get(ad.platform) ?? 0) + 1);
      riskDistribution[ad.riskLevel] += 1;
    }
    const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count }));
    const topPlatforms = [...platformCounts.entries()].sort((a, b) => b[1] - a[1]).map(([platform, count]) => ({ platform, count }));
    const activeAlerts = state.alerts.filter(alert => !['resolved', 'dismissed'].includes(alert.status)).length;
    return {
      id: 'RPT-CURRENT',
      title: 'Current Workspace Snapshot',
      generatedAt,
      period: { label: 'Current local workspace', start: '', end: '' },
      summary: `${state.advertisements.length} advertisement records are currently available, with ${activeAlerts} active alert${activeAlerts === 1 ? '' : 's'} and ${state.evidence.length} evidence record${state.evidence.length === 1 ? '' : 's'}. Metrics include synthetic demonstration data and locally imported records only.`,
      threatCount: state.advertisements.length,
      newThreats: state.alerts.filter(alert => alert.status === 'new').length,
      resolvedThreats: state.alerts.filter(alert => alert.status === 'resolved').length,
      topCategories,
      riskDistribution,
      topPlatforms,
      keyFindings: [
        `${activeAlerts} active alert${activeAlerts === 1 ? '' : 's'} require${activeAlerts === 1 ? 's' : ''} review.`,
        `${state.investigations.filter(investigation => investigation.status !== 'closed').length} investigation${state.investigations.filter(investigation => investigation.status !== 'closed').length === 1 ? '' : 's'} remain open or in progress.`,
        `${state.evidence.length} evidence record${state.evidence.length === 1 ? '' : 's'} are retained in the local Evidence Vault.`,
      ],
    };
  }, [state, generatedAt]);

  const total = currentReport.threatCount;
  const totalNew = currentReport.newThreats;
  const totalResolved = currentReport.resolvedThreats;

  return (
    <AppShell title="Reports" subtitle="Current workspace analytics and synthetic demonstration history">
      <div className="bg-accent-light border border-accent-mid rounded-lg px-4 py-3 mb-6 text-sm text-navy-3">
        <span className="font-semibold text-navy">Demo data notice:</span> current metrics combine synthetic records and any records imported into this browser. This prototype does not provide live monitoring.
      </div>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Threats (All Time)', value: total, icon: AlertTriangle, color: 'bg-critical-bg text-critical' },
          { label: 'New Threats Tracked', value: totalNew, icon: TrendingUp, color: 'bg-high-bg text-high' },
          { label: 'Threats Resolved', value: totalResolved, icon: CheckCircle, color: 'bg-low-bg text-low' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="metric-card flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-6">
        <ReportCard report={currentReport} />
        <p className="eyebrow text-muted">Historical synthetic demonstration reports</p>
        {reports.map(report => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </AppShell>
  );
}
