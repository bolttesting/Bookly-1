import { ReactLenis } from "lenis/react";
import { useTransform, motion, useScroll, type MotionValue } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Semantically same as `["start start", "end end"]` (full target in view = 0→1 progress).
 * Motion maps that string pair to an internal preset and enables **View Timeline acceleration**,
 * which often stays stuck or desyncs with **Lenis** (smooth scroll) and sometimes with long embedded pages.
 * A non-preset tuple keeps **JS scroll tracking** (`scroll` + `scroll` events) so `scrollYProgress` updates reliably.
 */
const STACK_SCROLL_OFFSET: [[number, number], [number, number]] = [
  [0, 0],
  [1, 0.999_999],
];

/**
 * Stacking cards pattern (Olivier Larose / 21st community).
 * @see https://www.youtube.com/@olivierlarose1
 * @see https://21st.dev/r/uilayout.contact/stacking-card
 *
 * - **standalone**: full-page recipe — `ReactLenis` + `<main ref>` + `sticky top-0`. Use on `/stacking-demo` only.
 * - **embedded**: Bookly landing — no Lenis (avoids hijacking whole-site scroll), `<div ref>`, `sticky` below fixed nav.
 *
 * Next.js `Image` is replaced with `<img>` (Vite). The `src` field in some snippets is unused when `url`/`link` is passed to the image.
 */

export interface ProjectData {
  title: string;
  description: string;
  link: string;
  color: string;
  moreHref?: string;
  moreLabel?: string;
}

interface CardProps {
  i: number;
  title: string;
  description: string;
  url: string;
  color: string;
  moreHref: string;
  moreLabel: string;
  progress: MotionValue<number>;
  range: [number, number];
  targetScale: number;
  stickyTopClass: string;
}

export const Card = ({
  i,
  title,
  description,
  url,
  color,
  progress,
  range,
  targetScale,
  moreHref,
  moreLabel,
  stickyTopClass,
}: CardProps) => {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "start start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [2, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div
      ref={container}
      className={cn("h-screen flex items-center justify-center sticky", stickyTopClass)}
    >
      <motion.div
        style={{
          backgroundColor: color,
          scale,
          top: `calc(-5vh + ${i * 25}px)`,
        }}
        className="flex flex-col relative -top-[25%] h-[min(52vh,520px)] min-h-[480px] w-[min(94vw,42rem)] sm:h-[min(50vh,560px)] sm:min-h-[520px] sm:w-[min(92vw,48rem)] lg:h-[min(48vh,600px)] lg:min-h-[560px] lg:w-[min(90vw,56rem)] rounded-xl p-3 sm:p-5 lg:p-11 origin-top text-white shadow-lg shadow-black/15 ring-1 ring-black/10 dark:shadow-black/40 dark:ring-white/15"
      >
        <h2 className="text-2xl text-center font-semibold font-display">{title}</h2>
        <div className="flex h-full mt-5 gap-10">
          <div className="w-[40%] relative top-[10%]">
            <p className="text-sm opacity-95">{description}</p>
            <span className="flex items-center gap-2 pt-2">
              <a
                href={moreHref}
                {...(moreHref.startsWith("http")
                  ? { target: "_blank" as const, rel: "noreferrer" as const }
                  : {})}
                className="underline cursor-pointer"
              >
                {moreLabel}
              </a>
              <svg width="22" height="12" viewBox="0 0 22 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path
                  d="M21.5303 6.53033C21.8232 6.23744 21.8232 5.76256 21.5303 5.46967L16.7574 0.696699C16.4645 0.403806 15.9896 0.403806 15.6967 0.696699C15.4038 0.989592 15.4038 1.46447 15.6967 1.75736L19.9393 6L15.6967 10.2426C15.4038 10.5355 15.4038 11.0104 15.6967 11.3033C15.9896 11.5962 16.4645 11.5962 16.7574 11.3033L21.5303 6.53033ZM0 6.75L21 6.75V5.25L0 5.25L0 6.75Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>

          <div className="relative w-[60%] h-full min-h-[160px] rounded-lg overflow-hidden">
            <motion.div className="absolute inset-0 w-full h-full" style={{ scale: imageScale }}>
              <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/** Olivier’s 5-card demo uses `i * 0.25` (= `i / (n - 1)`). Same formula scales to any count without overlapping ranges. */
function scaleRangeForIndex(i: number, n: number): [number, number] {
  if (n <= 1) return [0, 1];
  return [i / (n - 1), 1];
}

export type StackingCardMode = "standalone" | "embedded";

export interface StackingCardStackProps {
  projects: ProjectData[];
  className?: string;
  mode?: StackingCardMode;
  booklyIntro?: boolean;
  showFooter?: boolean;
}

export function StackingCardStack({
  projects,
  className,
  mode = "standalone",
  booklyIntro,
  showFooter = true,
}: StackingCardStackProps) {
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRootRef,
    offset: STACK_SCROLL_OFFSET,
    trackContentSize: true,
  });

  const n = projects.length;
  const stickyTopClass = mode === "embedded" ? "top-24 sm:top-28" : "top-0";

  const intro = (
    <section
      className={cn(
        "relative w-full bg-muted/40 text-foreground dark:bg-slate-950 dark:text-white",
        booklyIntro
          ? "flex flex-col items-center px-4 pt-6 pb-8 sm:pt-8 sm:pb-10 md:pb-12"
          : "grid min-h-[52vh] place-content-center py-16 md:min-h-[58vh] md:py-20"
      )}
    >
      <div
        className="absolute inset-0 bg-[length:54px_54px] bg-[linear-gradient(to_right,hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.55)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#fff_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] dark:[mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
        aria-hidden
      />
      {booklyIntro ? (
        <>
          <h2 className="relative z-10 2xl:text-7xl text-3xl sm:text-5xl md:text-6xl text-center font-semibold font-display tracking-tight leading-[120%]">
            Everything you need to <span className="text-primary">succeed</span>
          </h2>
          <p className="relative z-10 mt-3 max-w-2xl text-center text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Comprehensive tools for service businesses — scroll to explore the stack.
          </p>
        </>
      ) : (
        <h1 className="relative z-10 px-8 text-center text-5xl font-semibold tracking-tight leading-[120%] text-foreground dark:text-white 2xl:text-7xl">
          Stacking Cards Using <br /> Motion. Scroll down! 👇
        </h1>
      )}
    </section>
  );

  const cards = (
    <section className="w-full bg-muted/30 dark:bg-slate-950 dark:text-white">
      {projects.map((project, i) => {
        const targetScale = 1 - (projects.length - i) * 0.05;
        return (
          <Card
            key={`p_${i}`}
            i={i}
            url={project.link}
            title={project.title}
            color={project.color}
            description={project.description}
            moreHref={project.moreHref ?? "#"}
            moreLabel={project.moreLabel ?? "See more"}
            progress={scrollYProgress}
            range={scaleRangeForIndex(i, n)}
            targetScale={targetScale}
            stickyTopClass={stickyTopClass}
          />
        );
      })}
    </section>
  );

  const footer =
    showFooter && mode === "standalone" ? (
      <footer className="group bg-muted/40 dark:bg-slate-950">
        <h2 className="text-[16vw] translate-y-20 leading-[100%] uppercase font-semibold text-center bg-gradient-to-r from-neutral-500 to-neutral-800 bg-clip-text text-transparent transition-all ease-linear dark:from-neutral-400 dark:to-neutral-800">
          ui-layout
        </h2>
        <div className="relative z-10 grid h-40 place-content-center rounded-tl-full rounded-tr-full bg-foreground/10 text-2xl text-foreground dark:bg-black dark:text-white" />
      </footer>
    ) : null;

  const Root = mode === "standalone" ? "main" : "div";
  const stack = (
    <Root
      ref={scrollRootRef}
      className={cn("bg-background text-foreground dark:bg-black dark:text-white", className)}
    >
      {intro}
      {cards}
      {footer}
    </Root>
  );

  if (mode === "standalone") {
    return <ReactLenis root>{stack}</ReactLenis>;
  }

  return stack;
}

