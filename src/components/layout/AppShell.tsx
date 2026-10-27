import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';

export type ActiveRoute = 'overview' | 'transactions' | 'planning' | 'settings';

interface AppShellProps {
  activeRoute: ActiveRoute;
  onNavigate?: (route: ActiveRoute) => void;
  periodLabel?: string;
  children: ReactNode;
}

export function AppShell({
  activeRoute,
  onNavigate,
  periodLabel,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-nota-bg text-nota-ink flex flex-col">
      {/* Skip link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-nota-emerald focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Langsung ke konten utama
      </a>

      {/* Top Navigation & Workspace Header */}
      <header className="w-full bg-nota-bg/95 backdrop-blur-xs sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-6 lg:px-8">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-badge bg-nota-emerald text-white text-sm font-semibold tracking-tight select-none"
              aria-hidden="true"
            >
              N
            </div>
            <span className="text-lg font-semibold tracking-tight text-nota-ink">
              Nota
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Navigation Pill (inspired by visual reference) */}
            <nav
              aria-label="Navigasi utama"
              className="flex flex-wrap items-center gap-1 rounded-control bg-nota-surface/80 p-1 border border-nota-border/70"
            >
              <button
                type="button"
                onClick={() => onNavigate?.('overview')}
                aria-current={activeRoute === 'overview' ? 'page' : undefined}
                className={
                  activeRoute === 'overview'
                    ? 'rounded-control bg-nota-lime px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-nota-ink transition-colors cursor-pointer'
                    : 'rounded-control px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-nota-muted hover:text-nota-ink transition-colors cursor-pointer'
                }
              >
                Ringkasan
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('transactions')}
                aria-current={
                  activeRoute === 'transactions' ? 'page' : undefined
                }
                className={
                  activeRoute === 'transactions'
                    ? 'rounded-control bg-nota-lime px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-nota-ink transition-colors cursor-pointer'
                    : 'rounded-control px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-nota-muted hover:text-nota-ink transition-colors cursor-pointer'
                }
              >
                Transaksi
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('planning')}
                aria-current={activeRoute === 'planning' ? 'page' : undefined}
                className={
                  activeRoute === 'planning'
                    ? 'rounded-control bg-nota-lime px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-nota-ink transition-colors cursor-pointer'
                    : 'rounded-control px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-nota-muted hover:text-nota-ink transition-colors cursor-pointer'
                }
              >
                Perencanaan
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('settings')}
                aria-current={activeRoute === 'settings' ? 'page' : undefined}
                className={
                  activeRoute === 'settings'
                    ? 'rounded-control bg-nota-lime px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-nota-ink transition-colors cursor-pointer'
                    : 'rounded-control px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-nota-muted hover:text-nota-ink transition-colors cursor-pointer'
                }
              >
                Pengaturan
              </button>
            </nav>

            {/* Optional Active Period Context */}
            {periodLabel ? (
              <div
                className="flex items-center gap-1.5 rounded-control border border-nota-border/80 bg-nota-surface px-3.5 py-1.5 text-xs sm:text-sm font-medium text-nota-ink"
                aria-label={`Periode aktif: ${periodLabel}`}
              >
                <Calendar
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-nota-emerald shrink-0"
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap">{periodLabel}</span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
      >
        {children}
      </main>
    </div>
  );
}
