import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";
import { getLocale } from "@/i18n";

/** Set by each screen so the API inspector can show which screen a call affects. */
let currentScreen = "";
export function setCurrentScreen(scr: string) {
  currentScreen = scr;
}
let currentFlow = "";
export function setCurrentFlow(flow: string) {
  currentFlow = flow;
}

const screenHeader: Middleware = {
  onRequest({ request }) {
    if (currentScreen) request.headers.set("x-demo-screen", currentScreen);
    if (currentFlow) request.headers.set("x-demo-flow", currentFlow);
    request.headers.set("Accept-Language", getLocale());
    return request;
  },
};

export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.creditpulse.example",
});
client.use(screenHeader);

export class ApiError extends Error {
  status: number;
  type?: string;
  detail?: string;
  constructor(status: number, title: string, type?: string, detail?: string) {
    super(title);
    this.status = status;
    this.type = type;
    this.detail = detail;
  }
}

/** Unwraps an openapi-fetch result: returns data or throws an ApiError built from problem+json. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await p;
  if (error || data === undefined) {
    const e = (error ?? {}) as { title?: string; type?: string; detail?: string };
    throw new ApiError(response.status, e.title ?? "Request failed", e.type, e.detail);
  }
  return data;
}

/** A fresh Idempotency-Key per logical write (AC-35.2). Retries of the same mutation must reuse the returned value. */
export const idem = () => ({ "Idempotency-Key": typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}` });
