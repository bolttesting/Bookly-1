import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function AnimatedOutlet() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'entering' | 'entered' | 'exiting'>('entered');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exiting');
    }
  }, [location.pathname, displayLocation.pathname]);

  useEffect(() => {
    if (transitionStage === 'exiting') {
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('entering');
      }, 200);

      return () => clearTimeout(timer);
    } else if (transitionStage === 'entering') {
      const timer = setTimeout(() => {
        setTransitionStage('entered');
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [transitionStage, location]);

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out',
        transitionStage === 'exiting' && 'opacity-0 translate-x-4',
        transitionStage === 'entering' && 'opacity-0 -translate-x-4',
        transitionStage === 'entered' && 'opacity-100 translate-x-0'
      )}
    >
      <Outlet key={displayLocation.pathname} />
    </div>
  );
}

