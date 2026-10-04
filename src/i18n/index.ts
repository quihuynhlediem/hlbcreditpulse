"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EN } from "./en";

/**
 * EN/VI switch for the HLB-built UIs and the partner flow kit (R-26, D-80). English is the default.
 * Vietnamese copy is the source text (Step 09 is written in the users' Vietnamese), so it doubles as the
 * message key: `t("Đặt hàng")` returns the English entry when the locale is `en`. Keys with `{0}`, `{1}`…
 * are templates; the same table translates API content (content pack, reason texts) by pattern.
 */
export type Locale = "en" | "vi";

let current: Locale = "en";
export const getLocale = () => current;
/** Sets the module locale without the store (unit tests, server-side rendering). */
export const setLocaleNow = (l: Locale) => { current = l; };

export const useLocale = create<{ locale: Locale; setLocale: (l: Locale) => void }>()(
  persist(
    (set) => ({ locale: "en", setLocale: (l) => { current = l; set({ locale: l }); } }),
    { name: "hlb-lang", onRehydrateStorage: () => (s) => { if (s) current = s.locale; } },
  ),
);

const fill = (s: string, args: (string | number)[]) => s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));

/** Translates Vietnamese source copy into the active locale and fills `{n}` placeholders. */
export function t(vi: string, ...args: (string | number)[]): string {
  if (current === "vi") return fill(vi, args);
  return fill(EN[vi] ?? trPattern(vi) ?? vi, args);
}

/** Lower-cases the first letter of a name used mid-sentence, keeping acronyms ("HLB salary account" stays, "Wallet history" → "wallet history"). */
export const lc = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s);

/** Subscribes the component to locale changes and returns `t`. */
export function useT() {
  useLocale((s) => s.locale);
  return t;
}

/* ---------- pattern translation for dynamic text (API content, composed strings) ---------- */
interface Pat { re: RegExp; en: string }
let pats: Pat[] | null = null;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function patterns(): Pat[] {
  if (pats) return pats;
  pats = Object.entries(EN)
    .filter(([k]) => /\{\d+\}/.test(k))
    .sort((a, b) => b[0].length - a[0].length)
    .flatMap(([k, en]) => {
      try { return [{ re: new RegExp("^" + esc(k).replace(/\\\{(\d+)\\\}/g, "(?<g$1>[\\s\\S]+?)") + "$"), en }]; } catch { return []; }
    });
  return pats;
}
/** Vietnamese "12.000.000 ₫" → "12,000,000 ₫"; "12,5%" → "12.5%". */
export function enNumbers(s: string): string {
  return s.replace(/\d{1,3}(?:\.\d{3})+(?=\s?₫)/g, (m) => m.replace(/\./g, ",")).replace(/(\d),(\d)%/g, "$1.$2%");
}
function trPattern(vi: string): string | undefined {
  for (const p of patterns()) {
    const m = p.re.exec(vi);
    if (m?.groups) return p.en.replace(/\{(\d+)\}/g, (_, i) => tr(m.groups![`g${i}`] ?? "", "en"));
  }
  return undefined;
}

/** Translates one string from the Vietnamese source into `locale` (exact entry, then pattern, then numbers only). */
export function tr(vi: string, locale: Locale = current): string {
  if (locale === "vi" || !vi) return vi;
  const exact = EN[vi];
  if (exact !== undefined) return exact;
  const lower = EN[vi.charAt(0).toUpperCase() + vi.slice(1)];
  if (lower !== undefined && /^[a-zà-ỹ]/.test(vi)) return lower.charAt(0).toLowerCase() + lower.slice(1);
  return trPattern(vi) ?? enNumbers(vi);
}

const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/;
/** Deep-translates every Vietnamese string in an API payload (the mock serves the content pack in the requested language). */
export function trDeep<T>(v: T, locale: Locale): T {
  if (locale === "vi") return v;
  if (typeof v === "string") return (VI_CHARS.test(v) || /\d\.\d{3}/.test(v) ? tr(v, locale) : v) as T;
  if (Array.isArray(v)) return v.map((x) => trDeep(x, locale)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trDeep(x, locale)])) as T;
  return v;
}
