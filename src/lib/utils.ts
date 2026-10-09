/* ──────────────────────────────────────────
   Shared utility helpers
   ────────────────────────────────────────── */

/** Format a number as percentage string */
export function pct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

/** Clamp a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Classnames helper: joins truthy class strings */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Category → color mapping */
export const CATEGORY_COLORS: Record<string, string> = {
  'Technical': '#ef4444',
  'Customer Service': '#06b6d4',
  'Billing and Payments': '#6366f1',
  'Returns and Exchanges': '#10b981',
};

/** Urgency → color mapping */
export const URGENCY_COLORS: Record<string, string> = {
  'Low': '#22c55e',
  'Medium': '#f59e0b',
  'High': '#f97316',
  'Critical': '#ef4444',
};

/** Entity type → color mapping */
export const ENTITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'ORDER_ID': { bg: '#dbeafe', text: '#1e40af', label: 'Order ID' },
  'AMOUNT': { bg: '#f3e8ff', text: '#6b21a8', label: 'Amount' },
  'ERROR_CODE': { bg: '#fee2e2', text: '#991b1b', label: 'Error Code' },
  'DATE': { bg: '#fef3c7', text: '#92400e', label: 'Date' },
  'EMAIL': { bg: '#ccfbf1', text: '#115e59', label: 'Email' },
};

/** Sentiment label → color */
export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#64748b',
  negative: '#ef4444',
};

/** Format a date string for display */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date with time */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
