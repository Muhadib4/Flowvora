"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO } from "date-fns";
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Clock3, Focus, FolderKanban, Plus, Star, Workflow } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState } from "@/components/ui";
import { PageContainer, PageHeader, SectionHeader } from "@/components/layout/page";
import { getBoardPulse, isDueToday, selectCurrentFocus } from "@/domain/derived";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

export function DashboardPage() {
  const data = useFlowvoraStore((state) => state.data);
  const setCurrentFocus = useFlowvoraStore((state) => state.setCurrentFocus);
  const updateBoard = useFlowvoraStore((state) => state.updateBoard);
  const setQuickCreateOpen = useUiStore((state) => state.setQuickCreateOpen);
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const now = new Date();
  const boards = useMemo(() => Object.values(data.boardsById).filter((board) => !board.archivedAt), [data.boardsById]);
  const tasks = useMemo(() => Object.values(data.tasksById).filter((task) => !task.archivedAt), [data.tasksById]);
  const pulse = boards.reduce((total, board) => { const boardPulse = getBoardPulse(data, board.id, now); return { active: total.active + boardPulse.active, dueToday: total.dueToday + boardPulse.dueToday, overdue: total.overdue + boardPulse.overdue, stuck: total.stuck + boardPulse.stuck, completedToday: total.completedToday + boardPulse.completedToday }; }, { active: 0, dueToday: 0, overdue: 0, stuck: 0, completedToday: 0 });
  const focusTask = selectCurrentFocus(data);
  const dueToday = tasks.filter((task) => isDueToday(task, now) && !task.completedAt).sort((a, b) => b.priority.localeCompare(a.priority)).slice(0, 6);
  const recentBoards = [...boards].sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt)).slice(0, 4);
  const favoriteBoards = boards.filter((board) => board.favorite).slice(0, 4);
  const completed = tasks.filter((task) => task.completedAt).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")).slice(0, 5);
  const metrics = [
    { label: "Active tasks", value: pulse.active, icon: Workflow, tone: "text-accent bg-accent-soft" },
    { label: "Due today", value: pulse.dueToday, icon: CalendarClock, tone: "text-secondary bg-surface-strong" },
    { label: "Overdue", value: pulse.overdue, icon: CircleAlert, tone: "text-danger bg-danger-soft" },
    { label: "Stuck", value: pulse.stuck, icon: Clock3, tone: "text-warning bg-warning-soft" },
    { label: "Completed today", value: pulse.completedToday, icon: CheckCircle2, tone: "text-positive bg-positive-soft" },
  ];

  return (
    <PageContainer>
      <PageHeader eyebrow={format(now, "EEEE · MMMM d")} title="Dashboard" description="A clear view of what is moving, what needs attention, and what comes next." actions={<><Button variant="secondary" asChild><Link href="/workspaces"><FolderKanban />Boards</Link></Button><Button variant="primary" onClick={() => setQuickCreateOpen(true)}><Plus />Quick add</Button></>} />
      <section aria-labelledby="pulse-title"><SectionHeader title="Board Pulse" description="Calculated from your live workspace state." /><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{metrics.map(({ label, value, icon: Icon, tone }) => <Card key={label} className="p-4"><div className="flex items-center justify-between gap-3"><span className={`grid size-8 place-items-center rounded-lg ${tone}`}><Icon className="size-4" /></span><strong className="text-xl font-semibold tracking-tight">{value}</strong></div><p className="mt-3 text-xs text-secondary">{label}</p></Card>)}</div></section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
        <div className="grid content-start gap-6">
          <section><SectionHeader title="Current Focus" action={<Button variant="ghost" size="sm" asChild><Link href="/focus">Open focus mode<ArrowRight /></Link></Button>} />{focusTask ? <Card className="overflow-hidden"><div className="h-1 bg-accent" /><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Focus className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-xs text-muted">{data.boardsById[focusTask.boardId]?.name}</p><button onClick={() => setSelectedTaskId(focusTask.id)} className="mt-0.5 text-left text-base font-semibold hover:text-accent">{focusTask.title}</button><div className="mt-2 flex flex-wrap gap-2"><Badge tone={focusTask.priority === "urgent" ? "danger" : "accent"} className="capitalize">{focusTask.priority}</Badge>{focusTask.dueDate ? <Badge>{format(parseISO(focusTask.dueDate), "MMM d")}</Badge> : null}</div></div><div className="flex gap-2"><Button variant="primary" asChild><Link href="/focus">Continue</Link></Button><Button variant="ghost" onClick={() => setCurrentFocus(null)}>Clear</Button></div></CardContent></Card> : <EmptyState icon={Focus} title="Nothing is focused" description="Choose one task to keep visible across Dashboard, Daily Flow, and Focus Mode." action={<Button variant="primary" onClick={() => setQuickCreateOpen(true)}>Create a task</Button>} />}</section>

          <section><SectionHeader title="Due today" description={dueToday.length ? `${dueToday.length} task${dueToday.length === 1 ? "" : "s"} needs a decision today.` : "Nothing is due before the day ends."} />{dueToday.length ? <Card className="divide-y divide-border">{dueToday.map((task) => <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-hover"><span className="size-2 rounded-full" style={{ backgroundColor: data.boardsById[task.boardId]?.accent }} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{task.title}</span><span className="block truncate text-xs text-muted">{data.boardsById[task.boardId]?.name}</span></span><Badge tone={task.priority === "urgent" ? "danger" : task.priority === "high" ? "warning" : "neutral"} className="capitalize">{task.priority}</Badge></button>)}</Card> : <EmptyState compact icon={CalendarClock} title="Today is clear" description="Use the breathing room for focused progress." />}</section>
        </div>

        <div className="grid content-start gap-6">
          <BoardGrid title="Recently opened" boards={recentBoards} data={data} onFavorite={(id, favorite) => updateBoard(id, { favorite })} />
          {favoriteBoards.length > 0 ? <BoardGrid title="Favorite boards" boards={favoriteBoards} data={data} onFavorite={(id, favorite) => updateBoard(id, { favorite })} /> : null}
          <section><SectionHeader title="Recently completed" action={<Button variant="ghost" size="sm" asChild><Link href="/activity">View activity</Link></Button>} />{completed.length ? <Card className="divide-y divide-border">{completed.map((task) => <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover"><CheckCircle2 className="size-4 shrink-0 text-positive" /><span className="min-w-0 flex-1 truncate text-sm text-secondary line-through">{task.title}</span><time className="text-[10px] text-muted">{task.completedAt && isSameDay(parseISO(task.completedAt), now) ? "Today" : task.completedAt ? format(parseISO(task.completedAt), "MMM d") : ""}</time></button>)}</Card> : <EmptyState compact icon={CheckCircle2} title="No recent completions" description="Completed work will collect here." />}</section>
        </div>
      </div>
    </PageContainer>
  );
}

function BoardGrid({ title, boards, data, onFavorite }: { title: string; boards: Array<{ id: string; name: string; description: string; accent: string; favorite: boolean; workspaceId: string }>; data: ReturnType<typeof useFlowvoraStore.getState>["data"]; onFavorite: (id: string, favorite: boolean) => void }) {
  return <section><SectionHeader title={title} /><div className="grid gap-3 sm:grid-cols-2">{boards.map((board) => <Card key={board.id} className="group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"><div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: board.accent }} /><div className="flex items-start justify-between gap-2"><Link href={`/boards/${board.id}`} className="min-w-0 flex-1"><p className="truncate text-sm font-semibold group-hover:text-accent">{board.name}</p><p className="mt-1 truncate text-xs text-muted">{data.workspacesById[board.workspaceId]?.name}</p></Link><button onClick={() => onFavorite(board.id, !board.favorite)} className="grid size-7 place-items-center rounded text-muted hover:bg-surface-hover" aria-label={board.favorite ? "Unfavorite board" : "Favorite board"}><Star className={`size-3.5 ${board.favorite ? "fill-warning/35 text-warning" : ""}`} /></button></div><p className="mt-3 line-clamp-2 min-h-8 text-xs leading-4 text-secondary">{board.description || "A focused space for work in motion."}</p></Card>)}</div></section>;
}
