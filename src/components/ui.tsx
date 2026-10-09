/* ──────────────────────────────────────────
   VOID-Inspired UI Primitives (Heart Disease Design System)
   ────────────────────────────────────────── */
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import type { ReactNode } from 'react';

/* ── Loading spinner ── */
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn(s, 'animate-spin rounded-full border-2 border-[#1a1a1a] border-t-[#d4f53c]')} />
    </div>
  );
}

/* ── Loading state wrapper ── */
export function LoadingState({ label = 'PROCESSING MODEL INFERENCE…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Spinner size="lg" />
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#888888] animate-pulse">{label}</p>
    </div>
  );
}

/* ── Error state ── */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 border border-[#ff4444]/30 bg-[#0a0a0a] rounded-2xl p-8">
      <div className="h-12 w-12 rounded-full bg-[#ff4444]/10 border border-[#ff4444]/30 flex items-center justify-center">
        <svg className="h-6 w-6 text-[#ff4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="font-mono text-xs text-[#ff4444] max-w-md text-center uppercase tracking-wider">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline text-xs !py-2 !px-4">
          RETRY REQUEST
        </button>
      )}
    </div>
  );
}

/* ── Empty state ── */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-[#1a1a1a] bg-[#0a0a0a] rounded-2xl p-8">
      {icon ?? (
        <svg className="h-10 w-10 text-[#555555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <h3 className="font-display text-2xl uppercase tracking-wider text-white">{title}</h3>
      {description && <p className="font-body text-sm text-[#888888] max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-lime text-xs mt-3 !py-2 !px-4"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ── Card wrapper ── */
export function Card({ children, className, hover }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={cn(
      'rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] text-white p-5 lg:p-6 transition-all duration-200',
      hover && 'hover:border-[#d4f53c]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)]',
      className,
    )}>
      {children}
    </div>
  );
}

/* ── Badge ── */
export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-bold tracking-wider uppercase border border-[#1a1a1a] bg-[#111111]',
        className,
      )}
      style={color ? { borderColor: `${color}40`, color, backgroundColor: `${color}12` } : undefined}
    >
      {color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />}
      {children}
    </span>
  );
}

/* ── Theme toggle ── */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="rounded-full p-2 text-[#888888] hover:text-[#d4f53c] border border-[#1a1a1a] hover:border-[#d4f53c]/40 bg-[#111111] transition-all"
    >
      {theme === 'dark' ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

/* ── Confidence bar ── */
export function ConfidenceBar({ value, color, label, className }: { value: number; color?: string; label?: string; className?: string }) {
  const pctVal = Math.round(value * 100);
  const activeColor = color ?? '#d4f53c';
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider">
          <span className="text-[#888888]">{label}</span>
          <span className="font-bold text-white">{pctVal}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pctVal}%`, backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}50` }}
        />
      </div>
    </div>
  );
}

/* ── Gauge (semicircle) ── */
export function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const angle = Math.min(180, Math.max(0, value * 180));
  const r = 58;
  const cx = 70;
  const cy = 70;

  const startX = cx - r;
  const startY = cy;
  const endAngle = (Math.PI * angle) / 180;
  const endX = cx - r * Math.cos(endAngle);
  const endY = cy - r * Math.sin(endAngle);
  const largeArc = angle > 180 ? 1 : 0;
  const activeColor = color || '#d4f53c';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 140 80" className="w-32 h-auto">
        {/* Track */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1a1a1a" strokeWidth="10" strokeLinecap="round" />
        {/* Value arc */}
        {value > 0.01 && (
          <path
            d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
            fill="none"
            stroke={activeColor}
            strokeWidth="10"
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        )}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white font-display text-2xl" style={{ fontFamily: 'Bebas Neue', letterSpacing: '0.04em' }}>
          {Math.round(value * 100)}%
        </text>
      </svg>
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#888888]">{label}</span>
    </div>
  );
}

/* ── Page header ── */
export function PageHeader({ title, description, eyebrow }: { title: string; description?: string; eyebrow?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <div className="pill-tag mb-3">
          <span className="dot" />
          <span>{eyebrow}</span>
        </div>
      )}
      <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl uppercase tracking-wider text-white leading-none">
        {title}
      </h1>
      {description && <p className="font-body text-sm sm:text-base text-[#888888] max-w-3xl mt-2 leading-relaxed">{description}</p>}
    </div>
  );
}

/* ── Collapsible section ── */
export function Collapsible({ title, children, defaultOpen = false, className }: { title: string; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return (
    <details open={defaultOpen} className={cn('group border border-[#1a1a1a] bg-[#0a0a0a] rounded-2xl p-4', className)}>
      <summary className="flex cursor-pointer items-center justify-between font-mono text-xs uppercase tracking-wider text-[#888888] hover:text-white transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4f53c]" />
          {title}
        </span>
        <svg className="h-4 w-4 text-[#888888] transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </summary>
      <div className="mt-4 pt-4 border-t border-[#1a1a1a]">{children}</div>
    </details>
  );
}
