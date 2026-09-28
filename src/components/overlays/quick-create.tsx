"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { JellyRadio } from "@/components/react-bits/JellyRadio";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { BOARD_TEMPLATES, type BoardTemplateId } from "@/data/templates";
import type { Priority } from "@/domain/types";
import { useFlowvoraStore } from "@/store/flowvora-store";
import { useUiStore } from "@/store/ui-store";

export function QuickCreate() {
  const router = useRouter();
  const open = useUiStore((state) => state.quickCreateOpen);
  const setOpen = useUiStore((state) => state.setQuickCreateOpen);
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const data = useFlowvoraStore((state) => state.data);
  const createTask = useFlowvoraStore((state) => state.createTask);
  const createBoard = useFlowvoraStore((state) => state.createBoard);
  const [kind, setKind] = useState<"task" | "board">("task");
  const [title, setTitle] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [boardId, setBoardId] = useState("");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [templateId, setTemplateId] = useState<BoardTemplateId | "blank">("blank");
  const workspaces = useMemo(() => Object.values(data.workspacesById).sort((a, b) => a.position - b.position), [data.workspacesById]);
  const effectiveWorkspaceId = workspaceId && data.workspacesById[workspaceId] ? workspaceId : data.currentWorkspaceId ?? workspaces[0]?.id ?? "";
  const boards = useMemo(() => Object.values(data.boardsById).filter((board) => !board.archivedAt && board.workspaceId === effectiveWorkspaceId).sort((a, b) => a.position - b.position), [data.boardsById, effectiveWorkspaceId]);
  const effectiveBoardId = boardId && boards.some((board) => board.id === boardId) ? boardId : boards[0]?.id ?? "";
  const columns = useMemo(() => Object.values(data.columnsById).filter((column) => column.boardId === effectiveBoardId).sort((a, b) => a.position - b.position), [data.columnsById, effectiveBoardId]);
  const effectiveColumnId = columnId && columns.some((column) => column.id === columnId) ? columnId : columns[0]?.id ?? "";

  const reset = () => { setTitle(""); setPriority("medium"); setDueDate(""); setTemplateId("blank"); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (kind === "task") {
      const id = createTask({ boardId: effectiveBoardId, columnId: effectiveColumnId, title, priority, dueDate: dueDate || null });
      if (!id) { toast.error("Choose a board before creating the task."); return; }
      toast.success("Task created"); setSelectedTaskId(id); router.push(`/boards/${effectiveBoardId}`);
    } else {
      const id = createBoard(effectiveWorkspaceId, title, templateId === "blank" ? undefined : templateId);
      if (!id) { toast.error("Choose a workspace before creating the board."); return; }
      toast.success("Board created"); router.push(`/boards/${id}`);
    }
    setOpen(false); reset();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Quick create</DialogTitle><DialogDescription>Add work now and fill in the details when you are ready.</DialogDescription></DialogHeader>
        <JellyRadio options={[{ value: "task", label: "Task" }, { value: "board", label: "Board" }]} value={kind} onValueChange={setKind} ariaLabel="Choose what to create" />
        <form onSubmit={submit} className="grid gap-4">
          <Field label={kind === "task" ? "Task title" : "Board name"}><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "task" ? "What needs to move forward?" : "e.g. Client launch"} /></Field>
          {kind === "task" ? <>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Board"><Select value={effectiveBoardId} onValueChange={(value) => { setBoardId(value); setColumnId(""); }}><SelectTrigger><SelectValue placeholder="Choose board" /></SelectTrigger><SelectContent>{boards.map((board) => <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Stage"><Select value={effectiveColumnId} onValueChange={setColumnId}><SelectTrigger><SelectValue placeholder="Choose stage" /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem key={column.id} value={column.id}>{column.name}</SelectItem>)}</SelectContent></Select></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Priority"><Select value={priority} onValueChange={(value) => setPriority(value as Priority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "urgent"].map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></Field><Field label="Due date"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field></div>
          </> : <>
            <Field label="Workspace"><Select value={effectiveWorkspaceId} onValueChange={(value) => { setWorkspaceId(value); setBoardId(""); setColumnId(""); }}><SelectTrigger><SelectValue placeholder="Choose workspace" /></SelectTrigger><SelectContent>{workspaces.map((workspace) => <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Starting point" description="Templates create a useful structure with a few realistic examples."><Select value={templateId} onValueChange={(value) => setTemplateId(value as BoardTemplateId | "blank")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blank">Blank Flow board</SelectItem>{BOARD_TEMPLATES.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></Field>
          </>}
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={!title.trim() || (kind === "task" ? !effectiveBoardId : !effectiveWorkspaceId)}>Create {kind}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
