import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  key?: string;
}

export function PageTransition({ children, key }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const prevKeyRef = useRef(key || location.pathname);

  useEffect(() => {
    const currentKey = key || location.pathname;
    
    // Only trigger transition if key/pathname actually changed
    if (currentKey !== prevKeyRef.current) {
      prevKeyRef.current = currentKey;
      
      // Start exit animation
      setIsVisible(false);
      
      // After exit, start enter animation
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [key, location.pathname]);

  // Do not use transform (translate) on this wrapper — it breaks position:sticky
  // (e.g. landing stacking cards). Opacity-only transition is sticky-safe.
  return (
    <div
      className={cn(
        "w-full min-h-full transition-opacity duration-300 ease-in-out",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
}

