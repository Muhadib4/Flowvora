"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock3, Focus, ListChecks, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { JellyRadio } from "@/components/react-bits/JellyRadio";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { PageContainer, PageHeader, SectionHeader } from "@/components/layout/page";
import { getSuggestedTasks, isDueToday, isOverdue, selectCurrentFocus } from "@/domain/derived";
import type { Energy, Task } from "@/domain/types";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

export function DailyFlowPage() {
  const data = useFlowvoraStore((state) => state.data);
  const setAvailableEnergy = useFlowvoraStore((state) => state.setAvailableEnergy);
  const setCurrentFocus = useFlowvoraStore((state) => state.setCurrentFocus);
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const now = new Date();
  const tasks = useMemo(() => Object.values(data.tasksById).filter((task) => !task.archivedAt), [data.tasksById]);
  const focus = selectCurrentFocus(data);
  const due = tasks.filter((task) => !task.completedAt && isDueToday(task, now));
  const overdue = tasks.filter((task) => isOverdue(task, now));
  const recentlyUpdated = [...tasks].filter((task) => !task.completedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentlyCompleted = [...tasks].filter((task) => task.completedAt).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")).slice(0, 5);
  const suggestions = getSuggestedTasks(data, data.settings.availableEnergy, now, 5);
  return (
    <PageContainer>
      <PageHeader eyebrow={format(now, "EEEE · MMMM d")} title="Daily Flow" description="Only the work that matters now, ordered by transparent rules—not guesswork." actions={<div className="flex items-center gap-2"><span className="hidden text-xs text-muted sm:inline">Available energy</span><JellyRadio options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "deep", label: "Deep" }]} value={data.settings.availableEnergy} onValueChange={(value: Energy) => setAvailableEnergy(value)} size="sm" ariaLabel="Available energy" /></div>} />
      {focus ? <section className="mb-7"><SectionHeader title="Current Focus" /><Card className="relative overflow-hidden p-5"><div className="absolute inset-y-0 left-0 w-1 bg-accent" /><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><Focus className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-xs text-muted">{data.boardsById[focus.boardId]?.name}</p><button onClick={() => setSelectedTaskId(focus.id)} className="mt-0.5 text-left text-lg font-semibold hover:text-accent">{focus.title}</button><p className="mt-1 line-clamp-2 text-sm text-secondary">{focus.description}</p></div><div className="flex gap-2"><Button variant="primary" asChild><Link href="/focus">Continue focus<ArrowRight /></Link></Button><Button variant="ghost" onClick={() => setCurrentFocus(null)}>Clear</Button></div></div></Card></section> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <FlowSection icon={CalendarClock} title="Due today" description="Tasks with today as their deadline." tasks={due} data={data} onOpen={setSelectedTaskId} empty="Nothing is due today." />
        <FlowSection icon={AlertTriangle} title="Overdue" description="Open tasks past their deadline." tasks={overdue} data={data} onOpen={setSelectedTaskId} empty="No overdue work." danger />
        <section><SectionHeader title={<span className="flex items-center gap-2"><Zap className="size-4 text-accent" />Suggested next</span>} description="Urgency + deadline + your selected energy. Stale tasks receive a small penalty." />{suggestions.length ? <Card className="divide-y divide-border">{suggestions.map(({ task, score, reasons }) => <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className="w-full px-4 py-3 text-left transition hover:bg-surface-hover"><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs font-semibold text-accent">+{score}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{task.title}</span><span className="mt-1 flex flex-wrap gap-1">{reasons.map((reason) => <Badge key={reason}>{reason}</Badge>)}</span></span></div></button>)}</Card> : <EmptyState compact icon={ListChecks} title="No suggestion right now" description="Completed and focused tasks are excluded from this rule-based list." />}</section>
        <FlowSection icon={Clock3} title="Recently updated" description="Open work with the latest changes." tasks={recentlyUpdated} data={data} onOpen={setSelectedTaskId} empty="No recent task updates." />
        <FlowSection icon={CheckCircle2} title="Recently completed" description="Momentum from your latest finishes." tasks={recentlyCompleted} data={data} onOpen={setSelectedTaskId} empty="Completed work will appear here." completed />
      </div>
    </PageContainer>
  );
}

function FlowSection({ icon: Icon, title, description, tasks, data, onOpen, empty, danger, completed }: { icon: LucideIcon; title: string; description: string; tasks: Task[]; data: ReturnType<typeof useFlowvoraStore.getState>["data"]; onOpen: (id: string) => void; empty: string; danger?: boolean; completed?: boolean }) {
  return <section><SectionHeader title={<span className="flex items-center gap-2"><Icon className={`size-4 ${danger ? "text-danger" : completed ? "text-positive" : "text-muted"}`} />{title}</span>} description={description} />{tasks.length ? <Card className="divide-y divide-border">{tasks.map((task) => <button key={task.id} onClick={() => onOpen(task.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-hover"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: data.boardsById[task.boardId]?.accent }} /><span className="min-w-0 flex-1"><span className={`block truncate text-sm font-medium ${completed ? "text-secondary line-through" : ""}`}>{task.title}</span><span className="mt-0.5 block truncate text-xs text-muted">{data.boardsById[task.boardId]?.name}{task.dueDate ? ` · ${format(parseISO(task.dueDate), "MMM d")}` : ""}</span></span><Badge tone={task.priority === "urgent" ? "danger" : task.priority === "high" ? "warning" : "neutral"} className="capitalize">{task.priority}</Badge></button>)}</Card> : <EmptyState compact icon={Icon} title={empty} description="Your live task state is used here automatically." />}</section>;
}
