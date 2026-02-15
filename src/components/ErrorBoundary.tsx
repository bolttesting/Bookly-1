import React from "react";
import { logger } from "@/lib/logger";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

const isDev = import.meta.env.DEV;

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("ErrorBoundary caught", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
            <p className="mb-4 text-muted-foreground">
              Try refreshing the page. If it keeps happening, try again later.
            </p>
            {isDev && err?.message && (
              <pre className="mb-4 text-left text-xs bg-muted/50 p-3 rounded overflow-auto max-h-32">
                {err.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="text-primary underline hover:text-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
