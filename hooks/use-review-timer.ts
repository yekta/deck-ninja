import * as React from "react";

const MAX_DURATION_MS = 1000 * 60 * 5; // 5 minutes

/**
 * Measures how long a card has been visible to the user.
 *
 * - Monotonic (performance.now)
 * - Visibility-aware (pauses while tab is hidden)
 * - Capped at 5 minutes to protect against AFK
 * - Resets whenever cardId changes
 *
 * Call getElapsedMs() synchronously at the moment of the rating click,
 * before firing any async mutation, so network latency is excluded.
 */
export function useReviewTimer(cardId: string | null | undefined) {
  const startRef = React.useRef<number | null>(null);
  const accumulatedRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (cardId == null) {
      startRef.current = null;
      accumulatedRef.current = 0;
      return;
    }

    accumulatedRef.current = 0;
    startRef.current =
      document.visibilityState === "visible" ? performance.now() : null;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (startRef.current != null) {
          accumulatedRef.current += performance.now() - startRef.current;
          startRef.current = null;
        }
      } else {
        if (startRef.current == null) {
          startRef.current = performance.now();
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [cardId]);

  const getElapsedMs = React.useCallback(() => {
    let total = accumulatedRef.current;
    if (startRef.current != null) {
      total += performance.now() - startRef.current;
    }
    return Math.min(Math.round(total), MAX_DURATION_MS);
  }, []);

  return { getElapsedMs };
}
