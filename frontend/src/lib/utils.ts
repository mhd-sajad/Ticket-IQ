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
  'Technical': '#ff4444',
  'Customer Service': '#38bdf8',
  'Billing and Payments': '#d4f53c',
  'Returns and Exchanges': '#c084fc',
};

/** Urgency → color mapping */
export const URGENCY_COLORS: Record<string, string> = {
  'Low': '#22c55e',
  'Medium': '#ff8c42',
  'High': '#f97316',
  'Critical': '#ff4444',
};

/** Entity type → color mapping */
export const ENTITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'ORDER_ID': { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', label: 'Order ID' },
  'AMOUNT': { bg: 'rgba(212, 245, 60, 0.15)', text: '#d4f53c', label: 'Amount' },
  'ERROR_CODE': { bg: 'rgba(255, 68, 68, 0.15)', text: '#ff4444', label: 'Error Code' },
  'DATE': { bg: 'rgba(255, 140, 66, 0.15)', text: '#ff8c42', label: 'Date' },
  'EMAIL': { bg: 'rgba(192, 132, 252, 0.15)', text: '#c084fc', label: 'Email' },
};

/** Sentiment label → color */
export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#d4f53c',
  neutral: '#888888',
  negative: '#ff4444',
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
