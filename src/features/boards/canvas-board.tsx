"use client";

import { useMemo, useRef, useState } from "react";
import { GripHorizontal, LayoutGrid } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import type { FlowvoraData, Task } from "@/domain/types";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { TaskCard } from "./task-card";

export function CanvasBoard({ data, boardId }: { data: FlowvoraData; boardId: string }) {
  const tasks = useMemo(() => Object.values(data.tasksById).filter((task) => task.boardId === boardId && !task.archivedAt), [boardId, data.tasksById]);
  const setPosition = useFlowvoraStore((state) => state.setTaskCanvasPosition);
  const resetLayout = () => tasks.forEach((task, index) => setPosition(task.id, 28 + (index % 4) * 320, 28 + Math.floor(index / 4) * 190));
  return (
    <div className="flow-scrollbar relative z-10 h-[calc(100dvh-214px)] min-h-[520px] overflow-auto p-4 sm:p-6">
      <div className="subtle-grid relative min-h-[760px] min-w-[1180px] rounded-xl border border-border bg-surface/70 shadow-inner backdrop-blur-sm">
        <div className="sticky left-3 top-3 z-30 flex w-fit items-center gap-2 rounded-lg border border-border bg-surface/95 p-1.5 shadow-sm backdrop-blur"><span className="px-2 text-xs text-muted">Freeform workspace</span><Button variant="ghost" size="sm" onClick={resetLayout}><LayoutGrid />Reset layout</Button></div>
        {tasks.map((task, index) => <CanvasTask key={`${task.id}:${task.canvasPosition?.x ?? "x"}:${task.canvasPosition?.y ?? "y"}`} task={task} data={data} fallback={{ x: 28 + (index % 4) * 320, y: 72 + Math.floor(index / 4) * 190 }} />)}
        {tasks.length === 0 ? <EmptyState title="Canvas is clear" description="Create a task in Kanban view, then arrange it here." className="absolute left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 bg-surface" /> : null}
      </div>
    </div>
  );
}

function CanvasTask({ task, data, fallback }: { task: Task; data: FlowvoraData; fallback: { x: number; y: number } }) {
  const commitPosition = useFlowvoraStore((state) => state.setTaskCanvasPosition);
  const initial = task.canvasPosition ?? fallback;
  const [position, setPosition] = useState(initial);
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  return (
    <div className="absolute w-[288px] select-none" style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}>
      <button type="button" aria-label={`Move ${task.title} on canvas`} className="mx-auto -mb-1 flex h-5 w-16 touch-none items-center justify-center rounded-t-md border border-b-0 border-border bg-surface-raised text-muted hover:text-foreground" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: position.x, originY: position.y }; }} onPointerMove={(event) => { if (!drag.current || drag.current.pointerId !== event.pointerId) return; setPosition({ x: Math.max(0, drag.current.originX + event.clientX - drag.current.x), y: Math.max(40, drag.current.originY + event.clientY - drag.current.y) }); }} onPointerUp={(event) => { if (!drag.current) return; event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; commitPosition(task.id, position.x, position.y); }} onPointerCancel={() => { drag.current = null; }}><GripHorizontal className="size-4" /></button>
      <TaskCard task={task} data={data} dragDisabled />
    </div>
  );
}
