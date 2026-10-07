import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

/**
 * EN/VI switch for the HLB-built UIs and the partner flow kit (R-26, D-80), on i18next. English is the default.
 * Vietnamese copy is the source text (Step 09 is written in the users' Vietnamese), so it doubles as the
 * message key: `t("Đặt hàng")` returns the English entry when the locale is `en`. `{0}`, `{1}`… are positional
 * placeholders (`t("Xin chào, {0}", name)`); `{count}` selects plural forms (`t("Còn {count} giờ", { count })`).
 * Keys with placeholders also translate API content by pattern (`tr`, `trDeep`).
 * Catalogues: ./locales/{en,vi}.json, maintained with `pnpm i18n:extract` (i18next-cli).
 */
export type Locale = "en" | "vi";
export const LOCALES: readonly Locale[] = ["en", "vi"];
const STORAGE_KEY = "hlb-lang";

export const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  lng: "en",
  supportedLngs: LOCALES,
  fallbackLng: false,
  resources: { en: { translation: en }, vi: { translation: vi } },
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  interpolation: { prefix: "{", suffix: "}", escapeValue: false },
  react: { useSuspense: false },
  initAsync: false,
  saveMissing: process.env.NODE_ENV === "development",
  // Only Vietnamese keys are real gaps; already-English API values and names also pass through t().
  missingKeyHandler: (lngs, _ns, key) => {
    if (lngs.includes("en") && VI_CHARS.test(key)) console.warn("[i18n] missing EN:", key);
  },
});
if (typeof document !== "undefined") i18n.on("languageChanged", (l) => { document.documentElement.lang = l; });

export const getLocale = (): Locale => (i18n.language === "vi" ? "vi" : "en");
/** Sets the locale synchronously (unit tests). */
export const setLocaleNow = (l: Locale) => { void i18n.changeLanguage(l); };

/** Switches language and remembers it; resolves once applied, so API calls made afterwards ask for the new language. */
export async function setLocale(l: Locale) {
  try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* storage blocked: not remembered */ }
  await i18n.changeLanguage(l);
}

/** Applies the remembered language after mount, so the server render and the first client render match. */
export function restoreLocale() {
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* storage blocked */ }
  let l: string | null | undefined = saved;
  // Earlier builds stored `{"state":{"locale":"vi"}}` under the same key.
  if (saved?.startsWith("{")) { try { l = (JSON.parse(saved) as { state?: { locale?: string } }).state?.locale; } catch { l = null; } }
  if (l === "en" || l === "vi") void i18n.changeLanguage(l);
  document.documentElement.lang = getLocale();
}

type Arg = string | number | null | undefined;
type Named = Record<string, Arg>;
const toVars = (args: Arg[] | [Named]): Named | undefined =>
  !args.length ? undefined : typeof args[0] === "object" && args[0] !== null ? (args[0] as Named) : Object.fromEntries((args as Arg[]).map((a, i) => [String(i), String(a)])); // like a template literal
const fill = (s: string, v?: Named) => (v ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k] ?? "") : m)) : s);

/** Translates Vietnamese source copy into the active locale and fills `{0}`… (or named) placeholders. */
export function t(vi: string, ...args: Arg[]): string;
export function t(vi: string, named: Named): string;
export function t(vi: string, ...args: Arg[] | [Named]): string {
  const v = toVars(args);
  if (getLocale() === "en" && !i18n.exists(vi, v)) {
    // Not a catalogue key: a key that matches a template (composed text) still translates by pattern.
    const p = trPattern(vi);
    if (p) return fill(p, v);
  }
  return i18n.t(vi, v);
}

/**
 * Marks Vietnamese source text for extraction without translating it (data constants, mock content).
 * Returns the Vietnamese text with placeholders filled; render it with `t(value)` or `tr(value)`.
 */
export function tKey(vi: string, ...args: Arg[]): string {
  return fill(vi, toVars(args));
}

/** Lower-cases the first letter of a name used mid-sentence, keeping acronyms ("HLB salary account" stays, "Wallet history" → "wallet history"). */
export const lc = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s);

/** Subscribes the component to language changes and returns `t`. */
export function useT() {
  useTranslation();
  return t;
}

/** The active locale and a setter; the component re-renders when the language changes. */
export function useLocale() {
  useTranslation();
  return { locale: getLocale(), setLocale };
}

/* ---------- pattern translation for dynamic text (API content, composed strings) ---------- */
const EN = en as Record<string, string>;
interface Pat { re: RegExp; en: string }
let pats: Pat[] | null = null;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function patterns(): Pat[] {
  if (pats) return pats;
  pats = Object.entries(EN)
    .filter(([k, v]) => v && /\{\d+\}/.test(k))
    .sort((a, b) => b[0].length - a[0].length)
    .flatMap(([k, v]) => {
      try { return [{ re: new RegExp("^" + esc(k).replace(/\\\{(\d+)\\\}/g, "(?<g$1>[\\s\\S]+?)") + "$"), en: v }]; } catch { return []; }
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
export function tr(vi: string, locale: Locale = getLocale()): string {
  if (locale === "vi" || !vi) return vi;
  const exact = EN[vi];
  if (exact) return exact;
  const lower = EN[vi.charAt(0).toUpperCase() + vi.slice(1)];
  if (lower && /^[a-zà-ỹđ]/.test(vi)) return lc(lower);
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
