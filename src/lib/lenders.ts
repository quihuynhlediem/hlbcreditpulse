import type { SourceId } from "@/api/types";

/** Per-partner configuration for the lender flows that share one engine (B: Grab, C: Sổ Bán Hàng). */
export interface LenderCfg {
  key: "grab" | "sbh";
  partnerId: "grab" | "so-ban-hang";
  product: "DRIVER_INSTANT_LOAN" | "SELLER_FUNDING";
  flow: "B" | "C";
  partnerName: string;
  base: string;
  source: SourceId;
  sourceLabel: string;
  min: number;
  max: number;
  step: number;
  defaultAmount: number;
  offerTitle: string;
  offerScr: string;
  decisionScr: string;
  contractScr: string;
  ekycScr: string;
  scheduleScr: string;
  schedulePath: string;
  scheduleTitle: string;
  amountLabel: string;
  repayRule: string;
  zeroRule: string;
  unlockCta: (limit: string) => string;
}

export const GRAB: LenderCfg = {
  key: "grab", partnerId: "grab", product: "DRIVER_INSTANT_LOAN", flow: "B", partnerName: "Grab", base: "/grab",
  source: "AD-07", sourceLabel: "thu nhập trên Grab",
  min: 2_000_000, max: 20_000_000, step: 500_000, defaultAmount: 8_000_000,
  offerTitle: "Vay nhanh cho tài xế", offerScr: "SCR-42", decisionScr: "SCR-45", contractScr: "SCR-45", ekycScr: "SCR-44", scheduleScr: "SCR-46",
  schedulePath: "/grab/loan/schedule", scheduleTitle: "Lịch khấu trừ",
  amountLabel: "Số tiền bạn cần",
  repayRule: "Khấu trừ một phần nhỏ mỗi kỳ nhận tiền từ Grab",
  zeroRule: "Tuần không có thu nhập, không khấu trừ.",
  unlockCta: (l) => `Dùng thu nhập Grab để tăng hạn mức lên ${l}`,
};

export const SBH: LenderCfg = {
  key: "sbh", partnerId: "so-ban-hang", product: "SELLER_FUNDING", flow: "C", partnerName: "Sổ Bán Hàng", base: "/so-ban-hang",
  source: "AD-08", sourceLabel: "doanh thu và thanh toán của cửa hàng",
  min: 5_000_000, max: 50_000_000, step: 1_000_000, defaultAmount: 30_000_000,
  offerTitle: "Vốn kinh doanh", offerScr: "SCR-53", decisionScr: "SCR-56", contractScr: "SCR-56", ekycScr: "SCR-55", scheduleScr: "SCR-57",
  schedulePath: "/so-ban-hang/funding/tracker", scheduleTitle: "Theo dõi trả nợ",
  amountLabel: "Số vốn bạn cần",
  repayRule: "Trả 10% mỗi kỳ tiền hàng về · tối thiểu mỗi 60 ngày",
  zeroRule: "Ngày không có doanh thu thì không phải trả.",
  unlockCta: (l) => `Dùng doanh thu cửa hàng để tăng hạn mức lên ${l}`,
};

export const LENDERS = { grab: GRAB, sbh: SBH } as const;
