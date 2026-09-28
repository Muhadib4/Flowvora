"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Activity, ArrowRight, CheckCircle2, Focus, MoveRight, PlusCircle } from "lucide-react";
import { Badge, Button, Card, EmptyState, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page";
import type { ActivityEvent } from "@/domain/types";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

type ActivityFilter = "all" | "tasks" | "boards" | "focus";

export function ActivityPage() {
  const data = useFlowvoraStore((state) => state.data);
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const activities = useMemo(() => data.activities.filter((event) => filter === "all" || (filter === "tasks" && event.type.startsWith("task.")) || (filter === "boards" && event.type.startsWith("board.")) || (filter === "focus" && event.type === "focus.changed")), [data.activities, filter]);
  const grouped = useMemo(() => activities.reduce<Record<string, ActivityEvent[]>>((groups, event) => { const key = format(parseISO(event.occurredAt), "yyyy-MM-dd"); (groups[key] ??= []).push(event); return groups; }, {}), [activities]);
  return <PageContainer><PageHeader title="Activity" description="A concise record of meaningful movement—creation, stage changes, completions, and focus." actions={<Select value={filter} onValueChange={(value) => setFilter(value as ActivityFilter)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All activity</SelectItem><SelectItem value="tasks">Tasks</SelectItem><SelectItem value="boards">Boards</SelectItem><SelectItem value="focus">Focus</SelectItem></SelectContent></Select>} />
    {activities.length === 0 ? <EmptyState icon={Activity} title="No activity yet" description="Meaningful changes will appear here; routine keystrokes are intentionally omitted." /> : <div className="mx-auto max-w-3xl space-y-7">{Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, events]) => { const parsed = parseISO(date); const label = isToday(parsed) ? "Today" : isYesterday(parsed) ? "Yesterday" : format(parsed, "EEEE, MMMM d"); return <section key={date}><div className="mb-3 flex items-center gap-3"><h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</h2><div className="h-px flex-1 bg-border" /></div><Card><ol className="divide-y divide-border">{events.map((event) => <ActivityRow key={event.id} event={event} data={data} onTask={setSelectedTaskId} />)}</ol></Card></section>; })}</div>}
  </PageContainer>;
}

function ActivityRow({ event, data, onTask }: { event: ActivityEvent; data: ReturnType<typeof useFlowvoraStore.getState>["data"]; onTask: (id: string) => void }) {
  const Icon = event.type === "task.completed" ? CheckCircle2 : event.type === "task.moved" ? MoveRight : event.type === "focus.changed" ? Focus : PlusCircle;
  const taskExists = event.taskId && data.tasksById[event.taskId]; const boardExists = event.boardId && data.boardsById[event.boardId];
  return <li className="flex gap-4 px-4 py-4 sm:px-5"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised text-muted"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{event.title}</p>{event.detail ? <p className="mt-1 text-sm text-secondary">{event.detail}</p> : null}</div><time className="text-[11px] text-muted">{format(parseISO(event.occurredAt), "HH:mm")}</time></div><div className="mt-2 flex items-center gap-2">{boardExists ? <Badge>{boardExists.name}</Badge> : null}{taskExists ? <button onClick={() => event.taskId && onTask(event.taskId)} className="text-xs font-medium text-accent hover:underline">Open task</button> : boardExists ? <Button asChild variant="ghost" size="sm"><Link href={`/boards/${boardExists.id}`}>Open board<ArrowRight /></Link></Button> : null}</div></div></li>;
}
