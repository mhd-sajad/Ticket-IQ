/* ──────────────────────────────────────────
   Triage Page – Ticket analysis & NLP pipeline
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
  if (!entities.length) return <span>{text}</span>;
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((ent, i) => {
    if (ent.start > cursor) {
      parts.push(<span key={`t-${i}`}>{text.slice(cursor, ent.start)}</span>);
    }
    const colors = ENTITY_COLORS[ent.label] ?? { bg: '#e2e8f0', text: '#475569', label: ent.label };
    parts.push(
      <mark
        key={`e-${i}`}
        className="rounded px-1 py-0.5 font-medium text-xs inline-block mx-0.5"
        style={{ backgroundColor: colors.bg, color: colors.text }}
        title={colors.label}
      >
        {text.slice(ent.start, ent.end)}
      </mark>,
    );
    cursor = ent.end;
  });
  if (cursor < text.length) {
    parts.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return <span className="leading-7">{parts}</span>;
}

/* ─── Entity legend ─── */
function EntityLegend() {
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {Object.entries(ENTITY_COLORS).map(([key, val]) => (
        <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: val.bg, border: `1px solid ${val.text}30` }} />
          {val.label}
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
    <p className="text-sm leading-7">
      {tokens.map((token, i) => {
        const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
        const weight = wordMap.get(clean);
        if (weight === undefined) return <span key={i}>{token}</span>;

        const absWeight = Math.min(Math.abs(weight), 0.55);
        const opacity = 0.15 + absWeight * 1.2;
        const color = weight > 0
          ? `rgba(34, 197, 94, ${opacity})`
          : `rgba(239, 68, 68, ${opacity})`;
        return (
          <mark
            key={i}
            className="rounded px-0.5"
            style={{ backgroundColor: color }}
            title={`Weight: ${weight > 0 ? '+' : ''}${weight.toFixed(2)}`}
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
    fill: w.weight > 0 ? '#22c55e' : '#ef4444',
  }));

  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--grid-stroke, #e2e8f0)" />
          <XAxis type="number" domain={[0, 0.6]} tickFormatter={v => `${(v as number).toFixed(1)}`} tick={{ fontSize: 11 }} />
          <YAxis dataKey="word" type="category" width={90} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: any) => Number(v).toFixed(3)}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}
          />
          <Bar dataKey="absWeight" radius={[0, 4, 4, 0]} barSize={14}>
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
    { label: 'Raw Text', data: pipeline.raw, description: 'Original ticket text as submitted' },
    { label: 'Normalized', data: pipeline.normalized, description: 'Lowercased, special characters removed' },
    { label: 'Tokenized', data: pipeline.tokens, description: 'Split into individual tokens' },
    { label: 'Stop Words Removed', data: pipeline.without_stopwords, description: 'Common words filtered out' },
    { label: 'Lemmatized', data: pipeline.lemmas, description: 'Words reduced to base forms' },
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
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0',
              idx < 3 ? 'bg-indigo-500' : idx === 3 ? 'bg-amber-500' : 'bg-emerald-500',
            )}>
              {idx + 1}
            </div>
            {idx < stages.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
          </div>

          <div className="flex-1 pb-4">
            <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{stage.label}</h5>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{stage.description}</p>

            {typeof stage.data === 'string' ? (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 break-words max-h-24 overflow-y-auto">
                {stage.data.slice(0, 400)}{stage.data.length > 400 ? '…' : ''}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {stage.data.map((token, ti) => {
                  const isRemoved = stage.label === 'Tokenized' && removedStopwords.includes(token);
                  const changeInfo = stage.label === 'Lemmatized' && changedLemmas.find(c => c.lemma === token);
                  return (
                    <span
                      key={ti}
                      className={cn(
                        'inline-block rounded-md px-2 py-0.5 text-xs font-mono',
                        isRemoved
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 line-through'
                          : changeInfo
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-300 dark:ring-amber-700'
                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300',
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
      <Card className="p-4 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-900/10">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {state === 'correct' ? 'Thanks! Prediction confirmed as correct.' : 'Feedback submitted — this will help improve the model.'}
        </div>
      </Card>
    );
  }

  const categories = ['Technical', 'Customer Service', 'Billing and Payments', 'Returns and Exchanges'];
  const urgencies = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <Card className="p-4">
      {state === 'idle' && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Was this prediction correct?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setState('correct')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              Yes
            </button>
            <button
              onClick={() => setState('form')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
              No
            </button>
          </div>
        </div>
      )}

      {(state === 'form' || state === 'submitting') && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">What should the correct classification be?</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="corr-category" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Correct Category</label>
              <select
                id="corr-category"
                value={corrCat}
                onChange={e => setCorrCat(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="corr-urgency" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Correct Urgency</label>
              <select
                id="corr-urgency"
                value={corrUrg}
                onChange={e => setCorrUrg(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {urgencies.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setState('idle')}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={state === 'submitting'}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {state === 'submitting' && <Spinner size="sm" />}
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════
   TRIAGE PAGE
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
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Triage" description="Paste a support ticket to get instant NLP-powered classification, urgency assessment, and resolution suggestions." />

      {/* ── Input area ── */}
      <Card className="p-5 space-y-4">
        <label htmlFor="ticket-input" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Support Ticket
        </label>
        <textarea
          id="ticket-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste a support ticket here…"
          rows={5}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y transition-colors"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={() => analyze()}
            disabled={!text.trim() || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-indigo-500/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            {loading ? <Spinner size="sm" /> : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            Analyze
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500">or try a sample ↓</span>
        </div>

        {/* Sample tickets */}
        <div className="flex flex-wrap gap-2">
          {SAMPLE_TICKETS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSample(s)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-400 transition-all"
            >
              Sample {i + 1}: {['Shipping', 'Login', 'Billing', 'Bug', 'Subscription'][i]}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Loading / Error ── */}
      {loading && <LoadingState label="Analyzing ticket…" />}
      {error && <ErrorState message={error} onRetry={() => analyze()} />}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Low-confidence routing banner */}
          {result.needs_review && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color="#f59e0b" className="font-semibold text-xs">
                      Low confidence, human review suggested
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">
                    Either category (&lt; 50%) or urgency (&lt; 45%) fell below the automated triage confidence gate.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToReview}
                disabled={addedToReview}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto disabled:opacity-60"
              >
                {addedToReview ? '✓ Added to review queue' : 'Add to review queue'}
              </button>
            </div>
          )}

          {/* Row 1: Category + Urgency + Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</h3>
              <Badge color={CATEGORY_COLORS[result.category] ?? '#6366f1'} className="text-sm">
                {result.category}
              </Badge>
              <ConfidenceBar value={result.category_confidence} color={CATEGORY_COLORS[result.category]} label="Confidence" />
            </Card>

            {/* Urgency */}
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Urgency</h3>
              <Badge color={URGENCY_COLORS[result.urgency]} className="text-sm">
                {result.urgency}
              </Badge>
              <ConfidenceBar value={result.urgency_confidence} color={URGENCY_COLORS[result.urgency]} label="Confidence" />
            </Card>

            {/* Sentiment */}
            <Card className="p-5 flex flex-col items-center justify-center">
              <Gauge
                value={result.sentiment.score}
                label={`Frustration · ${result.sentiment.label}`}
                color={SENTIMENT_COLORS[result.sentiment.label] ?? '#64748b'}
              />
            </Card>
          </div>

          {/* Entity extraction */}
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Extracted Entities</h3>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <HighlightedText text={result.pipeline.raw} entities={result.entities} />
            </div>
            <EntityLegend />
          </Card>

          {/* Explanation */}
          <Card className="p-5 space-y-5">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Why this prediction?</h3>
            <ExplanationText text={result.pipeline.raw} words={[...result.explanation.category, ...result.explanation.urgency]} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <WordWeightChart words={result.explanation.category} title="Category — contributing words" />
              <WordWeightChart words={result.explanation.urgency} title="Urgency — contributing words" />
            </div>
          </Card>

          {/* Similar tickets */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Similar Tickets</h3>
            <div className="space-y-3">
              {result.similar_tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="rounded-lg border border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-2 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">{ticket.id}</span>
                    <Badge color={CATEGORY_COLORS[ticket.category]}>{ticket.category}</Badge>
                    <span className="text-xs font-semibold" style={{ color: ticket.similarity > 0.85 ? '#ef4444' : '#22c55e' }}>
                      {pct(ticket.similarity, 0)} match
                    </span>
                    {ticket.similarity > 0.85 && (
                      <Badge color="#ef4444" className="animate-pulse">
                        ⚠ Possible Duplicate
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.text}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold">Resolution:</span> {ticket.resolution}
                  </p>
                </div>
              ))}
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
                "p-5 border-l-4 space-y-2",
                isMatch ? "border-l-emerald-500" : isWeak ? "border-l-amber-500" : "border-l-slate-400"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    isMatch ? "text-emerald-600 dark:text-emerald-400" : isWeak ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                  )}>
                    Reply from a similar past ticket
                  </h3>
                  <div className="flex items-center gap-2">
                    {isWeak && (
                      <Badge color="#f59e0b">
                        Weak match ({topPct}%)
                      </Badge>
                    )}
                    {isMatch && (
                      <Badge color="#10b981">
                        Match ({topPct}%)
                      </Badge>
                    )}
                    {!hasReply && (
                      <Badge color="#64748b">
                        Similarity: {topPct}%
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hasReply ? result.suggested_resolution : 'No close match found'}
                </p>
              </Card>
            );
          })()}

          {/* NLP Pipeline */}
          <Collapsible title="NLP Pipeline Stages" className="mt-2">
            <Card className="p-5">
              <PipelineStepper pipeline={result.pipeline} />
            </Card>
          </Collapsible>

          {/* Feedback */}
          <FeedbackBar result={result} />
        </div>
      )}
    </div>
  );
}
