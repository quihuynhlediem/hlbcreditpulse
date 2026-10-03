"use client";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { LenderOffer } from "@/components/kit/Lender";
import { GRAB } from "@/lib/lenders";

export default function Page() { return <LenderOffer cfg={GRAB} Frame={GrabFrame} />; }
