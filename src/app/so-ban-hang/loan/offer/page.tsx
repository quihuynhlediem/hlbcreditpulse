"use client";
import { LenderOffer } from "@/components/kit/Lender";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { SBH } from "@/lib/lenders";

export default function Page() { return <LenderOffer cfg={SBH} Frame={SbhFrame} />; }
