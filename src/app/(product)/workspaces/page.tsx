import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspacesPage } from "@/features/workspaces/workspaces-page";

export const metadata: Metadata = { title: "Workspaces" };
export default function WorkspacesRoute() { return <Suspense><WorkspacesPage /></Suspense>; }
