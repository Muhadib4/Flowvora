"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Check, ChevronLeft, CircleAlert, Copy, Filter, MoreHorizontal, Palette, Plus, Search, Star, Trash2, Workflow } from "lucide-react";
import BoardBackgroundRenderer, { type BoardBackground as RenderBackground } from "@/components/react-bits/BoardBackgroundRenderer";
import { JellyRadio } from "@/components/react-bits/JellyRadio";
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@/components/ui";
import { EMPTY_TASK_FILTERS } from "@/domain/constants";
import { getBoardPulse } from "@/domain/derived";
import type { BoardBackground, BoardView, DeadlineFilter, Energy, Priority, TaskFilters, TaskSort } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";
import { CanvasBoard } from "./canvas-board";
import { KanbanBoard } from "./kanban-board";

const backgrounds: Array<{ label: string; value: BoardBackground }> = [
  { label: "Graphite", value: { type: "solid", preset: "graphite" } }, { label: "Paper", value: { type: "solid", preset: "paper" } },
  { label: "Mist", value: { type: "solid", preset: "mist" } }, { label: "Midnight", value: { type: "solid", preset: "midnight" } },
  { label: "Slate gradient", value: { type: "gradient", preset: "slate" } }, { label: "Flow · Balatro", value: { type: "motion", effect: "balatro", preset: "flow" } },
  { label: "Liquid Flow", value: { type: "motion", effect: "liquidEther", preset: "liquid" } }, { label: "Ribbon", value: { type: "motion", effect: "colorBends", preset: "ribbon" } },
  { label: "Rays", value: { type: "motion", effect: "lightRays", preset: "rays" } }, { label: "Pixel Current", value: { type: "motion", effect: "pixelBlast", preset: "pixel" } },
  { label: "Prism", value: { type: "motion", effect: "prism", preset: "prism" } },
];

