"use client";
import { useState } from "react";
import { useCreateEkyc } from "@/api/hooks";
import { track } from "@/api/track";
import { Btn, ErrorBox, Lockup } from "@/components/ui";
import { useT, tKey } from "@/i18n";
import { BottomBar } from "./PhoneShell";

type Phase = "idle" | "reading" | "matching" | "passed";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** NFC chip + face match (simulated, F-05). 3 chip failures open the capture fallback; 3 face failures offer another payment method. */
export function EkycFlow({ customerRef, onPassed, onCancel, cancelLabel = tKey("Chọn cách thanh toán khác") }: { customerRef: string; onPassed: () => void; onCancel: () => void; cancelLabel?: string }) {
  const t = useT();
  const ekyc = useCreateEkyc();
  const [phase, setPhase] = useState<Phase>("idle");
  const [chipFails, setChipFails] = useState(0);
  const [faceFails, setFaceFails] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(method: "NFC_CHIP" | "CAPTURE_FALLBACK") {
    setMsg(null);
    setPhase("reading");
    await sleep(700);
    setPhase("matching");
    await sleep(600);
    try {
      const r = await ekyc.mutateAsync({ customerRef, method, chipPayloadRef: method === "NFC_CHIP" ? "chip_demo" : undefined, faceCaptureRef: "face_demo" });
      if (r.status === "PASSED") {
        setPhase("passed");
        track("ekyc_completed", { method, result: "PASSED" });
        await sleep(500);
        onPassed();
        return;
      }
      setPhase("idle");
      track("ekyc_completed", { method, result: r.status });
      if (method === "NFC_CHIP") {
        const n = chipFails + 1;
        setChipFails(n);
        if (n >= 3) { setFallback(true); setMsg(tKey("Điện thoại chưa đọc được chip CCCD. Bạn có thể thử lại hoặc chụp CCCD và quét khuôn mặt.")); }
        else setMsg(tKey("Chưa đọc được chip. Đặt thẻ sát mặt sau điện thoại và giữ yên."));
      } else {
        const n = faceFails + 1;
        setFaceFails(n);
        setMsg(tKey("Chưa khớp khuôn mặt. Bạn hãy thử lại ở nơi đủ sáng."));
      }
    } catch {
      setPhase("idle");
      setMsg(tKey("Chưa thể kết nối lúc này. Dữ liệu của bạn vẫn an toàn."));
    }
  }

  const steps = [
    { label: t("Đọc chip CCCD"), done: phase === "matching" || phase === "passed" },
    { label: t("So khớp khuôn mặt"), done: phase === "passed" },
  ];
  const title = t(phase === "reading" ? tKey("Đang đọc chip CCCD…") : phase === "matching" ? tKey("Đang so khớp khuôn mặt…") : phase === "passed" ? tKey("Đã xác thực danh tính") : fallback ? tKey("Chụp CCCD và quét khuôn mặt") : tKey("Đặt CCCD gắn chip sát mặt sau điện thoại"));
  return (
    <>
      <div className="flex flex-1 flex-col items-center gap-4 p-5" data-testid="ekyc">
        <div className="grid h-60 w-40 place-items-center rounded-[20px] border-2 border-primary bg-primary-soft">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-card px-3 py-2 text-xs font-semibold">{t("CCCD gắn chip")}<span className="h-6 w-6 rounded-full bg-primary" /></div>
        </div>
        <h2 className="text-center text-base font-bold text-ink" role="status">{title}</h2>
        <p className="text-center text-[13px] text-muted">{t("Giữ yên vài giây. Sau đó bạn sẽ quét khuôn mặt.")}</p>
        <div className="w-full space-y-2 rounded-xl bg-card p-3.5">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 text-[13px]">
              <span className={`h-4 w-4 rounded-full ${s.done ? "bg-success" : "bg-line"}`} />
              <span className={s.done ? "font-semibold" : ""}>{s.label}</span>
            </div>
          ))}
        </div>
        {msg && <ErrorBox>{t(msg)}</ErrorBox>}
      </div>
      <BottomBar>
        <Lockup />
        {faceFails >= 3 ? (
          <Btn onClick={onCancel}>{t(cancelLabel)}</Btn>
        ) : (
          <>
            <Btn disabled={phase !== "idle"} onClick={() => run(fallback ? "CAPTURE_FALLBACK" : "NFC_CHIP")}>{phase !== "idle" ? t("Đang xác thực…") : chipFails > 0 || faceFails > 0 ? t("Thử lại") : t("Bắt đầu quét")}</Btn>
            {!fallback && chipFails > 0 && <Btn variant="secondary" onClick={() => { setFallback(true); setMsg(null); }}>{t("Chụp CCCD thay thế")}</Btn>}
            {fallback && faceFails > 0 && <Btn variant="secondary" onClick={onCancel}>{t(cancelLabel)}</Btn>}
          </>
        )}
      </BottomBar>
    </>
  );
}
