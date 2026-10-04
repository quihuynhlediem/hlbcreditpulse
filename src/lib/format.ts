import { getLocale } from "@/i18n";

const group = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, getLocale() === "en" ? "," : ".");

/** Whole VND with the ₫ sign: "12.000.000 ₫" in Vietnamese, "12,000,000 ₫" in English. */
export function vnd(amount: number): string {
  return `${group(amount)} ₫`;
}

export function vndCompact(amount: number): string {
  return `${group(amount)}₫`;
}

/** 0.125 -> "12,5%/năm" (Vietnamese decimal comma) or "12.5% p.a.". */
export function eirText(eir: number): string {
  if (eir === 0) return "0%";
  const v = (eir * 100).toFixed(1);
  return getLocale() === "en" ? `${v}% p.a.` : `${v.replace(".", ",")}%/năm`;
}

export function dmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Decimal with the locale's separator: 4.1 -> "4,10" (vi) / "4.10" (en). */
export function dec(n: number, digits = 2): string {
  const s = n.toFixed(digits);
  return getLocale() === "en" ? s : s.replace(".", ",");
}

/** Percent with the locale's separator: 0.031 -> "3,1%" / "3.1%". */
export function pct(n: number | undefined, digits = 1): string {
  return n === undefined ? "—" : `${dec(n * 100, digits)}%`;
}
