"use client";

import { memo } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { useSortable } from "@dnd-kit/sortable";
import { format, parseISO } from "date-fns";
import { Archive, CalendarClock, CheckSquare, Copy, Focus, GripVertical, MoreHorizontal, Trash2, Zap } from "lucide-react";
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Progress } from "@/components/ui";
import { getAgingState, getChecklistProgress, isOverdue, isTaskStuck } from "@/domain/derived";
import type { FlowvoraData, Task } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

const priorityTone = { low: "neutral", medium: "accent", high: "warning", urgent: "danger" } as const;
const energyLabel = { low: "Low", medium: "Medium", deep: "Deep" } as const;

interface TaskCardProps {
  task: Task;
  data: FlowvoraData;
  overlay?: boolean;
  dragDisabled?: boolean;
  dragHandle?: {
    attributes: DraggableAttributes;
    listeners: ReturnType<typeof useSortable>["listeners"];
    setActivatorNodeRef: (element: HTMLElement | null) => void;
  };
}

export const TaskCard = memo(function TaskCard({ task, data, overlay, dragDisabled, dragHandle }: TaskCardProps) {
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const setCurrentFocus = useFlowvoraStore((state) => state.setCurrentFocus);
  const duplicateTask = useFlowvoraStore((state) => state.duplicateTask);
  const archiveTask = useFlowvoraStore((state) => state.archiveTask);
  const deleteTask = useFlowvoraStore((state) => state.deleteTask);
  const column = data.columnsById[task.columnId];
  const progress = getChecklistProgress(task.checklist);
  const labels = task.labelIds.map((id) => data.labelsById[id]).filter(Boolean);
  const overdue = isOverdue(task, new Date());
  const aging = getAgingState(task, data.settings.aging, new Date());
  const stuck = isTaskStuck(task, column, data.settings.aging, new Date());
  const focused = data.currentFocusTaskId === task.id;

  return (
    <article onClick={() => !overlay && setSelectedTaskId(task.id)} className={cn("group relative rounded-[10px] border border-border bg-surface p-3 shadow-[0_1px_2px_hsl(var(--shadow-color)/.08)] transition-[border-color,box-shadow,transform] hover:border-border-strong hover:shadow-[0_6px_20px_hsl(var(--shadow-color)/.1)]", focused && "border-accent/55 shadow-[inset_3px_0_0_var(--accent)]", overlay && "w-[288px] rotate-1 border-accent/40 shadow-xl")}>
      <div className="flex items-start gap-2">
        {!dragDisabled && dragHandle ? <button type="button" ref={dragHandle.setActivatorNodeRef} {...dragHandle.attributes} {...dragHandle.listeners} onClick={(event) => event.stopPropagation()} className="-ml-1 mt-0.5 grid size-6 shrink-0 touch-none place-items-center rounded text-muted opacity-0 transition hover:bg-surface-hover group-hover:opacity-100 focus:opacity-100" aria-label={`Drag ${task.title}`}><GripVertical className="size-3.5" /></button> : null}
        <h3 className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-foreground">{task.title}</h3>
        {!overlay ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="-mr-1 -mt-1 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={(event) => event.stopPropagation()} aria-label={`Actions for ${task.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}><DropdownMenuItem onSelect={() => setCurrentFocus(focused ? null : task.id)}><Focus />{focused ? "Clear focus" : "Set as focus"}</DropdownMenuItem><DropdownMenuItem onSelect={() => duplicateTask(task.id)}><Copy />Duplicate</DropdownMenuItem><DropdownMenuItem onSelect={() => archiveTask(task.id)}><Archive />Archive</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem danger onSelect={() => { if (window.confirm(`Delete “${task.title}”?`)) deleteTask(task.id); }}><Trash2 />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : null}
      </div>
      {labels.length > 0 ? <div className="mt-2 flex flex-wrap gap-1">{labels.slice(0, 2).map((label) => <span key={label.id} className="max-w-28 truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: label.color }}>{label.name}</span>)}{labels.length > 2 ? <span className="rounded-full bg-surface-strong px-1.5 py-0.5 text-[9px] text-muted">+{labels.length - 2}</span> : null}</div> : null}
      {progress.total > 0 ? <div className="mt-2.5"><Progress value={progress.percent} className="h-1" label={`${progress.completed} of ${progress.total} checklist items complete`} /></div> : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <Badge tone={priorityTone[task.priority]} className="px-1.5 py-0 text-[9px] capitalize">{task.priority}</Badge>
        {task.dueDate ? <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-danger")}><CalendarClock className="size-3" />{format(parseISO(task.dueDate), "MMM d")}</span> : null}
        {progress.total > 0 ? <span className="inline-flex items-center gap-1"><CheckSquare className="size-3" />{progress.completed}/{progress.total}</span> : null}
        {task.energy ? <span className="inline-flex items-center gap-1"><Zap className="size-3" />{energyLabel[task.energy]}</span> : null}
        {stuck ? <Badge tone="warning" className="px-1.5 py-0 text-[9px]">Stuck</Badge> : aging !== "fresh" ? <Badge tone="neutral" className="px-1.5 py-0 text-[9px] capitalize">{aging}</Badge> : null}
      </div>
    </article>
  );
});
