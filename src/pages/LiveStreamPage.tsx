/* ──────────────────────────────────────────
   Live Stream Page – Simulated real-time tickets
   ────────────────────────────────────────── */
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card, Badge, ConfidenceBar, Gauge, PageHeader, EmptyState,
} from '../components/ui';
import {
  cn, pct, CATEGORY_COLORS, URGENCY_COLORS, ENTITY_COLORS, SENTIMENT_COLORS,
} from '../lib/utils';
import { getMockPrediction } from '../mocks/predict';
import type { PredictionResponse } from '../types';

/* ── Initial ticket seed pool ── */
interface StreamTicket {
  id: string;
  timestamp: Date;
  latencyMs: number;
  prediction: PredictionResponse;
}

const SEED_TEMPLATES = [
  {
    text: `I placed order #ORD-99120 for UltraClean Robot Vacuum ($499.00) on Oct 4 but the package never arrived. Tracking says delivered to my porch, but nothing is here. Please investigate or issue a replacement immediately.`,
  },
  {
    text: `Cannot log in to my company account on workspace-team.com. Keeps throwing ERR_AUTH_403 invalid token. My email is admin@fintech.io and our whole team is locked out. Urgent!`,
  },
  {
    text: `My invoice INV-88219 has an overcharge of $280.00 for services not rendered. I asked our rep last week and got no response. Please credit this back to our corporate card.`,
  },
  {
    text: `The latest firmware update v4.1.2 on our Pro Camera broke the RTSP streaming feed. It crashes with error ERR_STREAM_FAIL every 2 minutes. Need immediate rollback instructions.`,
  },
  {
    text: `I would like to cancel our Enterprise annual subscription ($1,200.00/yr) effective immediately and get a refund for the remaining 6 months. Account ID ACC-9021.`,
  },
  {
    text: `Hello, can you help me update the billing address on our account? Our company relocated to 742 Evergreen Terrace. Order #ORD-6612 is pending delivery.`,
  },
  {
    text: `Urgent security inquiry: received an unexpected password reset confirmation for user sarah@company.com at 03:00 UTC. We suspect an unauthorized login attempt!`,
  },
  {
    text: `The exported CSV reports are missing columns for 'Tax' and 'Discount'. Error EXPORT_TIMEOUT occurs whenever filtering by date range greater than 90 days.`,
  },
  {
    text: `Double billed for order #ORD-77412 on October 1st. My credit card statement shows two identical charges of $89.50 each. Kindly reverse the duplicate transaction.`,
  },
  {
    text: `Our API integration is returning HTTP 504 Gateway Timeout on the /v1/transactions webhook endpoint. We are losing webhook events in production!`,
  },
];

