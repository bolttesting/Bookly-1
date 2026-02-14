import React from "react";
import { logger } from "@/lib/logger";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

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
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
            <p className="mb-4 text-muted-foreground">
              We&apos;ve been notified. Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
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
