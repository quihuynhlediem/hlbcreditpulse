"use client";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { LenderEkyc } from "@/components/kit/Lender";
import { GRAB } from "@/lib/lenders";

export default function Page() { return <LenderEkyc cfg={GRAB} Frame={GrabFrame} />; }
