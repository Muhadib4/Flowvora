"use client";

import { useMemo, useState } from "react";
import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyState, Input } from "@/components/ui";
import { filterTasks, sortTasks } from "@/domain/derived";
import type { Column, FlowvoraData, Task, TaskFilters, TaskSort } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { TaskCard } from "./task-card";

interface KanbanBoardProps { data: FlowvoraData; boardId: string; filters: TaskFilters; sort: TaskSort }

export function KanbanBoard({ data, boardId, filters, sort }: KanbanBoardProps) {
  const columns = useMemo(() => Object.values(data.columnsById).filter((column) => column.boardId === boardId).sort((a, b) => a.position - b.position), [boardId, data.columnsById]);
  const moveTask = useFlowvoraStore((state) => state.moveTask);
  const reorderColumns = useFlowvoraStore((state) => state.reorderColumns);
  const createColumn = useFlowvoraStore((state) => state.createColumn);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const dragDisabled = sort !== "manual";

  const startDrag = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type === "task") setActiveTask(data.tasksById[String(event.active.id)] ?? null);
    if (type === "column") setActiveColumn(data.columnsById[String(event.active.id)] ?? null);
  };
  const endDrag = (event: DragEndEvent) => {
    setActiveTask(null); setActiveColumn(null);
    const { active, over } = event; if (!over || active.id === over.id) return;
    if (active.data.current?.type === "column") {
      const from = columns.findIndex((column) => column.id === active.id); const to = columns.findIndex((column) => column.id === over.id);
      if (from < 0 || to < 0) return;
      const ordered = [...columns]; const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved); reorderColumns(boardId, ordered.map((column) => column.id)); return;
    }
    if (active.data.current?.type === "task") {
      const overType = over.data.current?.type;
      const targetColumnId = overType === "task" ? String(over.data.current?.columnId) : overType === "column" ? String(over.id) : "";
      if (!targetColumnId) return;
      const targetTasks = Object.values(data.tasksById).filter((task) => task.columnId === targetColumnId && !task.archivedAt).sort((a, b) => a.manualOrder - b.manualOrder);
      const targetIndex = overType === "task" ? Math.max(0, targetTasks.findIndex((task) => task.id === over.id)) : targetTasks.length;
      moveTask(String(active.id), targetColumnId, targetIndex);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={startDrag} onDragEnd={endDrag} onDragCancel={() => { setActiveTask(null); setActiveColumn(null); }}>
      <div className="flow-scrollbar touch-pan-x relative z-10 flex min-h-[calc(100dvh-240px)] items-start gap-3 overflow-x-auto px-4 pb-8 pt-3 sm:px-6">
        <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
          {columns.map((column, index) => <SortableColumn key={column.id} column={column} columnIndex={index} data={data} filters={filters} sort={sort} dragDisabled={dragDisabled} />)}
        </SortableContext>
        <Button variant="secondary" className="mt-1 w-52 shrink-0 justify-start border-dashed bg-surface/75" onClick={() => { const name = window.prompt("Column name", "New stage"); if (name?.trim()) createColumn(boardId, name); }}><Plus />Add column</Button>
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>{activeTask ? <TaskCard task={activeTask} data={data} overlay /> : activeColumn ? <div className="w-[304px] rounded-xl border border-accent/40 bg-surface p-4 text-sm font-semibold shadow-xl">{activeColumn.name}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function SortableColumn({ column, columnIndex, data, filters, sort, dragDisabled }: { column: Column; columnIndex: number; data: FlowvoraData; filters: TaskFilters; sort: TaskSort; dragDisabled: boolean }) {
  const updateColumn = useFlowvoraStore((state) => state.updateColumn);
  const deleteColumn = useFlowvoraStore((state) => state.deleteColumn);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: column.id, data: { type: "column" } });
  const tasks = useMemo(() => {
    const all = Object.values(data.tasksById).filter((task) => task.columnId === column.id);
    return sortTasks(filterTasks(all, data, filters, new Date()), sort);
  }, [column.id, data, filters, sort]);
  const allTaskCount = Object.values(data.tasksById).filter((task) => task.columnId === column.id && !task.archivedAt).length;
  const style = { transform: CSS.Transform.toString(transform), transition };
  if (column.collapsed) return <div ref={setNodeRef} style={style} className={cn("relative z-10 flex h-[560px] w-14 shrink-0 flex-col items-center rounded-xl border border-border bg-surface/90 py-3 backdrop-blur-md", isDragging && "opacity-40")}><button ref={setActivatorNodeRef} {...attributes} {...listeners} className="grid size-8 touch-none place-items-center rounded text-muted hover:bg-surface-hover" aria-label={`Drag ${column.name} column`}><GripVertical className="size-4" /></button><button onClick={() => updateColumn(column.id, { collapsed: false })} className="mt-2 grid size-8 place-items-center rounded hover:bg-surface-hover" aria-label={`Expand ${column.name}`}><ChevronRight className="size-4" /></button><span className="mt-3 [writing-mode:vertical-rl] text-xs font-semibold text-secondary">{column.name} · {allTaskCount}</span></div>;

  return (
    <section ref={setNodeRef} style={style} className={cn("relative z-10 flex max-h-[calc(100dvh-245px)] min-h-[320px] w-[min(304px,calc(100vw-40px))] shrink-0 flex-col rounded-xl border border-border bg-surface-raised/90 shadow-sm backdrop-blur-md", data.boardsById[column.boardId]?.flowMode && "before:absolute before:-left-4 before:top-7 before:h-px before:w-4 before:bg-border", isDragging && "opacity-40")} aria-labelledby={`column-${column.id}`}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2.5">
        <button ref={setActivatorNodeRef} {...attributes} {...listeners} className="grid size-7 touch-none place-items-center rounded text-muted opacity-0 hover:bg-surface-hover group-hover:opacity-100 focus:opacity-100" aria-label={`Drag ${column.name} column`}><GripVertical className="size-3.5" /></button>
        {data.boardsById[column.boardId]?.flowMode ? <span className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: column.accent }}>{columnIndex + 1}</span> : <span className="size-2 rounded-full" style={{ backgroundColor: column.accent }} />}
        <h2 id={`column-${column.id}`} className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.08em] text-secondary">{column.name}</h2><span className="rounded bg-surface-strong px-1.5 py-0.5 text-[10px] text-muted">{allTaskCount}</span>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${column.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => updateColumn(column.id, { collapsed: true })}><ChevronDown />Collapse</DropdownMenuItem><DropdownMenuItem onSelect={() => { const name = window.prompt("Rename column", column.name); if (name?.trim()) updateColumn(column.id, { name }); }}>Rename</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem danger onSelect={() => { const others = Object.values(data.columnsById).filter((item) => item.boardId === column.boardId && item.id !== column.id).sort((a, b) => a.position - b.position); if (window.confirm(`Delete “${column.name}”? Its tasks will ${others[0] ? `move to ${others[0].name}` : "also be deleted"}.`)) deleteColumn(column.id, others[0]?.id); }}><Trash2 />Delete column</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </header>
      <div className="flow-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">{tasks.map((task) => <SortableTask key={task.id} task={task} data={data} disabled={dragDisabled} />)}</div>
        </SortableContext>
        {tasks.length === 0 ? <EmptyState compact title={allTaskCount > 0 ? "No matching tasks" : "This stage is clear"} description={allTaskCount > 0 ? "Try removing one or more filters." : "Add a task or move work here."} className="mt-1 border-0 bg-transparent py-8" /> : null}
      </div>
      <InlineAddTask boardId={column.boardId} columnId={column.id} />
    </section>
  );
}

function SortableTask({ task, data, disabled }: { task: Task; data: FlowvoraData; disabled: boolean }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: "task", columnId: task.columnId }, disabled });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "opacity-30")}><TaskCard task={task} data={data} dragDisabled={disabled} dragHandle={{ attributes, listeners, setActivatorNodeRef }} /></div>;
}

function InlineAddTask({ boardId, columnId }: { boardId: string; columnId: string }) {
  const createTask = useFlowvoraStore((state) => state.createTask);
  const [open, setOpen] = useState(false); const [title, setTitle] = useState("");
  const submit = () => { if (!title.trim()) return; createTask({ boardId, columnId, title }); setTitle(""); setOpen(false); };
  return <div className="shrink-0 border-t border-border p-2">{open ? <div className="grid gap-2"><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); if (event.key === "Escape") setOpen(false); }} placeholder="Task title" className="h-9" /><div className="flex gap-1"><Button variant="primary" size="sm" onClick={submit}>Add task</Button><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div></div> : <Button variant="ghost" size="sm" className="w-full justify-start text-muted" onClick={() => setOpen(true)}><Plus />Add task</Button>}</div>;
}
