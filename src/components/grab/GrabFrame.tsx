"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomBar, Header, PhoneShell } from "@/components/kit/PhoneShell";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n";

export interface FrameProps { scr: string; title?: string; back?: string | (() => void); footer?: React.ReactNode; nav?: string; children: React.ReactNode }

const NAV = [["Trang chủ", "/grab", "⌂"], ["Hoạt động", "/grab", "☰"], ["Thu nhập", "/grab/earnings", "₫"], ["Tài khoản", "/grab", "☺"]] as const;

export function GrabNav({ active }: { active: string }) {
  const t = useT();
  return (
    <nav className="flex shrink-0 justify-between border-t border-line bg-card px-2 py-2" aria-label={t("Điều hướng Grab")}>
      {NAV.map(([l, href, g]) => (
        <Link key={l} href={href} className="flex flex-1 flex-col items-center gap-0.5">
          <span className={cn("text-lg leading-none", l === active ? "text-primary" : "text-muted")} aria-hidden>{g}</span>
          <span className={cn("text-[10px]", l === active ? "font-semibold text-primary" : "text-muted")}>{t(l)}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Grab driver app frame (partner-owned screens; HLB only appears as the named lender). */
export function GrabFrame({ scr, title, back, footer, nav, children }: FrameProps) {
  const router = useRouter();
  const t = useT();
  return (
    <PhoneShell skin="grab" scr={scr} flow="B" footer={footer ? <BottomBar>{footer}</BottomBar> : nav ? <GrabNav active={nav} /> : undefined}>
      {title && <Header title={t(title)} onBack={back ? (typeof back === "string" ? () => router.push(back) : back) : undefined} />}
      {children}
    </PhoneShell>
  );
}
