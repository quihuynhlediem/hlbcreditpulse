"use client";
import { LenderEkyc } from "@/components/kit/Lender";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { SBH } from "@/lib/lenders";

export default function Page() { return <LenderEkyc cfg={SBH} Frame={SbhFrame} />; }
