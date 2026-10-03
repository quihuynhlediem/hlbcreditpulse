"use client";
import { LenderSchedule } from "@/components/kit/Lender";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { SBH } from "@/lib/lenders";

/** SCR-57 repayment tracker. */
export default function Page() { return <LenderSchedule cfg={SBH} Frame={SbhFrame} />; }
