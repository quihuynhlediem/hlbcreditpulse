"use client";
import { PhoneShell } from "@/components/kit/PhoneShell";
import { HlbWalletCards } from "@/components/kit/HlbWalletCards";
import { Card } from "@/components/ui";
import { VmNav } from "@/components/vm/VmFrame";
import { useT, tKey } from "@/i18n";
import { vnd } from "@/lib/format";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";

/** SCR-20 Viettel Money home with the pre-approved HLB banner (entry A2). */
export default function VmHome() {
  const t = useT();
  const persona = useFlow((s) => s.persona);
  const name = CUSTOMER_BY_REF[persona]?.name ?? t("bạn");
  return (
    <PhoneShell skin="viettel" scr="SCR-20" flow="A" footer={<VmNav active={tKey("Trang chủ")} />}>
      <div className="space-y-3.5 bg-primary px-4 pb-5 pt-3">
        <div className="flex items-center justify-between"><div><div className="text-xs text-primary-foreground">{t("Xin chào,")}</div><div className="text-lg font-bold text-primary-foreground">{t("Anh/chị {0}", t(name))}</div></div><div className="text-base font-bold text-primary-foreground">Viettel Money</div></div>
        <Card><div className="text-xs text-muted">{t("Số dư ví")}</div><div className="text-[22px] font-bold">{vnd(4_250_000)}</div></Card>
      </div>
      <div className="space-y-3.5 p-4">
        <HlbWalletCards />
        <div><h2 className="mb-2 text-sm font-semibold">{t("Dịch vụ")}</h2>
          <div className="grid grid-cols-4 gap-2.5">{[tKey("Chuyển tiền"), tKey("Nạp điện thoại"), tKey("Hóa đơn"), tKey("Mua sắm")].map((l) => <div key={l} className="flex flex-col items-center gap-1.5 rounded-xl bg-card px-1 py-3"><span className="h-9 w-9 rounded-full bg-primary-soft" /><span className="text-center text-[11px] font-medium">{t(l)}</span></div>)}</div>
        </div>
      </div>
    </PhoneShell>
  );
}
