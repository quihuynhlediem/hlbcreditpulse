"use client";
import type { ReactNode } from "react";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { VmFrame } from "@/components/vm/VmFrame";
import { useWallet } from "@/lib/wallet";

interface Props { scr: string; title?: string; back?: string | (() => void); footer?: ReactNode; nav?: "home" | "account"; children: ReactNode }

/** The same screen in the look of the current wallet (Viettel Money, Grab or Sổ Bán Hàng). */
export function WalletFrame({ nav, ...p }: Props) {
  const w = useWallet();
  if (w.partnerId === "grab") return <GrabFrame {...p} nav={nav === "home" ? "Trang chủ" : nav === "account" ? "Tài khoản" : undefined} />;
  if (w.partnerId === "so-ban-hang") return <SbhFrame {...p} nav={nav === "home" ? "Cửa hàng" : undefined} />;
  return <VmFrame {...p} nav={nav === "home" ? "Trang chủ" : nav === "account" ? "Tài khoản" : undefined} />;
}
