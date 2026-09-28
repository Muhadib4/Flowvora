"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, CalendarDays, CircleCheck, Command, Focus, FolderKanban,
  LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Star,
} from "lucide-react";
import { FlowvoraLogo } from "@/components/brand";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";
import { GlobalOverlays } from "@/components/overlays/global-overlays";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspaces", label: "Workspaces", icon: FolderKanban },
  { href: "/daily-flow", label: "Daily Flow", icon: CalendarDays },
  { href: "/focus", label: "Focus", icon: Focus },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const bottomNavigation = navigation.slice(0, 4);

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function ProductShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const data = useFlowvoraStore((state) => state.data);
  const saveStatus = useFlowvoraStore((state) => state.saveStatus);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setQuickCreateOpen = useUiStore((state) => state.setQuickCreateOpen);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const recentBoards = useMemo(() => Object.values(data.boardsById).filter((board) => !board.archivedAt).sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? "")).slice(0, 4), [data.boardsById]);
  const favoriteBoards = useMemo(() => recentBoards.filter((board) => board.favorite).slice(0, 3), [recentBoards]);

  const sidebar = (
    <>
      <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed ? "justify-center px-2" : "justify-between")}>
        <Link href="/dashboard" aria-label="Flowvora dashboard"><FlowvoraLogo compact={collapsed} /></Link>
        {!collapsed ? <Button variant="ghost" size="icon-sm" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar"><PanelLeftClose /></Button> : null}
      </div>
      <div className="flow-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-2.5">
        {collapsed ? <Button variant="ghost" size="icon" className="mx-auto mb-2" onClick={() => setCollapsed(false)} aria-label="Expand sidebar"><PanelLeftOpen /></Button> : null}
        <nav aria-label="Primary" className="space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            const link = <Link href={href} onClick={() => setMobileNavOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-secondary transition hover:bg-surface-hover hover:text-foreground", active && "bg-accent-soft text-accent", collapsed && "justify-center px-0")}><Icon className="size-[17px] shrink-0" /><span className={cn(collapsed && "sr-only")}>{label}</span></Link>;
            return collapsed ? <Tooltip key={href}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{label}</TooltipContent></Tooltip> : <div key={href}>{link}</div>;
          })}
        </nav>

        {!collapsed && favoriteBoards.length > 0 ? <div className="mt-6"><p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Favorites</p>{favoriteBoards.map((board) => <Link key={board.id} href={`/boards/${board.id}`} onClick={() => setMobileNavOpen(false)} className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs text-secondary hover:bg-surface-hover hover:text-foreground"><Star className="size-3.5 fill-warning/30 text-warning" /><span className="truncate">{board.name}</span></Link>)}</div> : null}
        {!collapsed && recentBoards.length > 0 ? <div className="mt-5"><p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Recent boards</p>{recentBoards.map((board) => <Link key={board.id} href={`/boards/${board.id}`} onClick={() => setMobileNavOpen(false)} className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs text-secondary hover:bg-surface-hover hover:text-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: board.accent }} /><span className="truncate">{board.name}</span></Link>)}</div> : null}
        <div className="mt-auto pt-5">
          <Button variant="subtle" className={cn("w-full", collapsed && "px-0")} onClick={() => setQuickCreateOpen(true)} aria-label="Create new task or board"><Plus />{collapsed ? null : "Quick add"}</Button>
          {!collapsed ? <div className="mt-3 flex items-center justify-between rounded-md px-2.5 py-2 text-[11px] text-muted"><span className="flex items-center gap-1.5"><CircleCheck className="size-3.5 text-positive" />{saveStatus === "saving" ? "Saving…" : saveStatus === "failed" ? "Save unavailable" : "Saved locally"}</span><span>v1</span></div> : null}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex", collapsed ? "w-[76px]" : "w-[248px]")}>{sidebar}</aside>
      {mobileNavOpen ? <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /><aside className="surface-shadow absolute inset-y-0 left-0 flex w-[min(310px,86vw)] flex-col border-r border-border bg-surface">{sidebar}</aside></div> : null}
      <div className={cn("min-h-dvh transition-[padding] duration-200", collapsed ? "md:pl-[76px]" : "md:pl-[248px]")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-5 md:h-16">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu /></Button>
          <div className="md:hidden"><FlowvoraLogo compact /></div>
          <button onClick={() => setCommandOpen(true)} className="mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted shadow-sm transition hover:border-border-strong hover:text-secondary" aria-label="Open command palette"><Search className="size-4" /><span className="truncate">Search tasks, boards, and commands</span><span className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-muted sm:flex"><Command className="size-2.5" />K</span></button>
          <Button variant="primary" size="sm" className="hidden sm:inline-flex" onClick={() => setQuickCreateOpen(true)}><Plus />Create</Button>
        </header>
        <main id="main-content" className="min-h-[calc(100dvh-64px)] pb-20 md:pb-0">{children}</main>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-surface/95 px-1 pt-1.5 backdrop-blur-xl md:hidden">
        {bottomNavigation.map(({ href, label, icon: Icon }) => { const active = isActivePath(pathname, href); return <Link key={href} href={href} className={cn("flex min-w-16 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium text-muted", active && "text-accent")}><Icon className="size-5" />{label === "Daily Flow" ? "Today" : label}</Link>; })}
        <button onClick={() => setMobileNavOpen(true)} className="flex min-w-16 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium text-muted"><Menu className="size-5" />More</button>
      </nav>
      <GlobalOverlays />
    </div>
  );
}
