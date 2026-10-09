/* ──────────────────────────────────────────
   Review Queue Page – VOID-Inspired Heart Disease Design System
   ────────────────────────────────────────── */
import { useEffect, useState } from 'react';
import { fetchReviewQueue, triggerRetrain } from '../lib/api';
import { cn, pct, formatDateTime, CATEGORY_COLORS, URGENCY_COLORS } from '../lib/utils';
import { Card, Badge, PageHeader, LoadingState, ErrorState, EmptyState, Spinner } from '../components/ui';
import type { ReviewItem, RetrainResult } from '../types';

/* ═══════════════════════════════════════════
   REVIEW QUEUE PAGE — VOID DESIGN SYSTEM
   ═══════════════════════════════════════════ */
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

  if (loading) return <LoadingState label="FETCHING ACTIVE AUDIT QUEUE…" />;
  if (error && !items.length) return <ErrorState message={error} />;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <PageHeader
        eyebrow="HUMAN-IN-THE-LOOP"
        title="REVIEW QUEUE & ACTIVE RETRAINING ENGINE"
        description="Ambiguous low-confidence tickets (&lt; 50% Category or &lt; 45% Urgency) and agent-corrected records."
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'used_for_retraining'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'pill-tag !py-1.5 !px-3.5 transition-all cursor-pointer',
                filter === f
                  ? '!border-[#d4f53c] !text-[#d4f53c] !bg-[#111111] shadow-[0_0_10px_rgba(212,245,60,0.15)]'
                  : 'hover:text-white',
              )}
            >
              <span className={cn('dot', filter !== f && '!bg-[#555555] !shadow-none')} />
              <span>{f === 'all' ? 'ALL QUEUE' : f === 'pending' ? 'PENDING' : 'RETRAINED'}</span>
              <span className="ml-1 text-[10px] font-bold text-white">
                ({f === 'all' ? items.length : items.filter(i => i.status === f).length})
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="btn-lime !text-xs !py-2.5 !px-5"
        >
          {retraining ? (
            <>
              <Spinner size="sm" />
              RETRAINING ON ACCUMULATED DATA…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              TRIGGER PRODUCTION RETRAIN →
            </>
          )}
        </button>
      </div>

      {/* Retrain result */}
      {retrainResult && (
        <Card className="p-6 border-l-4 border-l-[#d4f53c] bg-[#d4f53c]/5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d4f53c] text-black">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-display text-2xl uppercase tracking-wider text-white">
                RETRAINING {retrainResult.status.toUpperCase()}!
              </p>
              <p className="font-mono text-xs text-[#888888] mt-1">
                F1 SCORE: <span className="text-white">{pct(retrainResult.f1_before)}</span>
                <span className="mx-2 text-[#555555]">→</span>
                <span className="text-[#d4f53c] font-bold">{pct(retrainResult.f1_after)}</span>
                <span className="ml-2 text-[#d4f53c] font-bold">
                  (+{((retrainResult.f1_after - retrainResult.f1_before) * 100).toFixed(1)} pp)
                </span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="NO ITEMS IN SELECTED FILTER" description="All tickets have been reviewed or none match the active filter criteria." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left" role="table">
              <thead>
                <tr className="border-b border-[#1a1a1a] bg-[#050505]">
                  <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#888888]">TICKET CONTENT</th>
                  <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#888888]">PREDICTED</th>
                  <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#888888]">HUMAN REVISION</th>
                  <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#888888]">CONFIDENCE</th>
                  <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#888888]">STATUS</th>
                  <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#888888]">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]/60">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-[#111111]/40 transition-colors">
                    <td className="px-5 py-4 max-w-sm">
                      <p className="font-body text-xs text-[#ffffff] line-clamp-2">{item.text}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <Badge color={CATEGORY_COLORS[item.predicted_category]}>{item.predicted_category}</Badge>
                        <div>
                          <Badge color={URGENCY_COLORS[item.predicted_urgency]}>{item.predicted_urgency}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
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
                        <span className="font-mono text-xs text-[#555555]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn(
                        'font-mono text-xs font-bold',
                        item.confidence < 0.5 ? 'text-[#ff4444]' : 'text-[#ff8c42]',
                      )}>
                        {pct(item.confidence, 0)}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge
                        color={item.status === 'pending' ? '#ff8c42' : '#d4f53c'}
                      >
                        {item.status === 'used_for_retraining' ? 'RETRAINED' : 'PENDING'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-[11px] text-[#555555]">
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
