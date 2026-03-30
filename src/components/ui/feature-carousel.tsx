import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Users,
  Clock,
  BarChart3,
  Shield,
  Zap,
  Smartphone,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureCarouselItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  image: string;
  description: string;
};

const FEATURES: FeatureCarouselItem[] = [
  {
    id: "scheduling",
    label: "Smart scheduling",
    icon: Calendar,
    image:
      "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&auto=format&fit=crop&q=80",
    description: "Drag-and-drop calendar with real-time availability and conflict detection.",
  },
  {
    id: "clients",
    label: "Client management",
    icon: Users,
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80",
    description: "History, preferences, and spending patterns in one place.",
  },
  {
    id: "reminders",
    label: "Automated reminders",
    icon: Clock,
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&auto=format&fit=crop&q=80",
    description: "Fewer no-shows with SMS and email before every appointment.",
  },
  {
    id: "analytics",
    label: "Analytics dashboard",
    icon: BarChart3,
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80",
    description: "Track revenue, bookings, and staff performance at a glance.",
  },
  {
    id: "payments",
    label: "Secure payments",
    icon: Shield,
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&auto=format&fit=crop&q=80",
    description: "Deposits and payouts online with Stripe—built for trust.",
  },
  {
    id: "staff",
    label: "Staff & commissions",
    icon: Zap,
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80",
    description: "Assign services, set schedules, and track commissions fairly.",
  },
  {
    id: "mobile",
    label: "Mobile-first booking",
    icon: Smartphone,
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&auto=format&fit=crop&q=80",
    description: "Clients book from any device; you run the day from your phone.",
  },
  {
    id: "locations",
    label: "Multi-location",
    icon: Building2,
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
    description: "One dashboard for every site as you scale.",
  },
];

const AUTO_PLAY_INTERVAL = 3000;
const ITEM_HEIGHT = 65;

function wrap(min: number, max: number, v: number) {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
}

export function FeatureCarousel({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const len = FEATURES.length;
  const currentIndex = ((step % len) + len) % len;

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + len) % len;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    let normalizedDiff = diff;
    if (diff > len / 2) normalizedDiff -= len;
    if (diff < -len / 2) normalizedDiff += len;

    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  const half = len / 2;

  return (
    <div className={cn("mx-auto w-full max-w-7xl md:p-8", className)}>
      <div className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[2.5rem] border border-border/40 lg:aspect-video lg:flex-row lg:rounded-[4rem]">
        <div className="relative z-30 flex min-h-[350px] w-full flex-col items-start justify-center overflow-hidden bg-primary px-8 md:min-h-[450px] md:px-16 lg:h-full lg:w-[40%] lg:pl-16">
          <div className="absolute inset-x-0 top-0 z-40 h-12 bg-gradient-to-b from-primary via-primary/80 to-transparent md:h-20 lg:h-16" />
          <div className="absolute inset-x-0 bottom-0 z-40 h-12 bg-gradient-to-t from-primary via-primary/80 to-transparent md:h-20 lg:h-16" />
          <div className="relative z-20 flex h-full w-full items-center justify-center lg:justify-start">
            {FEATURES.map((feature, index) => {
              const isActive = index === currentIndex;
              const distance = index - currentIndex;
              const wrappedDistance = wrap(-half, half, distance);

              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.id}
                  style={{ height: ITEM_HEIGHT, width: "fit-content" }}
                  animate={{
                    y: wrappedDistance * ITEM_HEIGHT,
                    opacity: 1 - Math.abs(wrappedDistance) * 0.25,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 90,
                    damping: 22,
                    mass: 1,
                  }}
                  className="absolute flex items-center justify-start"
                >
                  <button
                    type="button"
                    onClick={() => handleChipClick(index)}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-full border px-6 py-3.5 text-left transition-all duration-700 md:px-10 md:py-5 lg:px-8 lg:py-4",
                      isActive
                        ? "z-10 border-background bg-background text-primary"
                        : "border-primary-foreground/20 bg-transparent text-primary-foreground/60 hover:border-primary-foreground/40 hover:text-primary-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center transition-colors duration-500",
                        isActive ? "text-primary" : "text-primary-foreground/40"
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
                    </div>
                    <span className="whitespace-nowrap text-sm font-normal uppercase tracking-tight md:text-[15px]">
                      {feature.label}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="relative flex min-h-[500px] flex-1 items-center justify-center overflow-hidden border-t border-border/20 bg-muted/40 px-6 py-16 md:min-h-[600px] md:px-12 md:py-24 lg:h-full lg:border-l lg:border-t-0 lg:px-10 lg:py-16 dark:bg-secondary/30">
          <div className="relative flex aspect-[4/5] w-full max-w-[420px] items-center justify-center">
            {FEATURES.map((feature, index) => {
              const status = getCardStatus(index);
              const isActive = status === "active";
              const isPrev = status === "prev";
              const isNext = status === "next";

              return (
                <motion.div
                  key={feature.id}
                  initial={false}
                  animate={{
                    x: isActive ? 0 : isPrev ? -100 : isNext ? 100 : 0,
                    scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                    opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0,
                    rotate: isPrev ? -3 : isNext ? 3 : 0,
                    zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 origin-center overflow-hidden rounded-[2rem] border-4 border-background bg-background md:rounded-[2.8rem] md:border-8"
                >
                  <img
                    src={feature.image}
                    alt=""
                    className={cn(
                      "h-full w-full object-cover transition-all duration-700",
                      isActive ? "blur-0 grayscale-0" : "blur-[2px] brightness-75 grayscale"
                    )}
                  />

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-10 pt-32"
                      >
                        <div className="mb-3 w-fit rounded-full border border-border/50 bg-background px-4 py-1.5 text-[11px] font-normal uppercase tracking-[0.2em] text-foreground shadow-lg">
                          {index + 1} • {feature.label}
                        </div>
                        <p className="text-xl font-normal leading-tight tracking-tight text-white drop-shadow-md md:text-2xl">
                          {feature.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    className={cn(
                      "absolute left-8 top-8 flex items-center gap-3 transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <div className="size-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                    <span className="font-mono text-[10px] font-normal uppercase tracking-[0.3em] text-white/80">
                      Bookly
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
