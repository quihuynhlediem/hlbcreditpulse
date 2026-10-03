/** Vietnamese money formatting: whole VND with "." thousands and the ₫ sign. */
export function vnd(amount: number): string {
  const s = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} ₫`;
}

export function vndCompact(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}₫`;
}

/** 0.125 -> "12,5%/năm" (Vietnamese decimal comma). */
export function eirText(eir: number): string {
  if (eir === 0) return "0%";
  return `${(eir * 100).toFixed(1).replace(".", ",")}%/năm`;
}

export function dmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
