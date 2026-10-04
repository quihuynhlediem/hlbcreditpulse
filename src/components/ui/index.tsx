"use client";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { useT } from "@/i18n";

export function Btn({ variant = "primary", className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      {...p}
      className={cn(
        "w-full rounded-xl px-5 py-3.5 text-base font-semibold transition active:scale-[.99] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:border-transparent",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" && "border-2 border-primary bg-card text-primary",
        variant === "danger" && "bg-danger text-primary-foreground",
        variant === "ghost" && "text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({ children, tone = "brand", className }: { children: ReactNode; tone?: "brand" | "success" | "warning" | "muted"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "brand" && "bg-primary-soft text-primary",
        tone === "success" && "bg-success text-white",
        tone === "warning" && "bg-warning text-white",
        tone === "muted" && "bg-line text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className, tone, ...rest }: { children: ReactNode; className?: string; tone?: "soft" | "brand" | "outline" | "warn" } & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-2xl p-4",
        !tone && "bg-card",
        tone === "soft" && "bg-primary-soft",
        tone === "brand" && "bg-primary text-primary-foreground",
        tone === "outline" && "border border-line bg-card",
        tone === "warn" && "border border-warning bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton h-3 w-full", className)} aria-hidden />;
}

export function Lockup({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("flex items-center gap-2 py-1 text-xs text-muted", className)} data-testid="hlb-lockup">
      <span>{t("Được cung cấp bởi")}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hlb-logo.png" alt="Hong Leong Bank" width={88} height={17} className="h-[17px] w-[88px] object-contain" />
    </div>
  );
}

export function KV({ k, v, bold, className }: { k: ReactNode; v: ReactNode; bold?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 text-[13px]", className)}>
      <span className="text-muted">{k}</span>
      <span className={cn("text-right text-ink", bold ? "font-bold" : "font-medium")}>{v}</span>
    </div>
  );
}

export function ErrorBox({ children, onRetry, retryLabel }: { children: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  const t = useT();
  return (
    <div role="alert" className="rounded-xl border border-warning bg-card p-3 text-[13px] text-ink">
      <div>{children}</div>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold text-primary">
          {retryLabel ?? t("Thử lại")}
        </button>
      )}
    </div>
  );
}
