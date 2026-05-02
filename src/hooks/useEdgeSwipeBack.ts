import { useEffect } from "react";

/**
 * iOS-style edge swipe-back gesture.
 * Triggers `onBack` when the user starts the touch near the LEFT edge
 * of the screen and swipes to the right far enough.
 */
export function useEdgeSwipeBack(onBack?: () => void, opts?: {
  enabled?: boolean;
  edgeWidth?: number;   // px from the left edge to start the gesture
  minDistance?: number; // px required to trigger
  maxVerticalDrift?: number; // px allowed vertical movement
}) {
  useEffect(() => {
    if (!onBack) return;
    if (opts?.enabled === false) return;

    const edge = opts?.edgeWidth ?? 24;
    const minDist = opts?.minDistance ?? 70;
    const maxV = opts?.maxVerticalDrift ?? 80;

    let startX = 0;
    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX <= edge) {
        startX = t.clientX;
        startY = t.clientY;
        active = true;
      } else {
        active = false;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= minDist && dy <= maxV) {
        try { (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(15); } catch { /* ignore */ }
        onBack();
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onBack, opts?.enabled, opts?.edgeWidth, opts?.minDistance, opts?.maxVerticalDrift]);
}

export default useEdgeSwipeBack;