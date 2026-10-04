"use client";
import { useEffect } from "react";
import { create } from "zustand";

/**
 * Presenter events: things that happen outside the customer's screen in production (the marketplace seller
 * answers a return request). Pages register them here and the
 * presenter bar shows them, so the product screens carry no simulation buttons (R-27).
 */
export interface PresenterAction { id: string; label: string; run: () => void; disabled?: boolean }

export const usePresenter = create<{ actions: PresenterAction[]; set: (a: PresenterAction[]) => void }>()((set) => ({ actions: [], set: (actions) => set({ actions }) }));

export function usePresenterActions(actions: PresenterAction[], deps: unknown[]) {
  const set = usePresenter((s) => s.set);
  useEffect(() => {
    set(actions);
    return () => set([]);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
