/* ──────────────────────────────────────────
   Model Lab Page – compare models, confusion matrix, try-it box
   ────────────────────────────────────────── */
import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fetchModels, predictWithModel } from '../lib/api';
import { cn, pct } from '../lib/utils';
import { Card, Badge, PageHeader, LoadingState, ErrorState, Spinner } from '../components/ui';
import type { ModelsResponse, ModelPredictResponse } from '../types';

const METRIC_COLORS = { accuracy: '#6366f1', precision: '#06b6d4', recall: '#f59e0b', f1: '#10b981' };

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
    { key: 'name', label: 'Model' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'precision', label: 'Precision' },
    { key: 'recall', label: 'Recall' },
    { key: 'f1', label: 'F1 Score' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {cols.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors',
                  col.key === 'name' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400',
                )}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <svg className={cn('h-3 w-3 transition-transform', sortDir === 'asc' && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
          {sorted.map(model => (
            <tr key={model.name} className={cn('hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors', model.f1 === bestF1 && 'bg-emerald-50/40 dark:bg-emerald-900/10')}>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {model.name}
                {model.f1 === bestF1 && <Badge color="#10b981" className="ml-2">Best</Badge>}
              </td>
              <td className="px-4 py-3 font-mono">{pct(model.accuracy)}</td>
              <td className="px-4 py-3 font-mono">{pct(model.precision)}</td>
              <td className="px-4 py-3 font-mono">{pct(model.recall)}</td>
              <td className="px-4 py-3 font-mono font-bold" style={{ color: model.f1 === bestF1 ? '#10b981' : undefined }}>{pct(model.f1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Confusion matrix heatmap ── */
function ConfusionMatrixView({ matrices, models }: { matrices: ModelsResponse['confusion_matrices']; models: string[] }) {
  const [selectedModel, setSelectedModel] = useState(models[models.length - 1]); // best model
  const cm = matrices[selectedModel];
  if (!cm) return null;

  const maxVal = Math.max(...cm.matrix.flat());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confusion Matrix</h3>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          aria-label="Select model for confusion matrix"
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Column headers */}
          <div className="flex">
            <div className="w-28 shrink-0" />
            {cm.labels.map(label => (
              <div key={label} className="flex-1 min-w-[60px] text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-1 py-2 truncate" title={label}>
                {label.split(' / ')[0]}
              </div>
            ))}
          </div>

          {/* Rows */}
          {cm.matrix.map((row, ri) => (
            <div key={ri} className="flex items-center">
              <div className="w-28 shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pr-2 text-right truncate" title={cm.labels[ri]}>
                {cm.labels[ri].split(' / ')[0]}
              </div>
              {row.map((val, ci) => {
                const intensity = val / maxVal;
                const isDiag = ri === ci;
                return (
                  <div
                    key={ci}
                    className="flex-1 min-w-[60px] aspect-square flex items-center justify-center text-xs font-mono font-bold m-0.5 rounded-md transition-all"
                    style={{
                      backgroundColor: isDiag
                        ? `rgba(99, 102, 241, ${0.15 + intensity * 0.65})`
                        : `rgba(239, 68, 68, ${intensity * 0.4})`,
                      color: intensity > 0.5 ? '#fff' : undefined,
                    }}
                    title={`Actual: ${cm.labels[ri]}, Predicted: ${cm.labels[ci]}: ${val}`}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex items-center mt-2">
            <div className="w-28 shrink-0" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center flex-1">← Predicted →</p>
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
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Per-Class Metrics</h3>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          aria-label="Select model for per-class chart"
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.map(d => ({ ...d, precision: +d.precision.toFixed(3), recall: +d.recall.toFixed(3), f1: +d.f1.toFixed(3) }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke, #e2e8f0)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => pct(v, 0)} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} formatter={(v: any) => pct(Number(v))} />
          <Legend iconType="circle" iconSize={8} />
          <Bar dataKey="precision" fill={METRIC_COLORS.precision} radius={[3, 3, 0, 0]} barSize={14} />
          <Bar dataKey="recall" fill={METRIC_COLORS.recall} radius={[3, 3, 0, 0]} barSize={14} />
          <Bar dataKey="f1" fill={METRIC_COLORS.f1} radius={[3, 3, 0, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
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
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Try It — Compare Models</h3>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter a support ticket to test…"
          rows={3}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          aria-label="Test ticket text"
        />
        <div className="flex flex-col gap-2">
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            aria-label="Select model to test"
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Spinner size="sm" /> : 'Predict'}
          </button>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic max-w-[200px]">
            * MiniLM models disabled for live inference to fit 512MB RAM limits.
          </p>
        </div>
      </div>

      {results && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700/40 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{model}</p>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{results.selected.category}</p>
            <p className="text-sm text-slate-500">Confidence: <span className="font-mono font-semibold">{pct(results.selected.confidence)}</span></p>
          </div>
          <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10 p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{bestModel} <Badge color="#10b981">Best</Badge></p>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{results.best.category}</p>
            <p className="text-sm text-slate-500">Confidence: <span className="font-mono font-semibold">{pct(results.best.confidence)}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MODEL LAB PAGE
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

  if (loading) return <LoadingState label="Loading model data…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const modelNames = data.models.map(m => m.name);
  const bestModel = data.models.reduce((a, b) => a.f1 > b.f1 ? a : b).name;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Model Lab" description="Compare NLP models side-by-side, inspect confusion matrices, and test predictions live." />

      {/* Model table */}
      <Card className="overflow-hidden">
        <ModelTable models={data.models} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion matrix */}
        <Card className="p-5">
          <ConfusionMatrixView matrices={data.confusion_matrices} models={modelNames} />
        </Card>

        {/* Per-class */}
        <Card className="p-5">
          <PerClassChart perClass={data.per_class} models={modelNames} />
        </Card>
      </div>

      {/* Try it */}
      <Card className="p-5">
        <TryItBox models={modelNames} bestModel={bestModel} />
      </Card>
    </div>
  );
}
