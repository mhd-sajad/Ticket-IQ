/* ──────────────────────────────────────────
   Review Queue Page
   ────────────────────────────────────────── */
import { useEffect, useState } from 'react';
import { fetchReviewQueue, triggerRetrain } from '../lib/api';
import { cn, pct, formatDateTime, CATEGORY_COLORS, URGENCY_COLORS } from '../lib/utils';
import { Card, Badge, PageHeader, LoadingState, ErrorState, EmptyState, Spinner } from '../components/ui';
import type { ReviewItem, RetrainResult } from '../types';

/* ═══════════════════════════════════════════ */
export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<RetrainResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'used_for_retraining'>('all');

  useEffect(() => {
    fetchReviewQueue()
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const result = await triggerRetrain();
      setRetrainResult(result);
      fetchReviewQueue().then(setItems);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Retrain failed');
    } finally {
      setRetraining(false);
    }
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  if (loading) return <LoadingState label="Loading review queue…" />;
  if (error && !items.length) return <ErrorState message={error} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Review Queue" description="Low-confidence and agent-corrected tickets for review and model retraining." />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'used_for_retraining'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40',
              )}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Used for Retraining'}
              <span className="ml-1.5 rounded-full bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 text-[10px] font-bold">
                {f === 'all' ? items.length : items.filter(i => i.status === f).length}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {retraining ? (
            <>
              <Spinner size="sm" />
              Retraining…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retrain Model
            </>
          )}
        </button>
      </div>

      {/* Retrain result */}
      {retrainResult && (
        <Card className="p-5 border-l-4 border-l-emerald-500 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Retraining {retrainResult.status}!
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                F1 Score: <span className="font-mono">{pct(retrainResult.f1_before)}</span>
                <span className="mx-2">→</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{pct(retrainResult.f1_after)}</span>
                <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  (+{((retrainResult.f1_after - retrainResult.f1_before) * 100).toFixed(1)} pp)
                </span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="No items in this filter" description="All tickets have been processed or none match the current filter." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Predicted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Corrected</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">{item.text}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <Badge color={CATEGORY_COLORS[item.predicted_category]}>{item.predicted_category}</Badge>
                        <div>
                          <Badge color={URGENCY_COLORS[item.predicted_urgency]}>{item.predicted_urgency}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.corrected_category ? (
                        <div className="space-y-1">
                          <Badge color={CATEGORY_COLORS[item.corrected_category]}>{item.corrected_category}</Badge>
                          {item.corrected_urgency && (
                            <div>
                              <Badge color={URGENCY_COLORS[item.corrected_urgency]}>{item.corrected_urgency}</Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn(
                        'font-mono text-sm font-semibold',
                        item.confidence < 0.5 ? 'text-red-500' : 'text-amber-500',
                      )}>
                        {pct(item.confidence, 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        color={item.status === 'pending' ? '#f59e0b' : '#10b981'}
                        className="capitalize"
                      >
                        {item.status === 'used_for_retraining' ? 'Retrained' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
