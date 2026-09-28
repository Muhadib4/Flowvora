import type { Metadata } from "next";
import { FocusPage } from "@/features/focus/focus-page";

export const metadata: Metadata = { title: "Focus" };
export default function FocusRoute() { return <FocusPage />; }
