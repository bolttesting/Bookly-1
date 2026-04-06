import { AppLogoMark } from './AppLogo';
import { SITE_ORIGIN } from '@/lib/site';
import { cn } from '@/lib/utils';

type Props = {
  /** Tighter strip for iframe / embedded widgets */
  compact?: boolean;
  className?: string;
};

export function PoweredByBookly({ compact, className }: Props) {
  return (
    <footer
      className={cn(
        'border-t border-border/50 bg-muted/10',
        compact ? 'mt-6 py-2.5' : 'mt-12 py-6',
        className,
      )}
    >
      <div className={cn('mx-auto flex justify-center px-2', !compact && 'container')}>
        <a
          href={SITE_ORIGIN}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <span
            className={cn(
              'font-medium uppercase tracking-wide text-muted-foreground/75',
              compact ? 'text-[9px]' : 'text-[11px]',
            )}
          >
            Powered by
          </span>
          <AppLogoMark className={cn('shrink-0', compact ? 'h-4 w-4' : 'h-6 w-6')} decorative={false} />
          <span
            className={cn('font-display font-semibold text-foreground/90', compact ? 'text-xs' : 'text-sm')}
          >
            Bookly
          </span>
        </a>
      </div>
    </footer>
  );
}