const Component = StackingCardStack;
export default Component;
export { Component };

export interface StackingCardsShowcaseProps {
  projects: StackingCardItem[];
  className?: string;
}

export interface StackingCardItem {
  title: string;
  description: string;
  image: string;
  color: string;
  moreHref?: string;
  moreLabel?: string;
}

function projectsToProjectData(items: StackingCardItem[]): ProjectData[] {
  return items.map((p) => ({
    title: p.title,
    description: p.description,
    link: p.image,
    color: p.color,
    moreHref: p.moreHref,
    moreLabel: p.moreLabel,
  }));
}

/** Bookly landing: embedded (no site-wide Lenis), custom intro, no footer. */
export function StackingCardsShowcase({ projects, className }: StackingCardsShowcaseProps) {
  return (
    <StackingCardStack
      mode="embedded"
      projects={projectsToProjectData(projects)}
      className={className}
      booklyIntro
      showFooter={false}
    />
  );
}

export const BOOKLY_STACKING_CARDS: StackingCardItem[] = [
  {
    title: "Mobile-ready booking",
    description:
      "Your clients book from any device while you run the day from your phone—clean calendar, instant confirmations.",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80",
    color: "#6d28d9",
    moreHref: "#features",
    moreLabel: "Explore features",
  },
  {
    title: "Payments that just work",
    description:
      "Take deposits and full payments with Stripe—fewer no-shows and reconciling without a spreadsheet.",
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop&q=80",
    color: "#5b21b6",
    moreHref: "#pricing",
    moreLabel: "See pricing",
  },
  {
    title: "Automated reminders",
    description:
      "Email and SMS nudges before appointments so your chairs and rooms stay full without chasing anyone.",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&auto=format&fit=crop&q=80",
    color: "#312e81",
    moreHref: "#features",
    moreLabel: "Learn more",
  },
  {
    title: "Analytics & insights",
    description:
      "Spot busy hours, top services, and revenue trends so you can staff smarter and grow with data—not guesswork.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
    color: "#4c1d95",
    moreHref: "#features",
    moreLabel: "View capabilities",
  },
  {
    title: "Team & permissions",
    description:
      "Invite staff, set roles, and keep everyone on the same schedule—without sharing one login.",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
    color: "#6b21a8",
    moreHref: "#about",
    moreLabel: "Why Bookly",
  },
  {
    title: "Multi-location control",
    description:
      "One dashboard for every site—locations, rooms, and providers stay organized as you scale.",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80",
    color: "#5b21b6",
    moreHref: "/auth",
    moreLabel: "Start for free",
  },
];
