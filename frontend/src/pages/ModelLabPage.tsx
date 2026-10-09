/* ──────────────────────────────────────────
   Model Lab Page – VOID-Inspired Heart Disease Design System
   ────────────────────────────────────────── */
import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fetchModels, predictWithModel } from '../lib/api';
import { cn, pct } from '../lib/utils';
import { Card, PageHeader, LoadingState, ErrorState, Spinner } from '../components/ui';
import type { ModelsResponse, ModelPredictResponse } from '../types';

const METRIC_COLORS = {
  accuracy: '#38bdf8',
  precision: '#ff8c42',
  recall: '#c084fc',
  f1: '#d4f53c',
};

/* ── Sortable model table ── */
function ModelTable({ models }: { models: ModelsResponse['models'] }) {
  const [sortKey, setSortKey] = useState<keyof ModelsResponse['models'][0]>('f1');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...models].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [models, sortKey, sortDir]);

  const bestF1 = Math.max(...models.map(m => m.f1));

  const handleSort = (key: keyof ModelsResponse['models'][0]) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const cols: { key: keyof ModelsResponse['models'][0]; label: string }[] = [
    { key: 'name', label: 'Architecture / Model' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'precision', label: 'Precision' },
    { key: 'recall', label: 'Recall' },
    { key: 'f1', label: 'Macro F1' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" role="table">
        <thead>
          <tr className="border-b border-[#1a1a1a] bg-[#050505]">
            {cols.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-5 py-4 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-[#d4f53c]',
                  col.key === 'name' ? 'text-white' : 'text-[#888888]',
                )}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label}
                  {sortKey === col.key && (
                    <svg className={cn('h-3 w-3 text-[#d4f53c] transition-transform', sortDir === 'asc' && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a1a1a]/60">
          {sorted.map(model => (
            <tr key={model.name} className={cn('hover:bg-[#111111]/40 transition-colors', model.f1 === bestF1 && 'bg-[#d4f53c]/5')}>
              <td className="px-5 py-4 font-body text-sm font-semibold text-white whitespace-nowrap">
                {model.name}
                {model.f1 === bestF1 && (
                  <span className="pill-tag ml-3 !py-0.5 !px-2.5 !text-[10px]">
                    <span className="dot" />
                    <span>CHAMPION</span>
                  </span>
                )}
              </td>
              <td className="px-5 py-4 font-mono text-xs text-[#888888]">{pct(model.accuracy)}</td>
              <td className="px-5 py-4 font-mono text-xs text-[#888888]">{pct(model.precision)}</td>
              <td className="px-5 py-4 font-mono text-xs text-[#888888]">{pct(model.recall)}</td>
              <td className="px-5 py-4 font-mono text-sm font-bold" style={{ color: model.f1 === bestF1 ? '#d4f53c' : '#ffffff' }}>
                {pct(model.f1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Confusion matrix heatmap ── */
function ConfusionMatrixView({ matrices, models }: { matrices: ModelsResponse['confusion_matrices']; models: string[] }) {
  const [selectedModel, setSelectedModel] = useState(models[models.length - 1]);
  const cm = matrices[selectedModel];
  if (!cm) return null;

  const maxVal = Math.max(...cm.matrix.flat());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
          // CONFUSION MATRIX
        </h3>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          aria-label="Select model for confusion matrix"
          className="rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
        <div className="inline-block min-w-full">
          {/* Column headers */}
          <div className="flex">
            <div className="w-28 shrink-0" />
            {cm.labels.map(label => (
              <div key={label} className="flex-1 min-w-[65px] text-center font-mono text-[10px] uppercase font-bold text-[#888888] px-1 py-2 truncate" title={label}>
                {label.split(' / ')[0]}
              </div>
            ))}
          </div>

          {/* Rows */}
          {cm.matrix.map((row, ri) => (
            <div key={ri} className="flex items-center">
              <div className="w-28 shrink-0 font-mono text-[10px] uppercase font-bold text-[#888888] pr-3 text-right truncate" title={cm.labels[ri]}>
                {cm.labels[ri].split(' / ')[0]}
              </div>
              {row.map((val, ci) => {
                const intensity = val / maxVal;
                const isDiag = ri === ci;
                return (
                  <div
                    key={ci}
                    className="flex-1 min-w-[65px] aspect-square flex items-center justify-center font-mono text-xs font-bold m-0.5 rounded-lg border border-[#1a1a1a]/80 transition-all hover:scale-105"
                    style={{
                      backgroundColor: isDiag
                        ? `rgba(212, 245, 60, ${0.12 + intensity * 0.75})`
                        : `rgba(255, 68, 68, ${intensity * 0.45})`,
                      color: isDiag ? (intensity > 0.4 ? '#000000' : '#d4f53c') : '#ffffff',
                      boxShadow: isDiag && intensity > 0.6 ? '0 0 10px rgba(212, 245, 60, 0.3)' : undefined,
                    }}
                    title={`True: ${cm.labels[ri]} | Pred: ${cm.labels[ci]} → ${val}`}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex items-center mt-3">
            <div className="w-28 shrink-0" />
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#555555] text-center flex-1">
              ← PREDICTED CLASSES →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Per-class metrics chart ── */
function PerClassChart({ perClass, models }: { perClass: ModelsResponse['per_class']; models: string[] }) {
  const [selectedModel, setSelectedModel] = useState(models[models.length - 1]);
  const data = perClass[selectedModel] ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
          // PER-CLASS BREAKDOWN
        </h3>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          aria-label="Select model for per-class chart"
          className="rounded-xl border border-[#1a1a1a] bg-[#000000] px-3.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.map(d => ({ ...d, precision: +d.precision.toFixed(3), recall: +d.recall.toFixed(3), f1: +d.f1.toFixed(3) }))}>
            <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888888', fontFamily: 'Space Mono' }} angle={-15} textAnchor="end" height={55} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#555555', fontFamily: 'Space Mono' }} tickFormatter={(v: number) => pct(v, 0)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff', fontFamily: 'Space Mono', fontSize: '11px' }}
              formatter={(v: any) => pct(Number(v))}
            />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontFamily: 'Space Mono', fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="precision" fill={METRIC_COLORS.precision} radius={[2, 2, 0, 0]} barSize={12} />
            <Bar dataKey="recall" fill={METRIC_COLORS.recall} radius={[2, 2, 0, 0]} barSize={12} />
            <Bar dataKey="f1" fill={METRIC_COLORS.f1} radius={[2, 2, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Try-it box ── */
function TryItBox({ models, bestModel }: { models: string[]; bestModel: string }) {
  const [text, setText] = useState('');
  const [model, setModel] = useState(models.find(m => !m.includes('MiniLM')) || models[0] || 'TF-IDF + Logistic Regression');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ selected: ModelPredictResponse; best: ModelPredictResponse } | null>(null);

  const handleTry = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const [selected, best] = await Promise.all([
        predictWithModel(model, text),
        predictWithModel(bestModel, text),
      ]);
      setResults({ selected, best });
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#888888] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
          // LIVE INFERENCE COMPARISON // HEAD-TO-HEAD
        </h3>
        <span className="font-mono text-[10px] text-[#555555]">LAZY LOADED</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter ticket text to evaluate selected model vs champion…"
          rows={3}
          className="w-full rounded-xl border border-[#1a1a1a] bg-[#000000] p-3.5 font-body text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-[#d4f53c] resize-y"
          aria-label="Test ticket text"
        />
        <div className="flex flex-col gap-2.5 min-w-[240px]">
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            aria-label="Select model to test"
            className="rounded-xl border border-[#1a1a1a] bg-[#000000] p-2.5 font-mono text-xs text-white focus:outline-none focus:border-[#d4f53c]"
          >
            {models.map(m => {
              const isMiniLM = m.includes('MiniLM');
              return (
                <option
                  key={m}
                  value={m}
                  disabled={isMiniLM}
                  title={isMiniLM ? "Neural MiniLM inference is disabled in the live demo to run within 512 MB RAM limits. Benchmark metrics remain available below." : undefined}
                >
                  {m} {isMiniLM ? '— (Offline in demo)' : ''}
                </option>
              );
            })}
          </select>
          <button
            onClick={handleTry}
            disabled={!text.trim() || loading || model.includes('MiniLM')}
            className="btn-lime !py-2.5 !text-xs !w-full"
          >
            {loading ? <Spinner size="sm" /> : 'RUN COMPARISON →'}
          </button>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#555555]">
            * MiniLM offline in live demo to enforce &lt; 350 MB host cap.
          </p>
        </div>
      </div>

      {results && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="rounded-2xl border border-[#1a1a1a] bg-[#050505] p-5 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#888888]">{model}</p>
            <p className="font-display text-3xl uppercase tracking-wider text-white">{results.selected.category}</p>
            <p className="font-mono text-xs text-[#888888]">CONFIDENCE: <span className="text-white font-bold">{pct(results.selected.confidence)}</span></p>
          </div>
          <div className="rounded-2xl border border-[#d4f53c]/40 bg-[#d4f53c]/5 p-5 space-y-2 shadow-[0_0_20px_rgba(212,245,60,0.1)]">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#d4f53c]">{bestModel}</p>
              <span className="pill-tag !py-0.5 !px-2 !text-[9px]"><span className="dot" /><span>TOP</span></span>
            </div>
            <p className="font-display text-3xl uppercase tracking-wider text-[#d4f53c]">{results.best.category}</p>
            <p className="font-mono text-xs text-[#888888]">CONFIDENCE: <span className="text-white font-bold">{pct(results.best.confidence)}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MODEL LAB PAGE — VOID DESIGN SYSTEM
   ═══════════════════════════════════════════ */
export default function ModelLabPage() {
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="FETCHING ARCHITECTURAL BENCHMARKS…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const modelNames = data.models.map(m => m.name);
  const bestModel = data.models.reduce((a, b) => a.f1 > b.f1 ? a : b).name;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <PageHeader
        eyebrow="BENCHMARK LABORATORY"
        title="NLP MODEL COMPARISON & ARCHITECTURAL METRICS"
        description="Comprehensive evaluation across 4-class Category and 3-class Urgency heads on deduplicated test data."
      />

      {/* Model table */}
      <Card className="overflow-hidden p-0">
        <ModelTable models={data.models} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion matrix */}
        <Card className="p-6">
          <ConfusionMatrixView matrices={data.confusion_matrices} models={modelNames} />
        </Card>

        {/* Per-class */}
        <Card className="p-6">
          <PerClassChart perClass={data.per_class} models={modelNames} />
        </Card>
      </div>

      {/* Try it */}
      <Card className="p-6">
        <TryItBox models={modelNames} bestModel={bestModel} />
      </Card>
    </div>
  );
}
