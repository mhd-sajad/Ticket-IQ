/* ──────────────────────────────────────────
   Insights Page – VOID-Inspired Heart Disease Design System
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

const CHART_COLORS = ['#d4f53c', '#38bdf8', '#ff4444', '#ff8c42', '#c084fc', '#22c55e', '#facc15', '#ec4899'];

/* ── KPI card ── */
function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card className="p-6 space-y-2 hover:border-[#d4f53c]/40" hover>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">// {label}</p>
      <p className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-white" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="font-mono text-[11px] text-[#555555] uppercase tracking-wider">{sub}</p>}
    </Card>
  );
}

/* ═══════════════════════════════════════════
   INSIGHTS PAGE — VOID DESIGN SYSTEM
   ═══════════════════════════════════════════ */
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

  if (loading) return <LoadingState label="COMPUTING CORPUS ANALYTICS & TOPICS…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="NO INSIGHTS AVAILABLE" />;

  const allCategories = [...new Set(data.keywords.map(k => k.category))];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <PageHeader
        eyebrow="AGGREGATE ANALYTICS"
        title="OPERATIONAL INTELLIGENCE & QUEUE METRICS"
        description="Corpus-wide topic clusters, volume temporal trends, and keyword discriminators across support queues."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="TICKETS PROCESSED" value={data.kpis.tickets_analyzed.toLocaleString()} accent="#ffffff" />
        <KpiCard label="CRITICAL / HIGH RATIO" value={`${data.kpis.high_critical_pct}%`} sub="ESCALATED LOAD" accent="#ff4444" />
        <KpiCard label="DOMINANT QUEUE" value={data.kpis.top_category} accent={CATEGORY_COLORS[data.kpis.top_category] ?? '#d4f53c'} />
        <KpiCard label="BOILERPLATE DUPLICATES" value={`${data.kpis.duplicate_rate}%`} sub="TEMPLATE OVERLAP" accent="#ff8c42" />
      </div>

      {/* Topics */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
            // PREDEFINED KEYWORD-RULE TOPIC CLUSTERS (NMF MODEL PLANNED)
          </h3>
          <span className="font-mono text-[10px] text-[#555555]">TF-IDF K-MEANS</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topics.map((topic, idx) => (
            <div key={topic.id} className="rounded-xl border border-[#1a1a1a] bg-[#050505] p-4 hover:border-[#d4f53c]/30 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-xl uppercase tracking-wider text-white">{topic.label}</h4>
                <span className="font-mono text-xs font-bold" style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }}>
                  {topic.count.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topic.keywords.map(kw => (
                  <span key={kw} className="pill-tag !py-0.5 !px-2 !text-[10px]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Trend chart */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
            // TEMPORAL TOPIC VOLUME // TIME SERIES
          </h3>
          <select
            value={topicFilter}
            onChange={e => setTopicFilter(e.target.value)}
            aria-label="Filter topics"
            className="rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
          >
            <option value="all">ALL TOPICS</option>
            {data.topics.map(t => <option key={t.id} value={t.label}>{t.label.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888888', fontFamily: 'Space Mono' }} />
              <YAxis tick={{ fontSize: 10, fill: '#555555', fontFamily: 'Space Mono' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff', fontFamily: 'Space Mono', fontSize: '11px' }}
              />
              {trendTopics.map((topic, i) => (
                <Line
                  key={topic}
                  dataKey={topic}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#d4f53c' }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Spike alerts */}
      {data.spikes.length > 0 && (
        <Card className="p-6 space-y-3 border-l-4 border-l-[#ff8c42]">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#ff8c42] flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            VOLUME ANOMALY & SPIKE ALERTS
          </h3>
          <div className="divide-y divide-[#1a1a1a]">
            {data.spikes.map((spike, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="font-display text-lg uppercase tracking-wider text-white">{spike.topic}</span>
                  <span className="font-mono text-[10px] text-[#555555] ml-3">{spike.date}</span>
                </div>
                <Badge color="#ff4444" className="text-xs font-bold">↑ {spike.increase_pct}% SURGE</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bottom row: Keywords + Category + Urgency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keywords */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
              // KEYWORD SALIENCE
            </h3>
            <select
              value={kwCategoryFilter}
              onChange={e => setKwCategoryFilter(e.target.value)}
              aria-label="Filter keywords by category"
              className="rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
            >
              <option value="all">ALL CATEGORIES</option>
              {allCategories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={keywordData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#1a1a1a" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#555555', fontFamily: 'Space Mono' }} />
                <YAxis dataKey="word" type="category" width={80} tick={{ fontSize: 10, fill: '#888888', fontFamily: 'Space Mono' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff', fontFamily: 'Space Mono', fontSize: '11px' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                  {keywordData.map((d, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Category distribution */}
          <Card className="p-6 space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
              // CATEGORY DISTRIBUTION
            </h3>
            <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.category_distribution}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" />
                  <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#888888', fontFamily: 'Space Mono' }} angle={-15} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 10, fill: '#555555', fontFamily: 'Space Mono' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff', fontFamily: 'Space Mono', fontSize: '11px' }} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={22}>
                    {data.category_distribution.map((d, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Urgency distribution donut */}
          <Card className="p-6 space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
              // URGENCY SPREAD
            </h3>
            <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.urgency_distribution}
                    dataKey="count"
                    nameKey="urgency"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {data.urgency_distribution.map((d, i) => (
                      <Cell key={i} fill={URGENCY_COLORS[d.urgency] ?? CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff', fontFamily: 'Space Mono', fontSize: '11px' }} />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    iconSize={6}
                    formatter={(value: string) => <span className="font-mono text-[10px] uppercase text-[#888888]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
