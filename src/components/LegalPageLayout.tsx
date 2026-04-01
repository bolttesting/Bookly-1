import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSeo } from "@/hooks/useSeo";

type LegalPageLayoutProps = {
  title: string;
  description: string;
  path: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, description, path, lastUpdated, children }: LegalPageLayoutProps) {
  useSeo({ title, description, path });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3 sm:py-4">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to home
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <article className="flex-1 container max-w-3xl py-10 sm:py-14 px-4">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-headings:font-semibold">
          {children}
        </div>
      </article>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="container flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link to="/cookies" className="hover:text-primary transition-colors">
            Cookie Policy
          </Link>
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
