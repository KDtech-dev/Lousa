import { useCallback, useEffect, useRef } from "react";
import { useBlocker, type BlockerFunction } from "react-router-dom";

export function useUnsavedChanges(when: boolean) {
  const pending = useRef(when);
  pending.current = when;
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      pending.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
    [],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!when) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [when]);

  return blocker;
}
