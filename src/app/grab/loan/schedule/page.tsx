"use client";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { LenderSchedule } from "@/components/kit/Lender";
import { GRAB } from "@/lib/lenders";

export default function Page() { return <LenderSchedule cfg={GRAB} Frame={GrabFrame} />; }
