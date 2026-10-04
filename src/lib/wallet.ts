"use client";
import { usePathname } from "next/navigation";
import type { PartnerId } from "@/api/types";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useT } from "@/i18n";
import { useFlow } from "@/store/flow";

/**
 * Viettel Money, Grab and Sổ Bán Hàng are e-wallets with the same function: point-of-purchase lending at an
 * e-commerce checkout (R-28, D-81). They differ by the customer segment they reach, their own data and their look.
 */
export interface Wallet {
  partnerId: PartnerId;
  name: string;
  /** Route prefix of the wallet's own screens. */
  base: string;
}

export const WALLETS: Record<PartnerId, Wallet> = {
  "viettel-money": { partnerId: "viettel-money", name: "Viettel Money", base: "/viettel-money" },
  grab: { partnerId: "grab", name: "Grab", base: "/grab" },
  "so-ban-hang": { partnerId: "so-ban-hang", name: "Sổ Bán Hàng", base: "/so-ban-hang" },
};

/** The wallet whose screens the current route belongs to. */
export function useWallet(): Wallet {
  const path = usePathname() ?? "";
  if (path.startsWith("/grab")) return WALLETS.grab;
  if (path.startsWith("/so-ban-hang")) return WALLETS["so-ban-hang"];
  return WALLETS["viettel-money"];
}

/** The shopper's own wallet, from the persona (the Shopee checkout lists only this wallet, D-82). */
export function useShopperWallet(): Wallet {
  const persona = useFlow((s) => s.persona);
  return WALLETS[CUSTOMER_BY_REF[persona]?.partnerId ?? "viettel-money"];
}

export interface OrderItem { orderRef: string; title: string; short: string; shop: string }
const SHOP = "TechZone Official Store";
const ITEMS: Record<PartnerId, OrderItem> = {
  "viettel-money": { orderRef: "SPE-2026-0001", title: 'Laptop 14" Ryzen 5 / 16GB / 512GB', short: 'Laptop 14" Ryzen 5', shop: SHOP },
  grab: { orderRef: "SPE-2026-0001", title: 'Điện thoại di động 6.7" 8GB / 256GB', short: "Điện thoại di động 6.7\"", shop: SHOP },
  "so-ban-hang": { orderRef: "SPE-2026-0001", title: "Máy in hóa đơn + đầu đọc mã vạch", short: "Máy in hóa đơn + đầu đọc", shop: SHOP },
};
/** What the shopper is buying (it follows the persona so each story reads naturally). */
export function useOrder(): OrderItem {
  const t = useT();
  const o = ITEMS[useShopperWallet().partnerId];
  return { ...o, title: t(o.title), short: t(o.short) };
}
