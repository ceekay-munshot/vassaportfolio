// Top-level error boundary. Wraps the whole app so a runtime exception
// during render (a stale localStorage shape, a misbehaving chart, an
// invalid currency code) shows a recoverable screen instead of a blank
// black page.

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { clearAllPortfolioState } from "@/lib/portfolioStorage";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface to the console for debugging. In production the boundary's
    // fallback UI is what the user sees.
    console.error("[FamilyOfficeOS] Render error:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  resetAndClear = () => {
    clearAllPortfolioState();
    this.setState({ error: null });
    // Reload to give the app a clean slate.
    if (typeof window !== "undefined") window.location.href = "/upload";
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6 text-slate-200">
        <div className="card max-w-lg p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-100">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-400">
            The dashboard hit a render error. Most often this happens after an upgrade — the
            portfolio data saved in your browser was written by an older build and the new code
            doesn't recognize it.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-md border border-slate-800 bg-ink-900 p-2 text-left text-[11px] text-rose-300">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={this.reset} className="btn-ghost text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
            <button onClick={this.resetAndClear} className="btn-primary text-xs">
              <Trash2 className="h-3.5 w-3.5" />
              Clear saved data & restart
            </button>
          </div>
        </div>
      </div>
    );
  }
}
