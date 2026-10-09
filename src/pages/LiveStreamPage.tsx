/* ──────────────────────────────────────────
   Live Stream Page – VOID-Inspired Heart Disease Design System
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
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!ticket) return null;

  const { prediction } = ticket;
  const catColor = CATEGORY_COLORS[prediction.category] ?? '#d4f53c';
  const urgColor = URGENCY_COLORS[prediction.urgency] ?? '#d4f53c';
  const sentColor = SENTIMENT_COLORS[prediction.sentiment.label] ?? '#888888';

  const handleCopy = () => {
    if (prediction.suggested_resolution) {
      navigator.clipboard.writeText(prediction.suggested_resolution);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderHighlighted = () => {
    const raw = prediction.pipeline.raw;
    if (!prediction.entities.length) return <p className="font-body text-sm text-[#888888]">{raw}</p>;

    const sorted = [...prediction.entities].sort((a, b) => a.start - b.start);
    const elements = [];
    let cur = 0;

    sorted.forEach((e, idx) => {
      if (e.start > cur) {
        elements.push(<span key={`t-${idx}`} className="text-[#888888]">{raw.slice(cur, e.start)}</span>);
      }
      const c = ENTITY_COLORS[e.label] ?? { bg: 'rgba(255,255,255,0.1)', text: '#ffffff', label: e.label };
      elements.push(
        <mark
          key={`m-${idx}`}
          className="rounded px-1.5 py-0.5 font-mono text-xs font-bold border"
          style={{ backgroundColor: c.bg, color: c.text, borderColor: `${c.text}40` }}
          title={c.label}
        >
          {raw.slice(e.start, e.end)}
        </mark>
      );
      cur = e.end;
    });

    if (cur < raw.length) {
      elements.push(<span key="tail" className="text-[#888888]">{raw.slice(cur)}</span>);
    }

    return <p className="font-body text-sm leading-relaxed">{elements}</p>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-xl bg-[#000000] border-l border-[#1a1a1a] flex flex-col shadow-2xl animate-in"
        >
          {/* Header */}
          <div className="h-20 shrink-0 px-6 border-b border-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl tracking-wider text-white">{ticket.id}</span>
              <span className="pill-tag !py-0.5 !px-2.5 !text-[10px]">
                <span className="dot" />
                <span>INSPECT</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] text-[#888888] hover:text-white hover:border-[#d4f53c] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Ticket Text */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">
                // TICKET CONTENT & NAMED ENTITIES
              </span>
              <div className="p-4 rounded-xl bg-[#050505] border border-[#1a1a1a]">
                {renderHighlighted()}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#888888]">
                  CATEGORY
                </span>
                <p className="font-display text-2xl uppercase tracking-wider text-white">
                  {prediction.category}
                </p>
                <ConfidenceBar value={prediction.category_confidence} color={catColor} />
              </Card>

              <Card className="p-4 space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#888888]">
                  URGENCY
                </span>
                <p className="font-display text-2xl uppercase tracking-wider" style={{ color: urgColor }}>
                  {prediction.urgency}
                </p>
                <ConfidenceBar value={prediction.urgency_confidence} color={urgColor} />
              </Card>

              <Card className="p-4 flex flex-col items-center justify-center">
                <Gauge value={prediction.sentiment.score} label={prediction.sentiment.label} color={sentColor} />
              </Card>
            </div>

            {/* Extracted Entities List */}
            {prediction.entities.length > 0 && (
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">
                  // EXTRACTED ENTITIES ({prediction.entities.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {prediction.entities.map((e, idx) => {
                    const c = ENTITY_COLORS[e.label] ?? { bg: 'rgba(255,255,255,0.1)', text: '#ffffff', label: e.label };
                    return (
                      <span
                        key={idx}
                        className="pill-tag !py-1 !px-2.5 !text-[11px]"
                        style={{ borderColor: `${c.text}40` }}
                      >
                        <span className="font-bold mr-1" style={{ color: c.text }}>{e.label}:</span>
                        <span className="text-white">{e.text}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Suggested Auto-Reply */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">
                  // AI AUTO-RESOLUTION RECOMMENDATION
                </span>
                <button
                  onClick={handleCopy}
                  className="font-mono text-xs text-[#d4f53c] hover:underline"
                >
                  {copied ? '✓ COPIED' : 'COPY RESPONSE'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-[#050505] border border-[#1a1a1a] font-body text-xs text-[#ffffff]/90 leading-relaxed">
                {prediction.suggested_resolution || 'No close match found'}
              </div>
            </div>

            {/* Pipeline tokens */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">
                // NLP TOKENIZATION STREAM
              </span>
              <div className="p-3 rounded-xl bg-[#050505] border border-[#1a1a1a] font-mono text-xs overflow-x-auto space-y-1 text-[#888888]">
                <div>
                  <span className="text-[#d4f53c] font-bold">TOKENS: </span>
                  {prediction.pipeline.tokens.slice(0, 16).join(', ')}...
                </div>
                <div>
                  <span className="text-white font-bold">LEMMAS: </span>
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
   LIVE STREAM PAGE — VOID DESIGN SYSTEM
   ═══════════════════════════════════════════ */
export default function LiveStreamPage() {
  const [tickets, setTickets] = useState<StreamTicket[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMs, setSpeedMs] = useState<number>(3000);
  const [totalProcessed, setTotalProcessed] = useState<number>(1042);
  const [selectedTicket, setSelectedTicket] = useState<StreamTicket | null>(null);

  const [search, setSearch] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [urgFilter, setUrgFilter] = useState<string>('ALL');

  const counterRef = useRef(150);

  const generateTicket = (): StreamTicket => {
    counterRef.current += 1;
    const templateIdx = Math.floor(Math.random() * SEED_TEMPLATES.length);
    const template = SEED_TEMPLATES[templateIdx];
    const pred = getMockPrediction(template.text);
    const id = `TCK-${counterRef.current}`;

    return {
      id,
      timestamp: new Date(),
      latencyMs: Math.floor(25 + Math.random() * 22),
      prediction: { ...pred, ticket_id: id },
    };
  };

  useEffect(() => {
    const initial = SEED_TEMPLATES.slice(0, 6).map((tpl, i) => {
      const pred = getMockPrediction(tpl.text);
      const id = `TCK-${100 + i}`;
      return {
        id,
        timestamp: new Date(Date.now() - (6 - i) * 6000),
        latencyMs: Math.floor(28 + Math.random() * 15),
        prediction: { ...pred, ticket_id: id },
      };
    });
    setTickets(initial.reverse());
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const next = generateTicket();
      setTickets(prev => [next, ...prev.slice(0, 49)]);
      setTotalProcessed(prev => prev + 1);
    }, speedMs);
    return () => clearInterval(interval);
  }, [isPlaying, speedMs]);

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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="REAL-TIME EVENT BUS"
          title="LIVE TICKET STREAM & INFERENCE MONITOR"
          description="Continuous ingestion stream evaluated through the optimized high-speed TF-IDF triage pipeline."
        />

        {/* Live Controls */}
        <div className="flex items-center gap-3">
          <div className="pill-tag">
            <span className={cn('dot', !isPlaying && '!bg-[#ff8c42] !shadow-[0_0_6px_#ff8c42]')} />
            <span>{isPlaying ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}</span>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(isPlaying ? 'btn-outline !py-2 !px-4 !text-xs' : 'btn-lime !py-2 !px-4 !text-xs')}
          >
            {isPlaying ? 'PAUSE STREAM' : 'RESUME STREAM'}
          </button>

          <select
            value={speedMs}
            onChange={e => setSpeedMs(Number(e.target.value))}
            className="rounded-xl border border-[#1a1a1a] bg-[#000000] px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
          >
            <option value={1500}>FAST (1.5s)</option>
            <option value={3000}>NORMAL (3.0s)</option>
            <option value={5000}>SLOW (5.0s)</option>
          </select>
        </div>
      </div>

      {/* Stats Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <Card className="p-6 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">// TOTAL PROCESSED</p>
          <p className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-[#d4f53c]">
            {totalProcessed}
          </p>
          <p className="font-mono text-[10px] text-[#555555] uppercase">SESSION VOLUME</p>
        </Card>

        <Card className="p-6 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">// PIPELINE LATENCY</p>
          <p className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-white">
            {stats.avgLatency}<span className="text-xl ml-1 text-[#888888]">ms</span>
          </p>
          <p className="font-mono text-[10px] text-[#555555] uppercase">TF-IDF DOT PRODUCT</p>
        </Card>

        <Card className="p-6 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">// DOMINANT QUEUE</p>
          <p className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-white truncate">
            {stats.topCat}
          </p>
          <p className="font-mono text-[10px] text-[#555555] uppercase">STREAM CONCENTRATION</p>
        </Card>

        <Card className="p-6 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">// HIGH / CRITICAL</p>
          <p className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-[#ff4444]">
            {stats.critPct}%
          </p>
          <p className="font-mono text-[10px] text-[#555555] uppercase">ESCALATED RATE</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search incoming stream by Ticket ID, order code, keyword…"
              className="w-full rounded-xl border border-[#1a1a1a] bg-[#000000] px-4 py-2 font-body text-xs text-white placeholder:text-[#555555] focus:outline-none focus:border-[#d4f53c]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 font-mono text-xs text-[#888888] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
            >
              {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>

            <select
              value={urgFilter}
              onChange={e => setUrgFilter(e.target.value)}
              className="rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
            >
              {urgencies.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Ticket Stream Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[#888888] px-1">
          <span>// INCOMING STREAM ({filteredTickets.length} TICKETS)</span>
          <span className="text-[#555555]">// CLICK CARD FOR INSPECTION DRAWER</span>
        </div>

        {filteredTickets.length === 0 ? (
          <EmptyState
            title="NO MATCHING TICKETS IN STREAM"
            description="Adjust search filters or wait for upcoming tickets in the feed."
            actionLabel="RESET FILTERS"
            onAction={() => {
              setSearch('');
              setCatFilter('ALL');
              setUrgFilter('ALL');
            }}
          />
        ) : (
          <div className="space-y-3">
            {filteredTickets.map(t => {
              const catColor = CATEGORY_COLORS[t.prediction.category] ?? '#d4f53c';
              const urgColor = URGENCY_COLORS[t.prediction.urgency] ?? '#d4f53c';
              const sentColor = SENTIMENT_COLORS[t.prediction.sentiment.label] ?? '#888888';

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="group relative rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-5 transition-all duration-200 hover:border-[#d4f53c]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] cursor-pointer overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: urgColor }}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5 pl-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        {t.id}
                      </span>
                      <Badge color={catColor}>{t.prediction.category}</Badge>
                      <Badge color={urgColor}>{t.prediction.urgency}</Badge>
                      <span className="font-mono text-[10px] text-[#888888] bg-[#111111] border border-[#1a1a1a] px-2 py-0.5 rounded-full">
                        {t.latencyMs}ms
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-[#888888]">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: sentColor, boxShadow: `0 0 4px ${sentColor}` }}
                        />
                        {t.prediction.sentiment.label.toUpperCase()} ({pct(t.prediction.sentiment.score)})
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
                  <p className="font-body text-xs text-[#888888] line-clamp-2 pl-2">
                    {t.prediction.pipeline.raw}
                  </p>

                  {/* Entities tags */}
                  {t.prediction.entities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-2 pt-2 border-t border-[#1a1a1a]/60">
                      {t.prediction.entities.slice(0, 4).map((ent, idx) => {
                        const c = ENTITY_COLORS[ent.label] ?? { bg: 'rgba(255,255,255,0.1)', text: '#ffffff', label: ent.label };
                        return (
                          <span
                            key={idx}
                            className="pill-tag !py-0.5 !px-2 !text-[10px]"
                            style={{ borderColor: `${c.text}30` }}
                          >
                            <span className="font-bold mr-1" style={{ color: c.text }}>{ent.label}:</span>
                            <span className="text-white">{ent.text}</span>
                          </span>
                        );
                      })}
                      {t.prediction.entities.length > 4 && (
                        <span className="font-mono text-[10px] text-[#555555]">
                          +{t.prediction.entities.length - 4} MORE
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
