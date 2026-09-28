"use client";

import { CommandPalette } from "./command-palette";
import { QuickCreate } from "./quick-create";
import { TaskDetail } from "./task-detail";

export function GlobalOverlays() {
  return <><CommandPalette /><QuickCreate /><TaskDetail /></>;
}
