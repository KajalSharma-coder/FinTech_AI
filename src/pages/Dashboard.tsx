import { AlertTriangle, TrendingUp, FolderOpen, FileBarChart, ArrowRight, Clock, Search, Bell, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import ThreatTrendChart from '../components/charts/ThreatTrendChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import { useApp } from '../context/AppContext';
import { dailyThreats, reports } from '../data/reports';
import { riskBadgeClass, categoryLabel, timeAgo, statusBadgeClass, statusLabel, truncate, platformColor } from '../lib/utils';
import type { RiskLevel } from '../types';

function StatCard({
  label, value, icon: Icon, color, delta,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; delta?: string;
}) {
  return (
    <div className="metric-card flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="stat-number">{value}</p>
        <p className="stat-label mt-0.5">{label}</p>
        {delta && <p className="text-[11px] text-accent font-medium mt-1">{delta}</p>}
      </div>
    </div>
  );
}

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low'];

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();

  const ads = state.advertisements;
  const investigations = state.investigations;
  const alerts = state.alerts;

  const byRisk = RISK_ORDER.reduce((acc, l) => {
    acc[l] = ads.filter(a => a.riskLevel === l).length;
    return acc;
  }, {} as Record<RiskLevel, number>);

  const totalToday = dailyThreats[dailyThreats.length - 1].count;
  const recentAds = [...ads]
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    .slice(0, 7);

  const categoryData = reports[0].topCategories;
  const activeAlerts = alerts.filter(alert => !['resolved', 'dismissed'].includes(alert.status));
  const criticalHighAlerts = alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');
  const newAlerts = alerts.filter(alert => alert.status === 'new');
  const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved');
  const recentAlerts = [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <AppShell
      title="Financial Threat Intelligence"
      subtitle="A focused view of suspicious financial account activity"
      actions={
        <button type="button" onClick={() => navigate('/advertisements')} className="btn-primary text-xs whitespace-nowrap">
          <Search className="w-3.5 h-3.5" /> Analyze Advertisement
        </button>
      }
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="Total Threats Detected"
          value={ads.length}
          icon={AlertTriangle}
          color="bg-critical-bg text-critical"
          delta={`+${totalToday} today`}
        />
        <StatCard
          label="Critical Alerts"
          value={byRisk.critical}
          icon={AlertTriangle}
          color="bg-high-bg text-high"
          delta="Requires immediate action"
        />
        <StatCard
          label="Active Investigations"
          value={investigations.filter(i => i.status !== 'closed').length}
          icon={FolderOpen}
          color="bg-accent-light text-accent"
        />
        <StatCard
          label="Reports Generated"
          value={reports.length}
          icon={FileBarChart}
          color="bg-blue-50 text-blue-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Active Alerts" value={activeAlerts.length} icon={Bell} color="bg-accent-light text-accent" delta="Needs analyst review" />
        <StatCard label="Critical / High Alerts" value={criticalHighAlerts.length} icon={AlertTriangle} color="bg-critical-bg text-critical" />
        <StatCard label="New Alerts" value={newAlerts.length} icon={Clock} color="bg-high-bg text-high" />
        <StatCard label="Resolved Alerts" value={resolvedAlerts.length} icon={CheckCircle} color="bg-low-bg text-low" />
      </div>

      {/* Risk breakdown pills */}
      <div className="risk-overview mb-7">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <p className="eyebrow text-accent-mid">Signal overview</p>
            <h2 className="font-display text-xl sm:text-2xl font-semibold mt-1">Threat risk distribution</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/advertisements')}
            className="btn-ghost text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RISK_ORDER.map(level => (
            <button
              key={level}
              type="button"
              onClick={() => navigate(`/advertisements?risk=${level}`)}
                className={`risk-cell ${
                level === 'critical' ? 'border-l-2 border-l-critical' :
                level === 'high'     ? 'border-l-2 border-l-high' :
                level === 'medium'   ? 'border-l-2 border-l-medium' :
                                       'border-l-2 border-l-low'
              }`}
            >
              <p className={`font-display text-3xl font-semibold ${
                level === 'critical' ? 'text-critical' :
                level === 'high'     ? 'text-high' :
                level === 'medium'   ? 'text-medium' :
                                       'text-low'
              }`}>{byRisk[level]}</p>
              <p className="text-xs font-medium text-white/65 capitalize mt-1">{level} alerts</p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-7">
        <div className="lg:col-span-2 content-section">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-accent" />
            <h2 className="section-title">Detection Trend (Last 14 Days)</h2>
          </div>
          <ThreatTrendChart data={dailyThreats} />
        </div>
        <div className="content-section">
          <h2 className="section-title mb-1">Ad Categories</h2>
          <p className="section-subtitle mb-3">By threat type</p>
          <CategoryPieChart data={categoryData} />
        </div>
      </div>

      {/* Recent alerts */}
      <div className="content-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted" />
            <h2 className="section-title">Recent Detections</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/advertisements')}
            className="btn-ghost text-xs"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="th">Advertisement</th>
                <th className="th hidden md:table-cell">Platform</th>
                <th className="th hidden sm:table-cell">Category</th>
                <th className="th">Risk</th>
                <th className="th hidden lg:table-cell">Status</th>
                <th className="th">Detected</th>
              </tr>
            </thead>
            <tbody>
              {recentAds.map(ad => (
                <tr
                  key={ad.id}
                  className="tr-hover"
                  tabIndex={0}
                  onClick={() => navigate(`/advertisements?id=${ad.id}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/advertisements?id=${ad.id}`); }}
                >
                  <td className="td">
                    <p className="font-semibold text-navy text-sm leading-snug max-w-xs truncate">{truncate(ad.title, 55)}</p>
                    <p className="text-xs text-muted mt-0.5">{ad.seller.alias}</p>
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className={`status-badge ${platformColor(ad.platform)}`}>{ad.platform}</span>
                  </td>
                  <td className="td hidden sm:table-cell">
                    <span className="chip">{categoryLabel(ad.category)}</span>
                  </td>
                  <td className="td">
                    <span className={`badge ${riskBadgeClass(ad.riskLevel)}`}>
                      {ad.riskScore} · {ad.riskLevel}
                    </span>
                  </td>
                  <td className="td hidden lg:table-cell">
                    <span className={`status-badge ${statusBadgeClass(ad.status)}`}>{statusLabel(ad.status)}</span>
                  </td>
                  <td className="td text-muted text-xs whitespace-nowrap">{timeAgo(ad.detectedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-section mt-7">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Bell className="w-4 h-4 text-accent" /><h2 className="section-title">Recent Alerts</h2></div><button type="button" onClick={() => navigate('/alerts')} className="btn-ghost text-xs">View all <ArrowRight className="w-3 h-3" /></button></div>
        {recentAlerts.length === 0 ? <p className="text-sm text-muted">No alerts have been generated from the current data.</p> : <div className="space-y-2">{recentAlerts.map(alert => <button key={alert.id} type="button" onClick={() => navigate(`/alerts?id=${alert.id}`)} className="w-full text-left flex items-center justify-between gap-3 bg-surface-2 rounded-lg p-3 hover:bg-accent-light transition-colors"><div className="min-w-0"><p className="text-sm font-semibold text-navy truncate">{alert.title}</p><p className="text-xs text-muted truncate">{alert.summary}</p></div><div className="flex items-center gap-2 flex-shrink-0"><span className={`badge ${riskBadgeClass(alert.severity)}`}>{alert.severity}</span><span className="status-badge hidden sm:inline-flex">{alert.status}</span></div></button>)}</div>}
      </div>
    </AppShell>
  );
}