export function BoardPage({ boardId }: { boardId: string }) {
  const router = useRouter();
  const data = useFlowvoraStore((state) => state.data);
  const updateBoard = useFlowvoraStore((state) => state.updateBoard);
  const archiveBoard = useFlowvoraStore((state) => state.archiveBoard);
  const deleteBoard = useFlowvoraStore((state) => state.deleteBoard);
  const duplicateBoard = useFlowvoraStore((state) => state.duplicateBoard);
  const openBoard = useFlowvoraStore((state) => state.openBoard);
  const setBoardBackground = useFlowvoraStore((state) => state.setBoardBackground);
  const setQuickCreateOpen = useUiStore((state) => state.setQuickCreateOpen);
  const [filters, setFilters] = useState<TaskFilters>(() => structuredClone(EMPTY_TASK_FILTERS));
  const [sort, setSort] = useState<TaskSort>("manual");
  const [showFilters, setShowFilters] = useState(false);
  const board = data.boardsById[boardId];
  const resolvedBoardId = board?.id;
  const workspace = board ? data.workspacesById[board.workspaceId] : undefined;
  const pulse = useMemo(() => board ? getBoardPulse(data, board.id, new Date()) : null, [board, data]);
  const labels = useMemo(() => workspace ? Object.values(data.labelsById).filter((label) => label.workspaceId === workspace.id) : [], [data.labelsById, workspace]);
  const activeFilterCount = filters.priorities.length + filters.energies.length + filters.agingStates.length + filters.labelIds.length + Number(filters.deadline !== "any") + Number(filters.stuckOnly) + Number(filters.completedOnly);

  useEffect(() => { if (resolvedBoardId) openBoard(resolvedBoardId); }, [resolvedBoardId, openBoard]);
  if (!board || !workspace) return <div className="grid min-h-[calc(100dvh-64px)] place-items-center p-6"><div className="max-w-md text-center"><CircleAlert className="mx-auto size-10 text-muted" /><h1 className="mt-4 text-xl font-semibold">Board not found</h1><p className="mt-2 text-sm text-secondary">It may have been deleted, archived, or imported from another workspace.</p><Button asChild className="mt-5"><Link href="/workspaces"><ChevronLeft />Back to workspaces</Link></Button></div></div>;
  const rendererBackground = mapBackground(board.background);
  const pulseItems = pulse ? [
    { key: "active", label: "Active", value: pulse.active, action: () => setFilters({ ...structuredClone(EMPTY_TASK_FILTERS) }) },
    { key: "today", label: "Due today", value: pulse.dueToday, action: () => setFilters({ ...structuredClone(EMPTY_TASK_FILTERS), deadline: "today" }) },
    { key: "overdue", label: "Overdue", value: pulse.overdue, action: () => setFilters({ ...structuredClone(EMPTY_TASK_FILTERS), deadline: "overdue" }) },
    { key: "stuck", label: "Stuck", value: pulse.stuck, action: () => setFilters({ ...structuredClone(EMPTY_TASK_FILTERS), stuckOnly: true }) },
    { key: "done", label: "Done today", value: pulse.completedToday, action: () => setFilters({ ...structuredClone(EMPTY_TASK_FILTERS), completedOnly: true }) },
  ] : [];

  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-hidden">
      <BoardBackgroundRenderer background={rendererBackground} motionEnabled={data.settings.motionBackgrounds} reducedMotion={data.settings.motionPreference === "reduce"} overlayOpacity={board.background.type === "motion" ? 0.44 : 0.14} />
      <div className="relative z-10 border-b border-border bg-background/84 backdrop-blur-xl">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-xs text-muted"><Link href="/workspaces" className="hover:text-foreground">{workspace.name}</Link><span>/</span><span>Board</span></div><div className="flex items-center gap-2"><button className="truncate text-left text-xl font-semibold tracking-[-0.025em] hover:text-accent" onClick={() => { const name = window.prompt("Rename board", board.name); if (name?.trim()) updateBoard(board.id, { name }); }}>{board.name}</button><Button variant="ghost" size="icon-sm" onClick={() => updateBoard(board.id, { favorite: !board.favorite })} aria-label={board.favorite ? "Remove favorite" : "Add favorite"}><Star className={cn(board.favorite && "fill-warning/35 text-warning")} /></Button></div>{board.description ? <p className="mt-1 max-w-2xl truncate text-xs text-secondary">{board.description}</p> : null}</div>
            <div className="flex flex-wrap items-center gap-2"><JellyRadio options={[{ value: "kanban", label: "Kanban" }, { value: "canvas", label: "Canvas" }]} value={board.view} onValueChange={(view: BoardView) => updateBoard(board.id, { view })} size="sm" ariaLabel="Board view" /><label className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium"><Workflow className="size-4 text-accent" />Flow mode<Switch checked={board.flowMode} onCheckedChange={(flowMode) => updateBoard(board.id, { flowMode })} /></label><DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" size="icon" aria-label="Board actions"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => { const description = window.prompt("Board description", board.description); if (description !== null) updateBoard(board.id, { description }); }}>Edit description</DropdownMenuItem><DropdownMenuItem onSelect={() => { const copyId = duplicateBoard(board.id); if (copyId) router.push(`/boards/${copyId}`); }}><Copy />Duplicate board</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuLabel>Background</DropdownMenuLabel>{backgrounds.map((item) => <DropdownMenuItem key={item.label} onSelect={() => setBoardBackground(board.id, item.value)}><Palette />{item.label}{JSON.stringify(item.value) === JSON.stringify(board.background) ? <Check className="ml-auto" /> : null}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onSelect={() => { archiveBoard(board.id); router.push("/dashboard"); }}><Archive />Archive board</DropdownMenuItem><DropdownMenuItem danger onSelect={() => { if (window.confirm(`Permanently delete “${board.name}” and its tasks?`)) { deleteBoard(board.id); router.push("/workspaces"); } }}><Trash2 />Delete board</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{pulseItems.map((item) => <button key={item.key} onClick={item.action} className="flex items-center justify-between rounded-lg border border-border bg-surface/80 px-3 py-2 text-left shadow-sm transition hover:border-border-strong hover:bg-surface"><span className="text-[11px] text-muted">{item.label}</span><strong className={cn("text-sm", item.key === "overdue" && item.value > 0 && "text-danger", item.key === "stuck" && item.value > 0 && "text-warning")}>{item.value}</strong></button>)}</div>
        </div>
        <div className="border-t border-border px-4 py-2.5 sm:px-6"><div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[180px] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Search this board" className="h-9 pl-9" /></div><Button variant={activeFilterCount > 0 ? "subtle" : "secondary"} size="sm" onClick={() => setShowFilters((value) => !value)}><Filter />Filters{activeFilterCount > 0 ? <Badge tone="accent">{activeFilterCount}</Badge> : null}</Button><Select value={sort} onValueChange={(value) => setSort(value as TaskSort)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{["manual", "priority", "deadline", "newest", "oldest", "recently-updated"].map((value) => <SelectItem key={value} value={value}>{value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")}</SelectItem>)}</SelectContent></Select><Button variant="primary" size="sm" onClick={() => setQuickCreateOpen(true)}><Plus />Task</Button></div>{sort !== "manual" ? <p className="mt-2 text-[11px] text-warning">Drag ordering is paused while {sort.replace("-", " ")} sorting is active. Return to Manual to rearrange tasks.</p> : null}</div>
        {showFilters ? <FilterPanel filters={filters} setFilters={setFilters} labels={labels} /> : null}
      </div>
      {board.view === "kanban" ? <KanbanBoard data={data} boardId={board.id} filters={filters} sort={sort} /> : <CanvasBoard data={data} boardId={board.id} />}
    </div>
  );
}

