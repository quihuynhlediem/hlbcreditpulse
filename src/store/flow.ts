"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScenarioName } from "@/api/types";

export const DEFAULT_ORDER = { orderRef: "SPE-2026-0001", amount: 12_000_000, title: 'Laptop 14" Ryzen 5 / 16GB / 512GB', short: 'Laptop 14" Ryzen 5', shop: "TechZone Official Store" };

interface FlowState {
  persona: string;
  scenario: ScenarioName;
  mockBadge: boolean;
  inspectorOpen: boolean;
  entry?: string;
  ekycDone: Record<string, boolean>;
  orderAmount: number;
  offerRequestId?: string;
  packageId?: string;
  decisionId?: string;
  contractId?: string;
  loanId?: string;
  amount?: number; // driver / seller requested amount
  tenor?: number;
  set: (p: Partial<Omit<FlowState, "set" | "reset">>) => void;
  reset: () => void;
}

const initial = { persona: "cus_mai", scenario: "APPROVE" as ScenarioName, mockBadge: true, inspectorOpen: false, ekycDone: {} as Record<string, boolean>, orderAmount: DEFAULT_ORDER.amount };

export const useFlow = create<FlowState>()(
  persist(
    (set) => ({ ...initial, set: (p) => set(p), reset: () => set({ ...initial }) }),
    { name: "hlb-flow-v1" },
  ),
);
