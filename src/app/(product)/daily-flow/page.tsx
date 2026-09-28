import type { Metadata } from "next";
import { DailyFlowPage } from "@/features/daily-flow/daily-flow-page";

export const metadata: Metadata = { title: "Daily Flow" };
export default function DailyFlowRoute() { return <DailyFlowPage />; }
