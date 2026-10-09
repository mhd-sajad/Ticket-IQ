/* ──────────────────────────────────────────
   Triage Page – VOID-Inspired Heart Disease Design System
   ────────────────────────────────────────── */
import { useState, useCallback, type ReactNode } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import { predictTicket, submitFeedback, addToReviewQueue } from '../lib/api';
import { SAMPLE_TICKETS } from '../mocks/predict';
import {
  cn, pct, CATEGORY_COLORS, URGENCY_COLORS, ENTITY_COLORS, SENTIMENT_COLORS,
} from '../lib/utils';
import {
  Card, Badge, ConfidenceBar, Gauge, PageHeader, Collapsible,
  Spinner, LoadingState, ErrorState,
} from '../components/ui';
import type { PredictionResponse, Entity } from '../types';

/* ─── Entity-highlighted text ─── */
function HighlightedText({ text, entities }: { text: string; entities: Entity[] }) {
  if (!entities.length) return <span className="text-white/90">{text}</span>;
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((ent, i) => {
    if (ent.start > cursor) {
      parts.push(<span key={`t-${i}`} className="text-white/90">{text.slice(cursor, ent.start)}</span>);
    }
    const colors = ENTITY_COLORS[ent.label] ?? { bg: 'rgba(255,255,255,0.1)', text: '#ffffff', label: ent.label };
    parts.push(
      <mark
        key={`e-${i}`}
        className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold inline-block mx-0.5 border"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: `${colors.text}40`,
        }}
        title={colors.label}
      >
        {text.slice(ent.start, ent.end)}
      </mark>,
    );
    cursor = ent.end;
  });
  if (cursor < text.length) {
    parts.push(<span key="tail" className="text-white/90">{text.slice(cursor)}</span>);
  }

  return <span className="leading-relaxed">{parts}</span>;
}

/* ─── Entity legend ─── */
function EntityLegend() {
  return (
    <div className="flex flex-wrap gap-2.5 mt-4 pt-3 border-t border-[#1a1a1a]">
      {Object.entries(ENTITY_COLORS).map(([key, val]) => (
        <span key={key} className="pill-tag !py-1 !px-2.5 !text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: val.text, boxShadow: `0 0 6px ${val.text}` }} />
          <span>{val.label}</span>
        </span>
      ))}
    </div>
  );
}

/* ─── Explanation word highlighting ─── */
function ExplanationText({ text, words }: { text: string; words: { word: string; weight: number }[] }) {
  const wordMap = new Map(words.map(w => [w.word.toLowerCase(), w.weight]));
  const tokens = text.split(/(\s+)/);

  return (
    <p className="font-body text-sm leading-relaxed text-[#888888]">
      {tokens.map((token, i) => {
        const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
        const weight = wordMap.get(clean);
        if (weight === undefined) return <span key={i} className="text-[#888888]">{token}</span>;

        const absWeight = Math.min(Math.abs(weight), 0.55);
        const opacity = 0.2 + absWeight * 1.4;
        const color = weight > 0
          ? `rgba(212, 245, 60, ${opacity})`
          : `rgba(255, 68, 68, ${opacity})`;
        const textColor = weight > 0 ? '#d4f53c' : '#ff4444';

        return (
          <mark
            key={i}
            className="rounded px-1 py-0.5 font-mono text-xs font-bold inline-block mx-0.5"
            style={{ backgroundColor: color, color: textColor }}
            title={`Feature Weight: ${weight > 0 ? '+' : ''}${weight.toFixed(3)}`}
          >
            {token}
          </mark>
        );
      })}
    </p>
  );
}

