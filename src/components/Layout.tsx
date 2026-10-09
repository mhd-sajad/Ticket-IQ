/* ──────────────────────────────────────────
   VOID-Inspired Layout (Heart Disease Design System)
   ────────────────────────────────────────── */
import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ui';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { subscribeServerWaking } from '../lib/serverStatus';
import { subscribeApiMode, type ApiMode } from '../lib/api';

const NAV_ITEMS = [
  { to: '/', label: 'Triage', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { to: '/live', label: 'Live Stream', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { to: '/insights', label: 'Insights', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/models', label: 'Model Lab', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { to: '/review', label: 'Review Queue', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/about', label: 'About', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [apiMode, setApiMode] = useState<ApiMode>('live');

  useEffect(() => {
    const unsubWake = subscribeServerWaking(setIsWaking);
    const unsubApi = subscribeApiMode(setApiMode);
    return () => {
      unsubWake();
      unsubApi();
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white font-body">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/80 backdrop-blur-md lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#1a1a1a] bg-[#000000] backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center gap-3 px-6 border-b border-[#1a1a1a]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d4f53c] text-black font-display font-bold text-lg shadow-[0_0_14px_rgba(212,245,60,0.4)]">
            TQ
          </div>
          <div className="flex flex-col">
            <span className="font-display text-2xl tracking-widest text-white leading-none">
              TICKET<span className="text-[#d4f53c]">IQ</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#888888] mt-0.5">
              NLP TRIAGE ENGINE
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'group flex items-center gap-3 rounded-full px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200',
                isActive
                  ? 'bg-[#111111] text-[#d4f53c] border border-[#d4f53c]/40 shadow-[0_0_14px_rgba(212,245,60,0.15)]'
                  : 'text-[#888888] hover:text-white hover:bg-[#0a0a0a]',
              )}
            >
              <svg className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-[#1a1a1a] p-4 bg-[#050505]">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">BUILD v1.0.0</span>
              <span className="font-mono text-[9px] text-[#888888]">VOID ARCHITECTURE</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
        {/* Top bar */}
        <header className="flex h-20 shrink-0 items-center gap-4 border-b border-[#1a1a1a] bg-[#000000]/90 backdrop-blur-xl px-6 lg:px-8">
          <button
            className="rounded-lg p-2 text-[#888888] hover:text-white hover:bg-[#111111] border border-[#1a1a1a] lg:hidden focus:outline-none"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="hidden lg:flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#555555]">// OPERATIONAL STATUS</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="pill-tag">
              <span
                className={cn(
                  'dot',
                  apiMode === 'mock-fallback' && '!bg-[#ff8c42] !shadow-[0_0_6px_#ff8c42]',
                  apiMode === 'mock' && '!bg-[#38bdf8] !shadow-[0_0_6px_#38bdf8]',
                )}
              />
              <span>
                {apiMode === 'live' && 'LIVE BACKEND ONLINE'}
                {apiMode === 'mock-fallback' && 'DEMO MODE (BACKEND OFFLINE)'}
                {apiMode === 'mock' && 'MOCK DEMO MODE'}
              </span>
            </div>
          </div>
        </header>

        {/* Visible banner when backend is unreachable */}
        {apiMode === 'mock-fallback' && (
          <div
            id="backend-fallback-banner"
            role="alert"
            className="flex items-center justify-center gap-2.5 bg-orange-500/10 border-b border-orange-500/30 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#ff8c42] backdrop-blur-md"
          >
            <svg className="h-4 w-4 shrink-0 text-[#ff8c42]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Backend unreachable, showing demo data</span>
          </div>
        )}

        {/* Server wake banner for cold starts */}
        {isWaking && (
          <div
            id="server-waking-banner"
            role="status"
            className="flex items-center justify-center gap-2.5 bg-[#d4f53c]/10 border-b border-[#d4f53c]/30 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-[#d4f53c] backdrop-blur-md animate-pulse"
          >
            <svg className="h-4 w-4 shrink-0 animate-spin text-[#d4f53c]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Waking up the server, this can take up to a minute</span>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8 bg-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
