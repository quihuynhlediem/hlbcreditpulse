"use client";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { LenderDecision } from "@/components/kit/Lender";
import { GRAB } from "@/lib/lenders";

export default function Page() { return <LenderDecision cfg={GRAB} Frame={GrabFrame} />; }