function FilterPanel({ filters, setFilters, labels }: { filters: TaskFilters; setFilters: React.Dispatch<React.SetStateAction<TaskFilters>>; labels: Array<{ id: string; name: string; color: string }> }) {
  const toggle = <T extends string>(list: T[], value: T) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  return <div className="border-t border-border bg-surface/95 px-4 py-4 backdrop-blur-xl sm:px-6"><div className="grid gap-4 md:grid-cols-4"><div><p className="mb-2 text-xs font-semibold">Priority</p><div className="flex flex-wrap gap-1">{(["low", "medium", "high", "urgent"] as Priority[]).map((value) => <button key={value} onClick={() => setFilters((current) => ({ ...current, priorities: toggle(current.priorities, value) }))} className={cn("rounded-full border px-2 py-1 text-[11px] capitalize", filters.priorities.includes(value) ? "border-accent bg-accent-soft text-accent" : "border-border text-secondary")}>{value}</button>)}</div></div><div><p className="mb-2 text-xs font-semibold">Energy</p><div className="flex flex-wrap gap-1">{(["low", "medium", "deep"] as Energy[]).map((value) => <button key={value} onClick={() => setFilters((current) => ({ ...current, energies: toggle(current.energies, value) }))} className={cn("rounded-full border px-2 py-1 text-[11px] capitalize", filters.energies.includes(value) ? "border-accent bg-accent-soft text-accent" : "border-border text-secondary")}>{value}</button>)}</div></div><div><p className="mb-2 text-xs font-semibold">Deadline</p><Select value={filters.deadline} onValueChange={(deadline) => setFilters((current) => ({ ...current, deadline: deadline as DeadlineFilter }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["any", "today", "tomorrow", "overdue", "none"].map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-2"><label className="flex items-center justify-between text-xs">Stuck only<Switch checked={filters.stuckOnly} onCheckedChange={(stuckOnly) => setFilters((current) => ({ ...current, stuckOnly }))} /></label><label className="flex items-center justify-between text-xs">Completed<Switch checked={filters.completedOnly} onCheckedChange={(completedOnly) => setFilters((current) => ({ ...current, completedOnly }))} /></label></div></div>{labels.length > 0 ? <div className="mt-4"><p className="mb-2 text-xs font-semibold">Labels</p><div className="flex flex-wrap gap-1.5">{labels.map((label) => <button key={label.id} onClick={() => setFilters((current) => ({ ...current, labelIds: toggle(current.labelIds, label.id) }))} className={cn("rounded-full border px-2 py-1 text-[11px]", filters.labelIds.includes(label.id) ? "text-white" : "border-border text-secondary")} style={filters.labelIds.includes(label.id) ? { backgroundColor: label.color, borderColor: label.color } : undefined}>{label.name}</button>)}</div></div> : null}<div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setFilters(structuredClone(EMPTY_TASK_FILTERS))}>Clear filters</Button></div></div>;
}

function mapBackground(background: BoardBackground): RenderBackground {
  if (background.type === "motion") return { type: background.effect, preset: background.preset };
  if (background.type === "gradient") return { type: "gradient", value: "linear-gradient(145deg, var(--background), color-mix(in srgb, var(--accent) 10%, var(--background)) 55%, var(--surface-raised))" };
  const values = { graphite: "#0f1318", paper: "#f4f2ed", mist: "linear-gradient(150deg, #e9eef3, #f8fafb)", midnight: "#080b11" } as const;
  return { type: background.preset === "mist" ? "gradient" : "solid", value: values[background.preset] };
}