/* ── Slide-over drawer for ticket breakdown ── */
function SlideOverDrawer({
  ticket,
  onClose,
}: {
  ticket: StreamTicket | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!ticket) return null;
  const { prediction } = ticket;

  const handleCopy = () => {
    if (prediction.suggested_resolution) {
      navigator.clipboard.writeText(prediction.suggested_resolution);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* Inline entities */
  const renderHighlighted = () => {
    const text = prediction.pipeline.raw;
    const ents = [...prediction.entities].sort((a, b) => a.start - b.start);
    if (!ents.length) return <p className="text-sm leading-relaxed">{text}</p>;

    const parts: React.ReactNode[] = [];
    let cur = 0;
    ents.forEach((ent, i) => {
      if (ent.start > cur) {
        parts.push(<span key={`txt-${i}`}>{text.slice(cur, ent.start)}</span>);
      }
      const c = ENTITY_COLORS[ent.label] ?? { bg: '#e2e8f0', text: '#334155', label: ent.label };
      parts.push(
        <mark
          key={`mark-${i}`}
          className="rounded px-1.5 py-0.5 font-medium text-xs inline-block mx-0.5"
          style={{ backgroundColor: c.bg, color: c.text }}
          title={c.label}
        >
          {ent.text}
          <span className="ml-1 text-[10px] opacity-75 uppercase font-mono font-bold">
            [{ent.label}]
          </span>
        </mark>
      );
      cur = ent.end;
    });
    if (cur < text.length) {
      parts.push(<span key="tail">{text.slice(cur)}</span>);
    }
    return <p className="text-sm leading-relaxed">{parts}</p>;
  };

  const catColor = CATEGORY_COLORS[prediction.category] ?? '#6366f1';
  const urgColor = URGENCY_COLORS[prediction.urgency] ?? '#6366f1';
  const sentColor = SENTIMENT_COLORS[prediction.sentiment.label] ?? '#6366f1';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {ticket.id}
                </span>
                <span className="text-xs text-slate-400">
                  {ticket.latencyMs}ms inference
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                NLP Triage Deep-Dive
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Ticket Text */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ticket Content & Named Entities
              </span>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                {renderHighlighted()}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 space-y-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Predicted Category
                </span>
                <div className="flex items-center gap-2">
                  <Badge color={catColor}>{prediction.category}</Badge>
                </div>
                <ConfidenceBar value={prediction.category_confidence} color={catColor} />
              </Card>

              <Card className="p-4 space-y-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Urgency Level
                </span>
                <div className="flex items-center gap-2">
                  <Badge color={urgColor}>{prediction.urgency}</Badge>
                </div>
                <ConfidenceBar value={prediction.urgency_confidence} color={urgColor} />
              </Card>

              <Card className="p-4 flex flex-col items-center justify-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Sentiment / Frustration
                </span>
                <Gauge value={prediction.sentiment.score} label={prediction.sentiment.label} color={sentColor} />
              </Card>
            </div>

            {/* Extracted Entities List */}
            {prediction.entities.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Extracted Entities ({prediction.entities.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {prediction.entities.map((e, idx) => {
                    const c = ENTITY_COLORS[e.label] ?? { bg: '#f1f5f9', text: '#334155', label: e.label };
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200/60 dark:border-slate-700/60"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        <span className="font-bold opacity-75">{e.label}:</span>
                        <span>{e.text}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Suggested Auto-Reply */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  AI Suggested Auto-Reply
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  {copied ? '✓ Copied to clipboard' : 'Copy Response'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-sm text-slate-700 dark:text-slate-300">
                {prediction.suggested_resolution || 'No close match found'}
              </div>
            </div>

            {/* Pipeline tokens */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                NLP Tokenization Pipeline
              </span>
              <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto space-y-1.5">
                <div>
                  <span className="text-indigo-400 font-bold">TOKENS: </span>
                  {prediction.pipeline.tokens.slice(0, 16).join(', ')}...
                </div>
                <div>
                  <span className="text-emerald-400 font-bold">LEMMAS: </span>
                  {prediction.pipeline.lemmas.slice(0, 16).join(', ')}...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Live Stream Page
   ═══════════════════════════════════════════ */
export default function LiveStreamPage() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMs, setSpeedMs] = useState(3000);
  const [tickets, setTickets] = useState<StreamTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<StreamTicket | null>(null);

  /* Filters */
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [urgFilter, setUrgFilter] = useState('ALL');

  /* Stats */
  const [totalProcessed, setTotalProcessed] = useState(24);
  const counterRef = useRef(100);

  /* Helper to generate a new live ticket */
  const generateTicket = () => {
    counterRef.current += 1;
    const template = SEED_TEMPLATES[Math.floor(Math.random() * SEED_TEMPLATES.length)];
    const pred = getMockPrediction(template.text);
    const id = `TCK-${counterRef.current}`;
    const latency = Math.floor(32 + Math.random() * 24);

    return {
      id,
      timestamp: new Date(),
      latencyMs: latency,
      prediction: {
        ...pred,
        ticket_id: id,
      },
    };
  };

  /* Initialize seed stream on mount */
  useEffect(() => {
    const initial = SEED_TEMPLATES.slice(0, 6).map((tpl, i) => {
      const pred = getMockPrediction(tpl.text);
      const id = `TCK-${100 + i}`;
      return {
        id,
        timestamp: new Date(Date.now() - (6 - i) * 6000),
        latencyMs: Math.floor(34 + Math.random() * 18),
        prediction: { ...pred, ticket_id: id },
      };
    });
    setTickets(initial.reverse());
  }, []);

  /* Stream Interval */
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const next = generateTicket();
      setTickets(prev => [next, ...prev.slice(0, 49)]); // keep latest 50
      setTotalProcessed(prev => prev + 1);
    }, speedMs);

    return () => clearInterval(interval);
  }, [isPlaying, speedMs]);

  /* Computed filtered stream */
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch =
        !search ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.prediction.pipeline.raw.toLowerCase().includes(search.toLowerCase());

      const matchesCat = catFilter === 'ALL' || t.prediction.category === catFilter;
      const matchesUrg = urgFilter === 'ALL' || t.prediction.urgency === urgFilter;

      return matchesSearch && matchesCat && matchesUrg;
    });
  }, [tickets, search, catFilter, urgFilter]);

  /* Aggregate stats */
  const stats = useMemo(() => {
    const avgLatency = Math.round(
      tickets.reduce((acc, t) => acc + t.latencyMs, 0) / (tickets.length || 1)
    );
    const catCounts: Record<string, number> = {};
    tickets.forEach(t => {
      catCounts[t.prediction.category] = (catCounts[t.prediction.category] || 0) + 1;
    });
    let topCat = 'Billing';
    let maxCount = 0;
    Object.entries(catCounts).forEach(([c, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        topCat = c;
      }
    });
    const critCount = tickets.filter(t => t.prediction.urgency === 'Critical' || t.prediction.urgency === 'High').length;
    const critPct = Math.round((critCount / (tickets.length || 1)) * 100);

    return { avgLatency, topCat, critPct };
  }, [tickets]);

  const categories = ['ALL', 'Technical', 'Customer Service', 'Billing and Payments', 'Returns and Exchanges'];
  const urgencies: string[] = ['ALL', 'Critical', 'High', 'Medium', 'Low'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Live Ticket Stream"
            description="Real-time simulated incoming support ticket queue triaged through the NLP inference pipeline."
          />
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  'relative inline-flex rounded-full h-2.5 w-2.5',
                  isPlaying ? 'bg-emerald-500' : 'bg-amber-500'
                )}
              />
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isPlaying ? 'Streaming Active' : 'Paused'}
            </span>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all',
              isPlaying
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            )}
          >
            {isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pause Stream
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Resume Stream
              </>
            )}
          </button>

          <select
            value={speedMs}
            onChange={e => setSpeedMs(Number(e.target.value))}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value={1500}>Fast (1.5s)</option>
            <option value={3000}>Normal (3.0s)</option>
            <option value={5000}>Slow (5.0s)</option>
          </select>
        </div>
      </div>

      {/* Stats Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Processed
          </p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {totalProcessed}
          </p>
          <p className="text-[11px] text-slate-400">Live session counter</p>
        </Card>

        <Card className="p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Avg Inference Latency
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.avgLatency} ms
          </p>
          <p className="text-[11px] text-slate-400">DistilBERT + ONNX runtime</p>
        </Card>

        <Card className="p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Top Category Today
          </p>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 truncate">
            {stats.topCat}
          </p>
          <p className="text-[11px] text-slate-400">Most frequent volume</p>
        </Card>

        <Card className="p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            High / Critical Ratio
          </p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {stats.critPct}%
          </p>
          <p className="text-[11px] text-slate-400">Escalation threshold &gt; 80%</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search live stream by ID or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Category:</span>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Urgency:</span>
            <select
              value={urgFilter}
              onChange={e => setUrgFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {urgencies.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Ticket Stream Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
          <span>INCOMING STREAM ({filteredTickets.length} TICKETS)</span>
          <span className="text-[11px] font-normal text-slate-400">Click any card to open NLP deep-dive drawer</span>
        </div>

        {filteredTickets.length === 0 ? (
          <EmptyState
            title="No matching tickets"
            description="Try clearing search filters or wait for upcoming tickets in the stream."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearch('');
              setCatFilter('ALL');
              setUrgFilter('ALL');
            }}
          />
        ) : (
          <div className="space-y-3">
            {filteredTickets.map(t => {
              const catColor = CATEGORY_COLORS[t.prediction.category] ?? '#6366f1';
              const urgColor = URGENCY_COLORS[t.prediction.urgency] ?? '#6366f1';
              const sentColor = SENTIMENT_COLORS[t.prediction.sentiment.label] ?? '#6366f1';

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="group relative rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 transition-all duration-200 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600/60 cursor-pointer overflow-hidden"
                >
                  {/* Subtle left accent border by category */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                    style={{ backgroundColor: urgColor }}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pl-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {t.id}
                      </span>
                      <Badge color={catColor}>{t.prediction.category}</Badge>
                      <Badge color={urgColor}>{t.prediction.urgency}</Badge>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                        {t.latencyMs}ms
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: sentColor }}
                        />
                        {t.prediction.sentiment.label} ({pct(t.prediction.sentiment.score)})
                      </span>
                      <span>
                        {new Intl.DateTimeFormat('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }).format(t.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Ticket Snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 pl-2">
                    {t.prediction.pipeline.raw}
                  </p>

                  {/* Entities tags */}
                  {t.prediction.entities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-2">
                      {t.prediction.entities.slice(0, 4).map((ent, idx) => {
                        const c = ENTITY_COLORS[ent.label] ?? { bg: '#f1f5f9', text: '#475569', label: ent.label };
                        return (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-0.5 rounded"
                            style={{ backgroundColor: c.bg, color: c.text }}
                          >
                            {ent.text}
                          </span>
                        );
                      })}
                      {t.prediction.entities.length > 4 && (
                        <span className="text-[10px] text-slate-400">
                          +{t.prediction.entities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over Drawer */}
      <SlideOverDrawer ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </div>
  );
}
