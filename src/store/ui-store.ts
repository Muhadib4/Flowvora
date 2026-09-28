"use client";

import { create } from "zustand";
import type { TaskId } from "@/domain/types";

interface UiState {
  commandOpen: boolean;
  quickCreateOpen: boolean;
  mobileNavOpen: boolean;
  selectedTaskId: TaskId | null;
  setCommandOpen: (open: boolean) => void;
  setQuickCreateOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSelectedTaskId: (id: TaskId | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false, quickCreateOpen: false, mobileNavOpen: false, selectedTaskId: null,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setQuickCreateOpen: (quickCreateOpen) => set({ quickCreateOpen }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
}));
