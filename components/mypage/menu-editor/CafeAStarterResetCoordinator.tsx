"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CafeAStarterResetSnapshot } from "@/lib/cafe-a-starter-reset";

type CafeAStarterResetState = {
  snapshot: CafeAStarterResetSnapshot | null;
  resetVersion: number;
  resetKey: string | null;
  applySnapshot: (snapshot: CafeAStarterResetSnapshot) => void;
  clearSnapshot: () => void;
};

const CafeAStarterResetContext = createContext<CafeAStarterResetState | null>(null);

function getStorageKey(menuId: string) {
  return `tablescene:cafe-a-starter-reset:${menuId}`;
}

function isReloadNavigation() {
  if (typeof window === "undefined") return false;
  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === "reload";
}

export function CafeAStarterResetProvider({ menuId, children }: { menuId: string; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<CafeAStarterResetSnapshot | null>(null);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    const storageKey = getStorageKey(menuId);
    if (isReloadNavigation()) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return;

    let frameId = 0;
    try {
      const parsed = JSON.parse(stored) as { snapshot?: CafeAStarterResetSnapshot; resetVersion?: number };
      if (parsed?.snapshot) {
        frameId = window.requestAnimationFrame(() => {
          setSnapshot(parsed.snapshot ?? null);
          setResetVersion(Number.isFinite(parsed.resetVersion) ? Number(parsed.resetVersion) : 1);
        });
      }
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }

    return () => window.cancelAnimationFrame(frameId);
  }, [menuId]);

  const applySnapshot = useCallback((nextSnapshot: CafeAStarterResetSnapshot) => {
    setSnapshot(nextSnapshot);
    setResetVersion((current) => {
      const nextVersion = current + 1;
      window.sessionStorage.setItem(
        getStorageKey(menuId),
        JSON.stringify({
          resetVersion: nextVersion,
          snapshot: nextSnapshot,
        }),
      );
      return nextVersion;
    });
  }, [menuId]);

  const clearSnapshot = useCallback(() => {
    setSnapshot(null);
    setResetVersion(0);
    window.sessionStorage.removeItem(getStorageKey(menuId));
  }, [menuId]);

  const value = useMemo<CafeAStarterResetState>(
    () => ({
      snapshot,
      resetVersion,
      resetKey: snapshot ? `${menuId}:${resetVersion}` : null,
      applySnapshot,
      clearSnapshot,
    }),
    [applySnapshot, clearSnapshot, menuId, resetVersion, snapshot],
  );

  return <CafeAStarterResetContext.Provider value={value}>{children}</CafeAStarterResetContext.Provider>;
}

export function useCafeAStarterResetCoordinator() {
  return useContext(CafeAStarterResetContext);
}
