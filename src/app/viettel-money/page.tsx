"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCreatePrescreen } from "@/api/hooks";
import { track } from "@/api/track";
import { PhoneShell } from "@/components/kit/PhoneShell";
import { Btn, Card, Lockup } from "@/components/ui";
import { VmNav } from "@/components/vm/VmFrame";
import { vnd } from "@/lib/format";
import { nextDue, useProductLoan } from "@/lib/useLoan";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";

/** SCR-20 Viettel Money home with the pre-approved HLB banner (entry A2). */
export default function VmHome() {
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const pre = useCreatePrescreen();
  const { loan } = useProductLoan(persona, "PAYMENT_INSTALLMENT");
  useEffect(() => { pre.mutate({ partnerId: "viettel-money", hashedCustomerId: `h_${persona}` }, { onSuccess: (r) => { if (r.eligible) track("prescreen_offer_shown", { partnerId: "viettel-money", rung: r.rung }); } }); }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps
  const due = nextDue(loan);
  const name = CUSTOMER_BY_REF[persona]?.name ?? "bạn";
  return (
    <PhoneShell skin="viettel" scr="SCR-20" flow="A" footer={<VmNav active="Trang chủ" />}>
      <div className="space-y-3.5 bg-primary px-4 pb-5 pt-3">
        <div className="flex items-center justify-between"><div><div className="text-xs text-primary-foreground">Xin chào,</div><div className="text-lg font-bold text-primary-foreground">Anh/chị {name}</div></div><div className="text-base font-bold text-primary-foreground">Viettel Money</div></div>
        <Card><div className="text-xs text-muted">Số dư ví</div><div className="text-[22px] font-bold">4.250.000₫</div></Card>
      </div>
      <div className="space-y-3.5 p-4">
        {pre.data?.eligible && pre.data.bandMax && (
          <Card tone="soft" className="space-y-2 border border-primary" data-testid="hlb-banner">
            <div className="text-xs font-semibold text-primary">Trả góp HLB</div>
            <div className="text-base font-bold">Bạn đã có hạn mức trả góp HLB tới {vnd(pre.data.bandMax.amount)}</div>
            <p className="text-[13px] text-muted">Dùng ngay khi thanh toán tại các sàn thương mại điện tử.</p>
            <Lockup />
            <Btn onClick={() => router.push("/shopee/checkout")}>Dùng ngay</Btn>
          </Card>
        )}
        {loan && due && (
          <Link href="/viettel-money/loans" className="block" data-testid="active-loan-card">
            <Card tone="outline" className="space-y-1"><div className="text-xs text-muted">Khoản trả góp HLB</div><div className="text-sm font-bold">Kỳ tới {due.dueDate.slice(8)}/{due.dueDate.slice(5, 7)} · {vnd(due.amount.amount)}</div></Card>
          </Link>
        )}
        <div><h2 className="mb-2 text-sm font-semibold">Dịch vụ</h2>
          <div className="grid grid-cols-4 gap-2.5">{["Chuyển tiền", "Nạp điện thoại", "Hóa đơn", "Mua sắm"].map((l) => <div key={l} className="flex flex-col items-center gap-1.5 rounded-xl bg-card px-1 py-3"><span className="h-9 w-9 rounded-full bg-primary-soft" /><span className="text-center text-[11px] font-medium">{l}</span></div>)}</div>
        </div>
      </div>
    </PhoneShell>
  );
}
