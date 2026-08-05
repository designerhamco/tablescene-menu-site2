"use client";

import { useEffect, useRef, useState } from "react";

export function useTimeSaleNow(initialNowMs: number, enabled: boolean) {
  const realStartMsRef = useRef(0);
  const logicalStartMsRef = useRef(initialNowMs);
  const [nowMs, setNowMs] = useState(initialNowMs);

  useEffect(() => {
    realStartMsRef.current = Date.now();
    logicalStartMsRef.current = initialNowMs;
    const updateNow = () => setNowMs(logicalStartMsRef.current + (Date.now() - realStartMsRef.current));
    updateNow();
    if (!enabled) return;

    const intervalId = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(intervalId);
  }, [enabled, initialNowMs]);

  return nowMs;
}
