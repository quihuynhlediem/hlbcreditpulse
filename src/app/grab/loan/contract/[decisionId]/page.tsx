"use client";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { LenderContract } from "@/components/kit/Lender";
import { GRAB } from "@/lib/lenders";

export default function Page() { return <LenderContract cfg={GRAB} Frame={GrabFrame} />; }
