import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Large SVG wordmark with cursor-reveal gradient mask and stroke animation.
 * Uses theme primary (violet) + hover rainbow for the reveal layer.
 */
export function TextHoverEffect({
  text,
  duration,
  className,
}: {
  text: string;
  duration?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  useEffect(() => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const cxPercentage = ((cursor.x - svgRect.left) / Math.max(svgRect.width, 1)) * 100;
    const cyPercentage = ((cursor.y - svgRect.top) / Math.max(svgRect.height, 1)) * 100;
    setMaskPosition({
      cx: `${cxPercentage}%`,
      cy: `${cyPercentage}%`,
    });
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn(
        "select-none uppercase cursor-pointer",
        className
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id="booklyTextGradient" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
          {hovered ? (
            <>
              <stop offset="0%" stopColor="hsl(45 93% 47%)" />
              <stop offset="25%" stopColor="hsl(0 84% 60%)" />
              <stop offset="50%" stopColor="hsl(152 76% 68%)" />
              <stop offset="75%" stopColor="hsl(188 94% 43%)" />
              <stop offset="100%" stopColor="hsl(263 70% 58%)" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="hsl(240 5% 64%)" />
              <stop offset="100%" stopColor="hsl(240 5% 64%)" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="booklyRevealMask"
          gradientUnits="userSpaceOnUse"
          r="35%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={{ cx: maskPosition.cx, cy: maskPosition.cy }}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="booklyTextMask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#booklyRevealMask)" />
        </mask>
      </defs>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.35"
        className="fill-transparent stroke-border font-display text-7xl font-bold"
        style={{ opacity: hovered ? 0.35 : 0 }}
      >
        {text}
      </text>
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.35"
        className="fill-transparent stroke-primary font-display text-7xl font-bold"
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#booklyTextGradient)"
        strokeWidth="0.35"
        mask="url(#booklyTextMask)"
        className="fill-transparent font-display text-7xl font-bold"
      >
        {text}
      </text>
    </svg>
  );
}

export function FooterBackgroundGradient() {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none rounded-3xl overflow-hidden"
      style={{
        background:
          "radial-gradient(125% 125% at 50% 10%, hsl(var(--card) / 0.92) 45%, hsl(var(--primary) / 0.18) 100%)",
      }}
    />
  );
}
