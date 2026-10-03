"use client";
import { LenderContract } from "@/components/kit/Lender";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { SBH } from "@/lib/lenders";

export default function Page() { return <LenderContract cfg={SBH} Frame={SbhFrame} />; }
