/** Analytics wrapper (Step 11 §8). Event names are `object_action`. No-op console in mock mode. */
export function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  (window as unknown as { __events?: unknown[] }).__events ??= [];
  (window as unknown as { __events: unknown[] }).__events.push({ event, props, at: Date.now() });
  if (process.env.NEXT_PUBLIC_API_MODE === "mock") console.debug("[track]", event, props);
}