/* ─── Contributing words bar chart ─── */
function WordWeightChart({ words, title }: { words: { word: string; weight: number }[]; title: string }) {
  const data = words.slice(0, 10).map(w => ({
    ...w,
    absWeight: Math.abs(w.weight),
    fill: w.weight > 0 ? '#d4f53c' : '#ff4444',
  }));

  return (
    <div className="border border-[#1a1a1a] bg-[#050505] rounded-xl p-4">
      <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#888888] mb-3 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-[#555555]">WEIGHT</span>
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#1a1a1a" />
          <XAxis type="number" domain={[0, 0.6]} tickFormatter={v => `${(v as number).toFixed(1)}`} tick={{ fontSize: 10, fill: '#555555' }} />
          <YAxis dataKey="word" type="category" width={80} tick={{ fontSize: 10, fill: '#888888', fontFamily: 'Space Mono' }} />
          <Tooltip
            formatter={(v: any) => Number(v).toFixed(3)}
            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff', fontFamily: 'Space Mono', fontSize: '11px' }}
          />
          <Bar dataKey="absWeight" radius={[0, 4, 4, 0]} barSize={12}>
            {data.map((d, idx) => <Cell key={idx} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Pipeline stepper ─── */
function PipelineStepper({ pipeline }: { pipeline: PredictionResponse['pipeline'] }) {
  const stages: { label: string; data: string | string[]; description: string }[] = [
    { label: 'Raw Input Text', data: pipeline.raw, description: 'Unprocessed ticket string received at endpoint' },
    { label: 'Normalized', data: pipeline.normalized, description: 'Lowercased, URLs stripped, special characters removed' },
    { label: 'Tokenized Stream', data: pipeline.tokens, description: 'Segmented individual tokens' },
    { label: 'Stop Words Removed', data: pipeline.without_stopwords, description: 'Standard noise words filtered out' },
    { label: 'Lemmatized Base', data: pipeline.lemmas, description: 'Morphological root reduction via spaCy' },
  ];

  const removedStopwords = pipeline.tokens.filter(t => !pipeline.without_stopwords.includes(t));
  const changedLemmas = pipeline.without_stopwords
    .map((w, i) => ({ original: w, lemma: pipeline.lemmas[i] }))
    .filter(p => p.original !== p.lemma);

  return (
    <div className="space-y-4">
      {stages.map((stage, idx) => (
        <div key={idx} className="flex gap-4">
          {/* Stepper line */}
          <div className="flex flex-col items-center">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold shrink-0',
              idx === 4 ? 'bg-[#d4f53c] text-black shadow-[0_0_8px_#d4f53c]' : 'bg-[#111111] text-white border border-[#1a1a1a]',
            )}>
              {idx + 1}
            </div>
            {idx < stages.length - 1 && <div className="w-px flex-1 bg-[#1a1a1a] mt-1" />}
          </div>

          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <h5 className="font-mono text-xs uppercase tracking-wider text-white font-bold">{stage.label}</h5>
              <span className="font-mono text-[10px] text-[#555555]">// {stage.description}</span>
            </div>

            {typeof stage.data === 'string' ? (
              <p className="font-mono text-xs text-[#888888] bg-[#050505] border border-[#1a1a1a] rounded-xl p-3 mt-2 break-words max-h-24 overflow-y-auto">
                {stage.data.slice(0, 400)}{stage.data.length > 400 ? '…' : ''}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {stage.data.map((token, ti) => {
                  const isRemoved = stage.label === 'Tokenized Stream' && removedStopwords.includes(token);
                  const changeInfo = stage.label === 'Lemmatized Base' && changedLemmas.find(c => c.lemma === token);
                  return (
                    <span
                      key={ti}
                      className={cn(
                        'inline-block rounded-md px-2 py-0.5 font-mono text-[11px] border',
                        isRemoved
                          ? 'bg-[#ff4444]/10 text-[#ff4444] border-[#ff4444]/30 line-through'
                          : changeInfo
                            ? 'bg-[#d4f53c]/10 text-[#d4f53c] border-[#d4f53c]/40 font-bold'
                            : 'bg-[#111111] text-[#888888] border-[#1a1a1a]',
                      )}
                      title={changeInfo ? `Changed from "${changeInfo.original}"` : undefined}
                    >
                      {token}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Feedback bar ─── */
function FeedbackBar({ result }: { result: PredictionResponse }) {
  const [state, setState] = useState<'idle' | 'correct' | 'form' | 'submitting' | 'submitted'>('idle');
  const [corrCat, setCorrCat] = useState(result.category);
  const [corrUrg, setCorrUrg] = useState(result.urgency);

  const handleSubmit = async () => {
    setState('submitting');
    try {
      await submitFeedback({
        ticket_id: result.ticket_id,
        text: result.pipeline.raw,
        predicted_category: result.category,
        correct_category: corrCat,
        correct_urgency: corrUrg,
      });
      setState('submitted');
    } catch {
      setState('form');
    }
  };

  if (state === 'correct' || state === 'submitted') {
    return (
      <Card className="p-4 border-[#22c55e]/30 bg-[#22c55e]/10">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#22c55e]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {state === 'correct' ? 'CONFIRMED: Prediction marked correct.' : 'FEEDBACK RECORDED: Stored for continuous model retraining.'}
        </div>
      </Card>
    );
  }

  const categories = ['Technical', 'Customer Service', 'Billing and Payments', 'Returns and Exchanges'];
  const urgencies = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <Card className="p-5 border-[#1a1a1a]">
      {state === 'idle' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#888888]">HUMAN AUDIT // Was this classification accurate?</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setState('correct')}
              className="btn-outline !py-1.5 !px-4 !text-xs !border-[#22c55e]/40 text-[#22c55e] hover:!bg-[#22c55e]/10"
            >
              ✓ ACCURATE
            </button>
            <button
              onClick={() => setState('form')}
              className="btn-outline !py-1.5 !px-4 !text-xs !border-[#ff4444]/40 text-[#ff4444] hover:!bg-[#ff4444]/10"
            >
              ✕ REVISE
            </button>
          </div>
        </div>
      )}

      {(state === 'form' || state === 'submitting') && (
        <div className="space-y-4">
          <h4 className="font-mono text-xs uppercase tracking-wider text-white">SUBMIT HUMAN CORRECTION // RETRAINING QUEUE</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="corr-category" className="block font-mono text-[10px] uppercase tracking-wider text-[#888888] mb-1.5">Correct Category</label>
              <select
                id="corr-category"
                value={corrCat}
                onChange={e => setCorrCat(e.target.value)}
                className="w-full rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="corr-urgency" className="block font-mono text-[10px] uppercase tracking-wider text-[#888888] mb-1.5">Correct Urgency</label>
              <select
                id="corr-urgency"
                value={corrUrg}
                onChange={e => setCorrUrg(e.target.value as any)}
                className="w-full rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
              >
                {urgencies.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setState('idle')}
              className="btn-outline !py-2 !px-4 !text-xs"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={state === 'submitting'}
              className="btn-lime !py-2 !px-5 !text-xs"
            >
              {state === 'submitting' && <Spinner size="sm" />}
              SUBMIT TO RETRAIN POOL
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════
   TRIAGE PAGE — VOID DESIGN SYSTEM
   ═══════════════════════════════════════════ */
export default function TriagePage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [addedToReview, setAddedToReview] = useState(false);

  const analyze = useCallback(async (input?: string) => {
    const ticketText = input ?? text;
    if (!ticketText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAddedToReview(false);
    try {
      const res = await predictTicket(ticketText);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [text]);

  const handleAddToReview = async () => {
    if (!result) return;
    try {
      await addToReviewQueue({
        ticket_id: result.ticket_id,
        text: result.pipeline.raw,
        predicted_category: result.category,
        predicted_urgency: result.urgency,
        confidence: Math.min(result.category_confidence, result.urgency_confidence),
      });
      setAddedToReview(true);
    } catch {
      // ignore
    }
  };

  const handleSample = (sample: string) => {
    setText(sample);
    analyze(sample);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <PageHeader
        eyebrow="NLP TRIAGE ENGINE"
        title="REAL-TIME TICKET TRIAGE & CLASSIFICATION"
        description="Instant support ticket classification, urgency escalation, entity extraction, and TF-IDF similarity retrieval."
      />

      {/* ── Input Card ── */}
      <Card className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <label htmlFor="ticket-input" className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
            // INPUT SUPPORT TICKET TEXT
          </label>
          <span className="font-mono text-[10px] text-[#555555] uppercase">READY FOR INFERENCE</span>
        </div>

        <textarea
          id="ticket-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste or write customer support ticket text here…"
          rows={5}
          className="w-full rounded-xl border border-[#1a1a1a] bg-[#000000] p-4 font-body text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-[#d4f53c] focus:ring-1 focus:ring-[#d4f53c] resize-y transition-all"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => analyze()}
              disabled={!text.trim() || loading}
              className="btn-lime w-full sm:w-auto text-sm"
            >
              {loading ? <Spinner size="sm" /> : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              RUN TRIAGE PIPELINE →
            </button>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#555555]">
            // OR TEST BENCHMARK SAMPLE
          </span>
        </div>

        {/* Sample tickets */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1a1a1a]">
          {SAMPLE_TICKETS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSample(s)}
              className="pill-tag hover:border-[#d4f53c] hover:text-[#d4f53c] transition-all cursor-pointer"
            >
              <span className="dot" />
              <span>{['#1 SHIPPING', '#2 LOGIN ERROR', '#3 BILLING DISPUTE', '#4 HARDWARE BUG', '#5 SUBSCRIPTION'][i]}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Loading / Error ── */}
      {loading && <LoadingState label="RUNNING MULTI-HEAD NLP INFERENCE…" />}
      {error && <ErrorState message={error} onRetry={() => analyze()} />}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-6 animate-in">
          {/* Low-confidence routing banner */}
          {result.needs_review && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#ff8c42]/10 border border-[#ff8c42]/40 text-white">
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color="#ff8c42">LOW CONFIDENCE // HUMAN REVIEW REQUIRED</Badge>
                  </div>
                  <p className="font-body text-xs text-[#888888] mt-1">
                    Either category (&lt; 50%) or urgency (&lt; 45%) fell below automated triage threshold. Routed for human audit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToReview}
                disabled={addedToReview}
                className="btn-outline !text-xs !py-2 !px-4 !border-[#ff8c42]/50 text-[#ff8c42] whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
              >
                {addedToReview ? '✓ QUEUED IN REVIEW' : 'ADD TO REVIEW QUEUE'}
              </button>
            </div>
          )}

          {/* Row 1: Category + Urgency + Frustration Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Category */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">
                  // PREDICTED QUEUE
                </span>
                <span className="font-mono text-[10px] text-[#d4f53c] font-bold">
                  {pct(result.category_confidence)} CONFIDENCE
                </span>
              </div>
              <h3 className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-white">
                {result.category}
              </h3>
              <ConfidenceBar
                value={result.category_confidence}
                color={CATEGORY_COLORS[result.category] ?? '#d4f53c'}
              />
            </Card>

            {/* Urgency */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">
                  // URGENCY TIER
                </span>
                <span className="font-mono text-[10px] text-white font-bold">
                  {pct(result.urgency_confidence)} CONFIDENCE
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h3
                  className="font-display text-4xl lg:text-5xl uppercase tracking-wider"
                  style={{ color: URGENCY_COLORS[result.urgency] ?? '#ffffff' }}
                >
                  {result.urgency}
                </h3>
                {result.urgency === 'Critical' && (
                  <Badge color="#ff4444" className="animate-pulse">ESCALATED</Badge>
                )}
              </div>
              <ConfidenceBar
                value={result.urgency_confidence}
                color={URGENCY_COLORS[result.urgency] ?? '#d4f53c'}
              />
            </Card>

            {/* Sentiment / Frustration */}
            <Card className="p-6 flex flex-col items-center justify-center">
              <Gauge
                value={result.sentiment.score}
                label={`FRUSTRATION · ${result.sentiment.label}`}
                color={SENTIMENT_COLORS[result.sentiment.label] ?? '#d4f53c'}
              />
            </Card>
          </div>

          {/* Entity extraction */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-[#888888]">
                // EXTRACTED NAMED ENTITIES (REGEX RUNTIME)
              </span>
              <span className="font-mono text-[10px] text-[#555555]">{result.entities.length} DETECTED</span>
            </div>
            <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4 text-sm font-body">
              <HighlightedText text={result.pipeline.raw} entities={result.entities} />
            </div>
            <EntityLegend />
          </Card>

          {/* Explanation */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-[#888888]">
                // EXPLAINABILITY // FEATURE IMPORTANCE WEIGHTS
              </span>
              <span className="font-mono text-[10px] text-[#d4f53c]">TF-IDF × COEFFICIENT</span>
            </div>
            <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
              <ExplanationText text={result.pipeline.raw} words={[...result.explanation.category, ...result.explanation.urgency]} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              <WordWeightChart words={result.explanation.category} title="CATEGORY — TOP CONTRIBUTING WORDS" />
              <WordWeightChart words={result.explanation.urgency} title="URGENCY — TOP CONTRIBUTING WORDS" />
            </div>
          </Card>

          {/* Reply from a similar past ticket */}
          {(() => {
            const topSim = result.similar_tickets?.[0]?.similarity ?? 0;
            const topPct = Math.round(topSim * 100);
            const isMatch = topSim >= 0.50;
            const isWeak = topSim >= 0.40 && topSim < 0.50;
            const hasReply = !!result.suggested_resolution;

            return (
              <Card className={cn(
                "p-6 border-l-4 space-y-3",
                isMatch ? "border-l-[#d4f53c]" : isWeak ? "border-l-[#ff8c42]" : "border-l-[#555555]"
              )}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isMatch ? '#d4f53c' : isWeak ? '#ff8c42' : '#888888' }} />
                    REPLY FROM A SIMILAR PAST TICKET
                  </h3>
                  <div className="flex items-center gap-2">
                    {isWeak && <Badge color="#ff8c42">WEAK MATCH ({topPct}%)</Badge>}
                    {isMatch && <Badge color="#d4f53c">MATCH ({topPct}%)</Badge>}
                    {!hasReply && <Badge color="#888888">SIMILARITY: {topPct}%</Badge>}
                  </div>
                </div>
                <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
                  <p className="font-body text-sm text-[#ffffff] leading-relaxed">
                    {hasReply ? result.suggested_resolution : 'No close match found (similarity below threshold).'}
                  </p>
                </div>
              </Card>
            );
          })()}

          {/* Similar tickets */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-[#888888]">
                // NEAREST NEIGHBORS (TF-IDF SPARSE MATRIX COSINE SEARCH)
              </span>
              <span className="font-mono text-[10px] text-[#555555]">16.6K INDEX</span>
            </div>
            <div className="space-y-3">
              {result.similar_tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-[#1a1a1a] bg-[#050505] p-4 space-y-2 hover:border-[#d4f53c]/30 transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{ticket.id}</span>
                      <Badge color={CATEGORY_COLORS[ticket.category]}>{ticket.category}</Badge>
                      {ticket.similarity > 0.85 && (
                        <Badge color="#ff4444" className="animate-pulse">
                          ⚠ BOILERPLATE DUPLICATE
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold" style={{ color: ticket.similarity >= 0.50 ? '#d4f53c' : ticket.similarity >= 0.40 ? '#ff8c42' : '#888888' }}>
                      {pct(ticket.similarity, 0)} SIMILARITY
                    </span>
                  </div>
                  <p className="font-body text-xs text-[#888888]">{ticket.text}</p>
                  <p className="font-body text-xs text-[#ffffff]/80 pt-1 border-t border-[#1a1a1a]/60">
                    <span className="font-mono text-[#d4f53c] text-[10px] uppercase mr-1">RESOLUTION:</span> {ticket.resolution}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* NLP Pipeline */}
          <Collapsible title="VIEW MULTI-STAGE NLP PIPELINE TRANSFORMATION" className="mt-2">
            <PipelineStepper pipeline={result.pipeline} />
          </Collapsible>

          {/* Feedback */}
          <FeedbackBar result={result} />
        </div>
      )}
    </div>
  );
}
