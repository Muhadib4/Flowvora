"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarDays, Focus, FolderKanban, LayoutDashboard, Plus, Search, Settings, SquareKanban } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { searchFlowvora } from "@/domain/derived";
import type { SearchResult } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

interface PaletteItem { id: string; title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; run: () => void }

export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const setQuickCreateOpen = useUiStore((state) => state.setQuickCreateOpen);
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const data = useFlowvoraStore((state) => state.data);
  const updateSettings = useFlowvoraStore((state) => state.updateSettings);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const closeAnd = (run: () => void) => { setOpen(false); setQuery(""); run(); };
  const navItems = useMemo<PaletteItem[]>(() => [
    { id: "dashboard", title: "Open Dashboard", subtitle: "Navigation", icon: LayoutDashboard, run: () => router.push("/dashboard") },
    { id: "workspaces", title: "Open Workspaces", subtitle: "Navigation", icon: FolderKanban, run: () => router.push("/workspaces") },
    { id: "daily", title: "Open Daily Flow", subtitle: "Navigation", icon: CalendarDays, run: () => router.push("/daily-flow") },
    { id: "focus", title: "Open Focus", subtitle: "Navigation", icon: Focus, run: () => router.push("/focus") },
    { id: "analytics", title: "Open Analytics", subtitle: "Navigation", icon: BarChart3, run: () => router.push("/analytics") },
    { id: "settings", title: "Open Settings", subtitle: "Navigation", icon: Settings, run: () => router.push("/settings") },
    { id: "create", title: "Create task or board", subtitle: "Action · N", icon: Plus, run: () => setQuickCreateOpen(true) },
    { id: "theme", title: "Toggle light / dark theme", subtitle: "Action", icon: Settings, run: () => updateSettings({ theme: data.settings.theme === "dark" ? "light" : "dark" }) },
  ], [data.settings.theme, router, setQuickCreateOpen, updateSettings]);

  const searchResults = useMemo(() => searchFlowvora(data, query, 18), [data, query]);
  const items = useMemo<PaletteItem[]>(() => {
    if (!query.trim()) return navItems;
    const mapped = searchResults.map((result: SearchResult): PaletteItem => {
      const icon = result.kind === "task" ? SquareKanban : result.kind === "board" ? FolderKanban : Search;
      return {
        id: `${result.kind}-${result.id}`, title: result.title, subtitle: `${result.kind[0].toUpperCase()}${result.kind.slice(1)} · ${result.subtitle}`, icon,
        run: () => {
          if (result.kind === "task") { router.push(`/boards/${result.boardId}`); setSelectedTaskId(result.id); }
          else if (result.kind === "board") router.push(`/boards/${result.id}`);
          else if (result.kind === "workspace") router.push(`/workspaces?workspace=${result.id}`);
          else router.push(`/workspaces?workspace=${result.workspaceId}`);
        },
      };
    });
    const matchingCommands = navItems.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
    return [...mapped, ...matchingCommands].slice(0, 20);
  }, [navItems, query, router, searchResults, setSelectedTaskId]);

  const runItem = (item: PaletteItem | undefined) => { if (item) closeAnd(item.run); };

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setQuery(""); }}>
      <DialogContent className="top-[12dvh] max-h-[72dvh] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[14dvh]" showClose={false} onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(items.length - 1, index + 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
        if (event.key === "Enter") { event.preventDefault(); runItem(items[activeIndex]); }
      }}>
        <DialogTitle className="sr-only">Command palette</DialogTitle><DialogDescription className="sr-only">Search Flowvora and run navigation or creation commands.</DialogDescription>
        <div className="flex h-14 items-center gap-3 border-b border-border px-4"><Search className="size-5 text-muted" /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Search tasks, boards, workspaces…" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" aria-label="Search Flowvora" /><kbd className="rounded border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd></div>
        <div className="flow-scrollbar max-h-[calc(72dvh-56px)] overflow-y-auto p-2" role="listbox" aria-label="Commands and search results">
          {items.length === 0 ? <div className="px-5 py-12 text-center"><p className="text-sm font-medium">No results</p><p className="mt-1 text-xs text-muted">Try a task title, board, or another command.</p></div> : items.map((item, index) => <button key={item.id} type="button" role="option" aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => runItem(item)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition", index === activeIndex ? "bg-accent-soft" : "hover:bg-surface-hover")}><span className={cn("grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface-raised text-muted", index === activeIndex && "border-accent/20 text-accent")}><item.icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{item.title}</span><span className="block truncate text-xs text-muted">{item.subtitle}</span></span></button>)}
        </div>
        <div className="flex items-center gap-4 border-t border-border bg-surface-raised px-4 py-2 text-[10px] text-muted"><span>↑↓ Navigate</span><span>↵ Open</span><span>Esc Close</span></div>
      </DialogContent>
    </Dialog>
  );
}
