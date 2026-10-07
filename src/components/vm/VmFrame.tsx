"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomBar, Header, PhoneShell } from "@/components/kit/PhoneShell";
import { cn } from "@/lib/cn";
import { useT, tKey } from "@/i18n";

export function VmNav({ active }: { active: string }) {
  const t = useT();
  const items = [[tKey("Trang chủ"), "/viettel-money"], [tKey("Ưu đãi"), "/viettel-money"], [tKey("Quét QR"), "/viettel-money"], [tKey("Hạn mức"), "/viettel-money/limit?from=hub"], [tKey("Tài khoản"), "/viettel-money/privacy"]] as const;
  return (
    <nav className="flex shrink-0 justify-between border-t border-line bg-card px-2 py-2.5" aria-label={t("Điều hướng ví")}>
      {items.map(([l, href]) => (
        <Link key={l} href={href} className="flex flex-1 flex-col items-center gap-1">
          <span className={cn("h-[22px] w-[22px] rounded-md", l === active ? "bg-primary" : "bg-line")} />
          <span className={cn("text-[10px]", l === active ? "font-semibold text-primary" : "text-muted")}>{t(l)}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Viettel Money screen frame: white header + scrollable body + optional footer. */
export function VmFrame({ scr, title, back, children, footer, nav }: { scr: string; title?: string; back?: string | (() => void); children: React.ReactNode; footer?: React.ReactNode; nav?: string }) {
  const router = useRouter();
  const t = useT();
  return (
    <PhoneShell skin="viettel" scr={scr} flow="A" footer={footer ? <BottomBar>{footer}</BottomBar> : nav ? <VmNav active={nav} /> : undefined}>
      {title && <Header title={t(title)} onBack={back ? (typeof back === "string" ? () => router.push(back) : back) : undefined} />}
      {children}
    </PhoneShell>
  );
}
