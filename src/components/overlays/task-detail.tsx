"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { Archive, Calendar, CheckSquare, Clock3, Copy, Flag, Focus, Plus, Tag, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { JellyRadio } from "@/components/react-bits/JellyRadio";
import { SpringCheck } from "@/components/react-bits/SpringCheck";
import { Badge, Button, Dialog, DialogDescription, DialogHeader, DialogTitle, Field, Input, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SheetContent, Textarea } from "@/components/ui";
import { getAgingState, getChecklistProgress, getColumnAgeDays, isTaskStuck } from "@/domain/derived";
import type { Energy, Priority } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

const priorityTone = { low: "neutral", medium: "accent", high: "warning", urgent: "danger" } as const;

export function TaskDetail() {
  const selectedTaskId = useUiStore((state) => state.selectedTaskId);
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const data = useFlowvoraStore((state) => state.data);
  const updateTask = useFlowvoraStore((state) => state.updateTask);
  const moveTask = useFlowvoraStore((state) => state.moveTask);
  const setCurrentFocus = useFlowvoraStore((state) => state.setCurrentFocus);
  const addChecklistItem = useFlowvoraStore((state) => state.addChecklistItem);
  const updateChecklistItem = useFlowvoraStore((state) => state.updateChecklistItem);
  const deleteChecklistItem = useFlowvoraStore((state) => state.deleteChecklistItem);
  const archiveTask = useFlowvoraStore((state) => state.archiveTask);
  const deleteTask = useFlowvoraStore((state) => state.deleteTask);
  const duplicateTask = useFlowvoraStore((state) => state.duplicateTask);
  const [checklistTitle, setChecklistTitle] = useState("");

  const task = selectedTaskId ? data.tasksById[selectedTaskId] : undefined;
  const board = task ? data.boardsById[task.boardId] : undefined;
  const column = task ? data.columnsById[task.columnId] : undefined;
  const workspace = board ? data.workspacesById[board.workspaceId] : undefined;
  const columns = useMemo(() => board ? Object.values(data.columnsById).filter((item) => item.boardId === board.id).sort((a, b) => a.position - b.position) : [], [board, data.columnsById]);
  const labels = useMemo(() => workspace ? Object.values(data.labelsById).filter((label) => label.workspaceId === workspace.id).sort((a, b) => a.name.localeCompare(b.name)) : [], [data.labelsById, workspace]);
  const activities = useMemo(() => task ? data.activities.filter((activity) => activity.taskId === task.id).slice(0, 8) : [], [data.activities, task]);

  if (!task || !board || !column) return null;
  const progress = getChecklistProgress(task.checklist);
  const aging = getAgingState(task, data.settings.aging, new Date());
  const stuck = isTaskStuck(task, column, data.settings.aging, new Date());
  const close = () => { setChecklistTitle(""); setSelectedTaskId(null); };
  const handleDuplicate = () => { const id = duplicateTask(task.id); if (id) { setSelectedTaskId(id); toast.success("Task duplicated"); } };
  const handleArchive = () => { archiveTask(task.id); close(); toast.success("Task archived"); };
  const handleDelete = () => { if (!window.confirm(`Delete “${task.title}”? You can undo this from the toast.`)) return; deleteTask(task.id); close(); toast.success("Task deleted"); };
  const toggleLabel = (labelId: string) => updateTask(task.id, { labelIds: task.labelIds.includes(labelId) ? task.labelIds.filter((id) => id !== labelId) : [...task.labelIds, labelId] });
  const addChecklist = () => { if (!checklistTitle.trim()) return; addChecklistItem(task.id, checklistTitle); setChecklistTitle(""); };

  return (
    <Dialog open={Boolean(selectedTaskId)} onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent>
        <div className="border-b border-border px-5 py-4 pr-16 sm:px-6">
          <DialogHeader><div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span>{workspace?.name}</span><span>/</span><span>{board.name}</span><span>/</span><span>{column.name}</span></div><DialogTitle className="sr-only">Task details for {task.title}</DialogTitle><DialogDescription className="sr-only">Edit task fields, checklist, labels, focus, and movement.</DialogDescription></DialogHeader>
        </div>
        <div className="flow-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-6">
            <section className="grid gap-3">
              <textarea key={`${task.id}-title`} defaultValue={task.title} onBlur={(event) => updateTask(task.id, { title: event.target.value })} rows={2} aria-label="Task title" className="resize-none bg-transparent text-xl font-semibold leading-7 tracking-[-0.025em] outline-none placeholder:text-muted" />
              <Textarea key={`${task.id}-description`} defaultValue={task.description} onBlur={(event) => updateTask(task.id, { description: event.target.value })} placeholder="Add a clear description…" className="min-h-24 bg-surface-raised" aria-label="Task description" />
            </section>

            <section className="grid grid-cols-2 gap-3">
              <Field label={<span className="flex items-center gap-1.5"><Flag className="size-3.5 text-muted" />Priority</span>}><Select value={task.priority} onValueChange={(value) => updateTask(task.id, { priority: value as Priority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["low", "medium", "high", "urgent"] as Priority[]).map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Move to stage"><Select value={task.columnId} onValueChange={(value) => moveTask(task.id, value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label={<span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-muted" />Due date</span>}><Input type="date" value={task.dueDate ?? ""} onChange={(event) => updateTask(task.id, { dueDate: event.target.value || null })} /></Field>
              <div className="grid content-start gap-1.5"><span className="text-sm font-medium">State</span><div className="flex h-10 items-center gap-2"><Badge tone={priorityTone[task.priority]}>{task.priority}</Badge><Badge tone={stuck ? "warning" : "neutral"}>{stuck ? "Stuck" : aging}</Badge></div></div>
            </section>

            <section className="grid gap-2"><div className="flex items-center gap-2"><Zap className="size-4 text-muted" /><h3 className="text-sm font-semibold">Energy required</h3></div><JellyRadio options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "deep", label: "Deep focus" }]} value={(task.energy ?? "medium") as Energy} onValueChange={(energy) => updateTask(task.id, { energy })} size="sm" ariaLabel="Task energy" /></section>

            <section className="grid gap-2"><div className="flex items-center gap-2"><Tag className="size-4 text-muted" /><h3 className="text-sm font-semibold">Labels</h3></div><div className="flex flex-wrap gap-2">{labels.length === 0 ? <span className="text-sm text-muted">No labels in this workspace.</span> : labels.map((label) => { const active = task.labelIds.includes(label.id); return <button key={label.id} type="button" onClick={() => toggleLabel(label.id)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition", active ? "border-transparent text-white" : "border-border bg-surface-raised text-secondary hover:border-border-strong")} style={active ? { backgroundColor: label.color } : undefined}>{active ? "✓ " : ""}{label.name}</button>; })}</div></section>

            <section className="grid gap-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><CheckSquare className="size-4 text-muted" /><h3 className="text-sm font-semibold">Checklist</h3></div>{progress.total > 0 ? <span className="text-xs text-muted">{progress.completed} / {progress.total} · {progress.percent}%</span> : null}</div>{progress.total > 0 ? <Progress value={progress.percent} label="Checklist progress" /> : null}<div className="grid gap-1">{task.checklist.toSorted((a, b) => a.position - b.position).map((item) => <div key={item.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-surface-hover"><SpringCheck checked={item.completed} onCheckedChange={(completed) => updateChecklistItem(task.id, item.id, { completed })} label={<span className={cn(item.completed && "text-muted line-through")}>{item.title}</span>} className="min-w-0 flex-1" /><Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => deleteChecklistItem(task.id, item.id)} aria-label={`Delete ${item.title}`}><Trash2 /></Button></div>)}</div><div className="flex gap-2"><Input value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addChecklist(); } }} placeholder="Add checklist item" /><Button variant="secondary" onClick={addChecklist} disabled={!checklistTitle.trim()} aria-label="Add checklist item"><Plus /></Button></div></section>

            <section className="grid gap-2"><h3 className="text-sm font-semibold">Notes</h3><Textarea key={`${task.id}-notes`} defaultValue={task.notes} onBlur={(event) => updateTask(task.id, { notes: event.target.value })} placeholder="Working notes, links, or context…" className="min-h-28" /></section>

            <section className="rounded-lg border border-border bg-surface-raised p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-muted" />Task timing</div><dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted">In this stage</dt><dd className="mt-0.5 font-medium">{getColumnAgeDays(task, new Date())} days</dd></div><div><dt className="text-muted">Created</dt><dd className="mt-0.5 font-medium">{format(parseISO(task.createdAt), "MMM d, yyyy")}</dd></div><div><dt className="text-muted">Last updated</dt><dd className="mt-0.5 font-medium">{formatDistanceToNowStrict(parseISO(task.updatedAt), { addSuffix: true })}</dd></div><div><dt className="text-muted">Aging</dt><dd className="mt-0.5 font-medium capitalize">{aging}</dd></div></dl></section>

            {activities.length > 0 ? <section><h3 className="mb-3 text-sm font-semibold">Activity</h3><ol className="space-y-3 border-l border-border pl-4">{activities.map((activity) => <li key={activity.id} className="relative text-xs"><span className="absolute -left-[19px] top-1 size-2 rounded-full border-2 border-surface bg-accent" /><p className="font-medium text-foreground">{activity.title}</p>{activity.detail ? <p className="mt-0.5 text-secondary">{activity.detail}</p> : null}<time className="mt-0.5 block text-muted">{formatDistanceToNowStrict(parseISO(activity.occurredAt), { addSuffix: true })}</time></li>)}</ol></section> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-raised px-5 py-3 sm:px-6">
          <Button variant={data.currentFocusTaskId === task.id ? "subtle" : "primary"} onClick={() => { setCurrentFocus(data.currentFocusTaskId === task.id ? null : task.id); toast.success(data.currentFocusTaskId === task.id ? "Focus cleared" : "Current focus changed"); }}><Focus />{data.currentFocusTaskId === task.id ? "Clear focus" : "Set as focus"}</Button>
          <Button variant="secondary" size="icon" onClick={handleDuplicate} aria-label="Duplicate task"><Copy /></Button>
          <div className="ml-auto flex gap-1"><Button variant="ghost" size="icon" onClick={handleArchive} aria-label="Archive task"><Archive /></Button><Button variant="danger" size="icon" onClick={handleDelete} aria-label="Delete task"><Trash2 /></Button></div>
        </div>
      </SheetContent>
    </Dialog>
  );
}
