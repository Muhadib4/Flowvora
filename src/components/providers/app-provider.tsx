"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { TooltipProvider } from "@/components/ui";
import { isTextInput } from "@/lib/utils";
import { flushFlowvoraPersistence, useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrationStatus = useFlowvoraStore((state) => state.hydrationStatus);
  const storageMessage = useFlowvoraStore((state) => state.storageMessage);
  const settings = useFlowvoraStore((state) => state.data.settings);
  const undoEntries = useFlowvoraStore((state) => state.undoEntries);
  const hydrate = useFlowvoraStore((state) => state.hydrate);
  const undo = useFlowvoraStore((state) => state.undo);
  const dismissUndo = useFlowvoraStore((state) => state.dismissUndo);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setQuickCreateOpen = useUiStore((state) => state.setQuickCreateOpen);
  const shownUndo = useRef(new Set<string>());
  const shownStorageMessage = useRef<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.compact = settings.compactMode ? "true" : "false";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.compactMode, settings.theme]);

  useEffect(() => {
    const flush = () => flushFlowvoraPersistence();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  useEffect(() => {
    if (!storageMessage || shownStorageMessage.current === storageMessage) return;
    shownStorageMessage.current = storageMessage;
    toast.warning("Local storage needs attention", { description: "Flowvora is still usable in this tab. Your previous saved state could not be loaded." });
  }, [storageMessage]);

  useEffect(() => {
    for (const entry of undoEntries) {
      if (shownUndo.current.has(entry.id)) continue;
      shownUndo.current.add(entry.id);
      toast(entry.label, {
        description: "The change was saved locally.",
        action: { label: "Undo", onClick: () => undo(entry.id) },
        onDismiss: () => dismissUndo(entry.id),
        duration: 6000,
      });
    }
  }, [dismissUndo, undo, undoEntries]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); return; }
      if (event.ctrlKey || event.metaKey || event.altKey || isTextInput(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "n") { event.preventDefault(); setQuickCreateOpen(true); }
      if (key === "d") { event.preventDefault(); router.push("/dashboard"); }
      if (key === "b") { event.preventDefault(); router.push("/workspaces"); }
      if (key === "f") { event.preventDefault(); router.push("/focus"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, setCommandOpen, setQuickCreateOpen]);

  if (hydrationStatus === "idle" || hydrationStatus === "loading") return <LoadingScreen />;
  return <TooltipProvider delayDuration={450}>{children}<Toaster theme={settings.theme === "system" ? "system" : settings.theme} position="bottom-right" richColors closeButton /></TooltipProvider>;
}
