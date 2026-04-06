import { cn } from '@/lib/utils';

/** Public app mark — same asset as the browser tab icon (`/favicon.svg`). */
const LOGO_SRC = '/favicon.svg';

export type AppLogoMarkProps = {
  className?: string;
  /** When false, expose "Bookly" for screen readers (icon-only buttons). */
  decorative?: boolean;
};

/** Squircle mark only — use beside custom titles or collapsed sidebars. */
export function AppLogoMark({ className, decorative = true }: AppLogoMarkProps) {
  return (
    <img
      src={LOGO_SRC}
      alt={decorative ? '' : 'Bookly'}
      width={64}
      height={64}
      className={cn('shrink-0 rounded-[22%] object-cover shadow-sm', className)}
      decoding="async"
      aria-hidden={decorative}
    />
  );
}

export type AppLogoProps = {
  className?: string;
  /** Tailwind classes for the squircle (intrinsic asset is 64×64 SVG). */
  iconClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function AppLogo({
  className,
  iconClassName = 'h-7 w-7 sm:h-8 sm:w-8',
  showWordmark = true,
  wordmarkClassName,
}: AppLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <AppLogoMark
        decorative={showWordmark}
        className={cn(iconClassName)}
      />
      {showWordmark ? (
        <span className={cn('font-display font-bold', wordmarkClassName)}>Bookly</span>
      ) : null}
    </span>
  );
}
