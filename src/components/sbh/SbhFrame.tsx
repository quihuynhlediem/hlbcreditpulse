"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomBar, PhoneShell } from "@/components/kit/PhoneShell";
import type { FrameProps } from "@/components/grab/GrabFrame";
import { cn } from "@/lib/cn";

const NAV = [["Cửa hàng", "/so-ban-hang", "⌂"], ["Tin nhắn", "/so-ban-hang", "✉"], ["Sổ nợ", "/so-ban-hang", "▤"], ["Thu chi", "/so-ban-hang/report", "⇅"]] as const;

export function SbhNav({ active }: { active: string }) {
  return (
    <nav className="flex shrink-0 justify-between border-t border-line bg-card px-2 py-2" aria-label="Điều hướng Sổ Bán Hàng">
      {NAV.map(([l, href, g]) => (
        <Link key={l} href={href} className="flex flex-1 flex-col items-center gap-0.5">
          <span className={cn("text-lg leading-none", l === active ? "text-primary" : "text-muted")} aria-hidden>{g}</span>
          <span className={cn("text-[10px]", l === active ? "font-semibold text-primary" : "text-muted")}>{l}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Green store header from the Sổ Bán Hàng app (S-085): store name, edit link, bell. */
export function SbhHeader({ title, onBack, store = "Tạp hoá Cô Phụng" }: { title?: string; onBack?: () => void; store?: string }) {
  return (
    <div className="shrink-0 bg-primary px-4 pb-3 pt-2 text-primary-foreground">
      <div className="flex items-center gap-3">
        {onBack ? <button onClick={onBack} aria-label="Quay lại" className="text-2xl leading-none">‹</button> : <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-bold text-primary" aria-hidden>CP</span>}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold">{title ?? store}</h1>
          <div className="text-[11px]">{title ? store : "Chỉnh sửa tài khoản ›"}</div>
        </div>
        <span className="text-lg" aria-hidden>🔔</span>
      </div>
    </div>
  );
}

/** Sổ Bán Hàng app frame (partner-owned screens). */
export function SbhFrame({ scr, title, back, footer, nav, children }: FrameProps) {
  const router = useRouter();
  return (
    <PhoneShell skin="sbh" scr={scr} flow="C" footer={footer ? <BottomBar>{footer}</BottomBar> : nav ? <SbhNav active={nav} /> : undefined}>
      <SbhHeader title={title} onBack={back ? (typeof back === "string" ? () => router.push(back) : back) : undefined} />
      {children}
    </PhoneShell>
  );
}
