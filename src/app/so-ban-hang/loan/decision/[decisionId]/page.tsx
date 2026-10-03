"use client";
import { LenderDecision } from "@/components/kit/Lender";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { SBH } from "@/lib/lenders";

export default function Page() { return <LenderDecision cfg={SBH} Frame={SbhFrame} />; }
