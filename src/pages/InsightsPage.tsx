/* ──────────────────────────────────────────
   Insights Page – KPIs, topics, trends
   ────────────────────────────────────────── */
import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetchInsights } from '../lib/api';
import { CATEGORY_COLORS, URGENCY_COLORS } from '../lib/utils';
import { Card, Badge, PageHeader, LoadingState, ErrorState, EmptyState } from '../components/ui';
import type { InsightsResponse } from '../types';

const CHART_COLORS = ['#6366f1', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#ec4899'];

/* ── KPI card ── */
function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card className="p-5 space-y-1" hover>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </Card>
  );
}

/* ═══════════════════════════════════════════ */
export default function InsightsPage() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [kwCategoryFilter, setKwCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchInsights()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* Topic trend data pivoted for line chart */
  const trendData = useMemo(() => {
    if (!data) return [];
    const filtered = topicFilter === 'all'
      ? data.trends
      : data.trends.filter(t => t.topic === topicFilter);
    const byDate = new Map<string, Record<string, number>>();
    filtered.forEach(t => {
      const entry = byDate.get(t.date) ?? {};
      entry[t.topic] = t.count;
      byDate.set(t.date, entry);
    });
    return Array.from(byDate.entries()).map(([date, topics]) => ({ date: date.slice(5), ...topics }));
  }, [data, topicFilter]);

  const trendTopics = useMemo(() => {
    if (topicFilter !== 'all') return [topicFilter];
    return data?.topics.map(t => t.label) ?? [];
  }, [data, topicFilter]);

  /* Keyword data */
  const keywordData = useMemo(() => {
    if (!data) return [];
    let kw = data.keywords;
    if (kwCategoryFilter !== 'all') {
      kw = kw.filter(k => k.category === kwCategoryFilter);
    }
    return kw.slice(0, 20);
  }, [data, kwCategoryFilter]);

  if (loading) return <LoadingState label="Loading insights…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="No insights available" />;

  const allCategories = [...new Set(data.keywords.map(k => k.category))];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Insights" description="Explore trends, topic clusters, and keyword distributions across analyzed tickets." />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tickets Analyzed" value={data.kpis.tickets_analyzed.toLocaleString()} accent="#6366f1" />
        <KpiCard label="High / Critical" value={`${data.kpis.high_critical_pct}%`} sub="of all tickets" accent="#ef4444" />
        <KpiCard label="Top Category" value={data.kpis.top_category} accent={CATEGORY_COLORS[data.kpis.top_category]} />
        <KpiCard label="Duplicate Rate" value={`${data.kpis.duplicate_rate}%`} sub="detected duplicates" accent="#f59e0b" />
      </div>

      {/* Topics */}
      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Discovered Topics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topics.map((topic, idx) => (
            <div key={topic.id} className="rounded-lg border border-slate-100 dark:border-slate-700/40 p-4 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{topic.label}</h4>
                <span className="text-xs font-bold" style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }}>
                  {topic.count.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topic.keywords.map(kw => (
                  <span key={kw} className="rounded-full bg-slate-100 dark:bg-slate-700/60 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Trend chart */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Topic Volume Over Time</h3>
          <select
            value={topicFilter}
            onChange={e => setTopicFilter(e.target.value)}
            aria-label="Filter topics"
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All topics</option>
            {data.topics.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke, #e2e8f0)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
            {trendTopics.map((topic, i) => (
              <Line
                key={topic}
                dataKey={topic}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Spike alerts */}
      {data.spikes.length > 0 && (
        <Card className="p-5 space-y-3 border-l-4 border-l-amber-500">
          <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Spike Alerts
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {data.spikes.map((spike, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{spike.topic}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{spike.date}</span>
                </div>
                <Badge color="#ef4444" className="text-sm font-bold">↑ {spike.increase_pct}%</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bottom row: Keywords + Category + Urgency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keywords */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Top Keywords</h3>
            <select
              value={kwCategoryFilter}
              onChange={e => setKwCategoryFilter(e.target.value)}
              aria-label="Filter keywords by category"
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All categories</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={keywordData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--grid-stroke, #e2e8f0)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="word" type="category" width={80} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {keywordData.map((d, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="space-y-6">
          {/* Category distribution */}
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.category_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke, #e2e8f0)" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                  {data.category_distribution.map((d, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Urgency distribution donut */}
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Urgency Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.urgency_distribution}
                  dataKey="count"
                  nameKey="urgency"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.urgency_distribution.map((d, i) => (
                    <Cell key={i} fill={URGENCY_COLORS[d.urgency] ?? CHART_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
