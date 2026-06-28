import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates toward the step-based target.
 * Creeps only while work is actively in flight (never inflates idle progress).
 */
export function useSmoothSetupProgress(target: number, isActive: boolean): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (target > displayRef.current) {
      displayRef.current = target;
      setDisplay(target);
    } else if (!isActive && target < displayRef.current) {
      displayRef.current = target;
      setDisplay(target);
    }
  }, [target, isActive]);

  useEffect(() => {
    if (!isActive) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const goal = targetRef.current;
      const creepCap = Math.min(99, goal + 4);
      let next = displayRef.current;

      if (next < goal) {
        next = Math.min(goal, next + dt * 60);
      } else if (next < creepCap) {
        next = Math.min(creepCap, next + dt * 2);
      }

      const rounded = Math.round(next);
      if (rounded !== Math.round(displayRef.current)) {
        displayRef.current = next;
        setDisplay(rounded);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  return isActive ? Math.max(display, target) : target;
}
