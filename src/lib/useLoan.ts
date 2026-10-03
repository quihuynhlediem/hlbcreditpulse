"use client";
import { useLoans } from "@/api/hooks";
import type { Loan, ProductType } from "@/api/types";

/** Most recent loan of a product type for the persona (fixtures put the newest first). */
export function useProductLoan(customerRef: string, product?: ProductType) {
  const q = useLoans(customerRef);
  const loan: (Loan & { orderRef?: string }) | undefined = q.data?.find((l) => !product || l.productType === product);
  return { ...q, loan };
}

export function nextDue(loan?: Loan) {
  return loan?.schedule.find((s) => s.status === "DUE" || s.status === "LATE" || s.status === "PAUSED");
}
export function paidCount(loan?: Loan) {
  return loan?.schedule.filter((s) => s.status === "PAID").length ?? 0;
}
