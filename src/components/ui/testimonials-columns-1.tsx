import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Review } from "@/hooks/useReviews";

export type TestimonialItem = {
  text: string;
  image: string;
  name: string;
  role: string;
};

/** Portrait crops from Unsplash (stable CDN URLs). */
const PORTRAIT_IMAGES = [
  "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&h=128&fit=crop&q=80",
];

const BOOKLY_DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    text: "Bookly transformed how we manage appointments. Our booking rate went up sharply in the first month.",
    image: PORTRAIT_IMAGES[0],
    name: "Sarah Johnson",
    role: "Salon owner",
  },
  {
    text: "Automated reminders cut our no-shows. The dashboard gives us clarity we never had before.",
    image: PORTRAIT_IMAGES[1],
    name: "Michael Chen",
    role: "Studio manager",
  },
  {
    text: "Beautiful interface, simple for the team, and support actually replies. Essential for us.",
    image: PORTRAIT_IMAGES[2],
    name: "Emily Rodriguez",
    role: "Consultant",
  },
  {
    text: "Multi-location scheduling used to be a nightmare. Bookly keeps everything in one place.",
    image: PORTRAIT_IMAGES[3],
    name: "James Okonkwo",
    role: "Operations lead",
  },
  {
    text: "Clients love booking online. We spend less time on the phone and more time with customers.",
    image: PORTRAIT_IMAGES[4],
    name: "Priya Patel",
    role: "Spa director",
  },
  {
    text: "Setup was quick and the class schedule flow fits our studio perfectly.",
    image: PORTRAIT_IMAGES[5],
    name: "David Kim",
    role: "Fitness owner",
  },
  {
    text: "Reporting and staff calendars finally match reality. Our team adopted it without training drama.",
    image: PORTRAIT_IMAGES[6],
    name: "Anna Lindström",
    role: "Clinic administrator",
  },
  {
    text: "Stripe integration and packages in one system — we outgrew spreadsheets overnight.",
    image: PORTRAIT_IMAGES[7],
    name: "Marcus Webb",
    role: "Barbershop owner",
  },
  {
    text: "Professional, reliable, and our customers comment on how easy booking is.",
    image: PORTRAIT_IMAGES[8],
    name: "Lena Fischer",
    role: "Wellness coach",
  },
];

/** Repeat reviews in order until we have `count` cards (for 3×3 columns). */
function tileReviews(reviews: Review[], count: number): Review[] {
  const out: Review[] = [];
  for (let i = 0; i < count; i++) {
    out.push(reviews[i % reviews.length]);
  }
  return out;
}

/**
 * Landing testimonials: drives the marquee from Supabase `reviews` (Super Admin → Reviews).
 * - With rows in `reviews`: only real name, role, and quote appear (tiled to 9 for layout).
 * - With none: shows BOOKLY_DEFAULT_TESTIMONIALS until you add testimonials.
 * Avatars use stock photos until `reviews` gets an optional image column later.
 */
export function reviewsToMarqueeItems(reviews: Review[]): TestimonialItem[] {
  if (reviews.length === 0) return [...BOOKLY_DEFAULT_TESTIMONIALS];
  return tileReviews(reviews, 9).map((r, i) => ({
    text: r.content,
    name: r.name,
    role: r.role ?? "Customer",
    image: PORTRAIT_IMAGES[i % PORTRAIT_IMAGES.length],
  }));
}

function TestimonialCard({ text, image, name, role }: TestimonialItem) {
  return (
    <div className="p-6 sm:p-8 md:p-10 rounded-3xl border border-border bg-card shadow-lg shadow-primary/10 max-w-xs w-full mx-auto">
      <p className="text-sm sm:text-base text-foreground leading-relaxed">{text}</p>
      <div className="flex items-center gap-3 mt-5">
        <img
          width={40}
          height={40}
          src={image}
          alt={name}
          className="h-10 w-10 rounded-full object-cover shrink-0"
          loading="lazy"
        />
        <div className="flex flex-col min-w-0 text-left">
          <div className="font-medium tracking-tight leading-5 truncate">{name}</div>
          <div className="leading-5 text-muted-foreground text-sm tracking-tight">{role}</div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsColumn(props: {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  const duration = props.duration ?? 10;

  const stacks = (
    <>
      {[0, 1].map((cycle) => (
        <React.Fragment key={cycle}>
          {props.testimonials.map((t, i) => (
            <TestimonialCard key={`${cycle}-${i}`} {...t} />
          ))}
        </React.Fragment>
      ))}
    </>
  );

  if (reduceMotion) {
    return (
      <div className={props.className}>
        <div className="flex flex-col gap-6 pb-6 bg-background">{props.testimonials.map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}</div>
      </div>
    );
  }

  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-background"
      >
        {stacks}
      </motion.div>
    </div>
  );
}

export function TestimonialsMarqueeSection({
  items,
  className,
}: {
  items: TestimonialItem[];
  className?: string;
}) {
  const firstColumn = items.slice(0, 3);
  const secondColumn = items.slice(3, 6);
  const thirdColumn = items.slice(6, 9);

  return (
    <div className={className}>
      <div className="container z-10 mx-auto px-4 sm:px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto text-center"
        >
          <div className="flex justify-center">
            <div className="border border-border py-1 px-4 rounded-lg text-sm font-medium text-muted-foreground bg-muted/30">
              Testimonials
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-display font-bold tracking-tight mt-5">
            What our users say
          </h2>
          <p className="text-center mt-5 text-muted-foreground max-w-md">
            See what our customers have to say about Bookly.
          </p>
        </motion.div>

        <div
          className="flex justify-center gap-4 sm:gap-6 mt-10 max-h-[740px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]"
        >
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </div>
  );
}
