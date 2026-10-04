import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo scaffolding is excluded from the live product build (stack rule 3; build-pack/demo-scope.md).
 * In the product, partners build the customer screens to HLB's Partner UX & Content Specification (D-64),
 * so the partner-app replicas, the launcher and the demo routes exist only when NEXT_PUBLIC_API_MODE=mock.
 */
const DEMO_ONLY = ["/demo", "/shopee", "/viettel-money", "/grab", "/so-ban-hang"];

export function proxy(req: NextRequest) {
  // The root page is the demo launcher (demo scaffolding); in the live product it opens the staff console.
  if (process.env.NEXT_PUBLIC_API_MODE === "live" && req.nextUrl.pathname === "/") return NextResponse.redirect(new URL("/creditpulse/decisions", req.url));
  if (process.env.NEXT_PUBLIC_API_MODE === "live" && DEMO_ONLY.some((p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(`${p}/`))) {
    return NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/demo/:path*", "/shopee/:path*", "/viettel-money/:path*", "/grab/:path*", "/so-ban-hang/:path*"] };
