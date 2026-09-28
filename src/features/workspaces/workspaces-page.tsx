"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, Copy, FolderKanban, MoreHorizontal, Pencil, Plus, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { HoldButton } from "@/components/react-bits/HoldButton";
import { Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyState, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { PageContainer, PageHeader, SectionHeader } from "@/components/layout/page";
import { BOARD_TEMPLATES, type BoardTemplateId } from "@/data/templates";
import type { Workspace } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useFlowvoraStore } from "@/store/flowvora-store";

const accentOptions = ["#7B8CFF", "#65C9A8", "#D7A858", "#B983D4", "#E07A6F", "#6FA4C8"];
const iconOptions = ["Layers3", "Code2", "GraduationCap", "Briefcase", "House", "Palette"];

export function WorkspacesPage() {
  const searchParams = useSearchParams();
  const data = useFlowvoraStore((state) => state.data);
  const createWorkspace = useFlowvoraStore((state) => state.createWorkspace);
  const updateWorkspace = useFlowvoraStore((state) => state.updateWorkspace);
  const deleteWorkspace = useFlowvoraStore((state) => state.deleteWorkspace);
  const createBoard = useFlowvoraStore((state) => state.createBoard);
  const updateBoard = useFlowvoraStore((state) => state.updateBoard);
  const archiveBoard = useFlowvoraStore((state) => state.archiveBoard);
  const restoreBoard = useFlowvoraStore((state) => state.restoreBoard);
  const duplicateBoard = useFlowvoraStore((state) => state.duplicateBoard);
  const [selectedId, setSelectedId] = useState("");
  const [workspaceDialog, setWorkspaceDialog] = useState<"create" | "edit" | null>(null);
  const [boardDialog, setBoardDialog] = useState(false);
  const workspaces = useMemo(() => Object.values(data.workspacesById).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.position - b.position), [data.workspacesById]);
  const requestedId = searchParams.get("workspace");
  const effectiveSelectedId = data.workspacesById[selectedId] ? selectedId : (requestedId && data.workspacesById[requestedId] ? requestedId : data.currentWorkspaceId) ?? workspaces[0]?.id ?? "";
  const selected = data.workspacesById[effectiveSelectedId];
  const boards = useMemo(() => Object.values(data.boardsById).filter((board) => board.workspaceId === effectiveSelectedId && !board.archivedAt).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.position - b.position), [data.boardsById, effectiveSelectedId]);
  const archivedBoards = useMemo(() => Object.values(data.boardsById).filter((board) => board.workspaceId === effectiveSelectedId && board.archivedAt), [data.boardsById, effectiveSelectedId]);

  return (
    <PageContainer>
      <PageHeader title="Workspaces" description="Separate contexts without losing the shape of the work inside them." actions={<Button variant="primary" onClick={() => setWorkspaceDialog("create")}><Plus />Workspace</Button>} />
      {workspaces.length === 0 ? <EmptyState icon={FolderKanban} title="No workspaces yet" description="Create your first workspace to start organizing projects." action={<Button variant="primary" onClick={() => setWorkspaceDialog("create")}>Create workspace</Button>} /> : <>
        <div className="flow-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">{workspaces.map((workspace) => { const count = Object.values(data.boardsById).filter((board) => board.workspaceId === workspace.id && !board.archivedAt).length; return <button key={workspace.id} onClick={() => setSelectedId(workspace.id)} className={cn("min-w-[180px] rounded-xl border bg-surface p-3 text-left shadow-sm transition hover:border-border-strong", effectiveSelectedId === workspace.id && "border-accent/50 bg-accent-soft")}><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: workspace.accent }}>{workspace.icon === "Code2" ? "</>" : workspace.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{workspace.name}</span><span className="block text-xs text-muted">{count} board{count === 1 ? "" : "s"}</span></span>{workspace.favorite ? <Star className="size-3.5 fill-warning/35 text-warning" /> : null}</div></button>; })}</div>
        {selected ? <><div className="mt-5 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight">{selected.name}</h2><p className="mt-1 text-sm text-secondary">{boards.length} active board{boards.length === 1 ? "" : "s"}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setWorkspaceDialog("edit")}><Pencil />Edit</Button><Button variant="primary" onClick={() => setBoardDialog(true)}><Plus />Board</Button></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{boards.map((board) => <Card key={board.id} className="group relative min-h-40 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"><div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: board.accent }} /><div className="flex items-start gap-2"><Link href={`/boards/${board.id}`} className="min-w-0 flex-1"><h3 className="truncate text-base font-semibold group-hover:text-accent">{board.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-secondary">{board.description || "A focused space for work in motion."}</p></Link><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${board.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => updateBoard(board.id, { favorite: !board.favorite })}><Star />{board.favorite ? "Unfavorite" : "Favorite"}</DropdownMenuItem><DropdownMenuItem onSelect={() => { duplicateBoard(board.id); toast.success("Board duplicated"); }}><Copy />Duplicate</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => archiveBoard(board.id)}><Archive />Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs text-muted"><span>{Object.values(data.tasksById).filter((task) => task.boardId === board.id && !task.archivedAt && !task.completedAt).length} active tasks</span>{board.favorite ? <Star className="size-3.5 fill-warning/35 text-warning" /> : null}</div></Card>)}{boards.length === 0 ? <div className="sm:col-span-2 xl:col-span-3"><EmptyState icon={FolderKanban} title="No boards yet" description="Create a board from a focused template or start with Flowvora’s default workflow." action={<Button variant="primary" onClick={() => setBoardDialog(true)}>Create board</Button>} /></div> : null}</div>
          {archivedBoards.length > 0 ? <section className="mt-8"><SectionHeader title="Archived boards" /><div className="grid gap-2 sm:grid-cols-2">{archivedBoards.map((board) => <div key={board.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"><Archive className="size-4 text-muted" /><span className="min-w-0 flex-1 truncate text-sm">{board.name}</span><Button variant="ghost" size="sm" onClick={() => restoreBoard(board.id)}><RotateCcw />Restore</Button></div>)}</div></section> : null}
        </> : null}
      </>}
      <WorkspaceDialog key={`${workspaceDialog}-${selected?.id ?? "none"}`} mode={workspaceDialog} workspace={selected} onClose={() => setWorkspaceDialog(null)} onCreate={createWorkspace} onUpdate={updateWorkspace} onDelete={(id) => { deleteWorkspace(id); setWorkspaceDialog(null); toast.success("Workspace deleted"); }} />
      <BoardDialog open={boardDialog} onClose={() => setBoardDialog(false)} workspaceId={effectiveSelectedId} createBoard={createBoard} />
    </PageContainer>
  );
}

function WorkspaceDialog({ mode, workspace, onClose, onCreate, onUpdate, onDelete }: { mode: "create" | "edit" | null; workspace?: Workspace; onClose: () => void; onCreate: ReturnType<typeof useFlowvoraStore.getState>["createWorkspace"]; onUpdate: ReturnType<typeof useFlowvoraStore.getState>["updateWorkspace"]; onDelete: (id: string) => void }) {
  const [name, setName] = useState(mode === "edit" ? workspace?.name ?? "" : "");
  const [accent, setAccent] = useState(mode === "edit" ? workspace?.accent ?? accentOptions[0] : accentOptions[0]);
  const [icon, setIcon] = useState(mode === "edit" ? workspace?.icon ?? iconOptions[0] : iconOptions[0]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!name.trim()) return; if (mode === "edit" && workspace) onUpdate(workspace.id, { name, accent, icon }); else onCreate(name, { accent, icon }); onClose(); };
  const boardCount = workspace ? Object.values(useFlowvoraStore.getState().data.boardsById).filter((board) => board.workspaceId === workspace.id).length : 0;
  return <Dialog open={Boolean(mode)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{mode === "edit" ? "Edit workspace" : "Create workspace"}</DialogTitle><DialogDescription>Give this area a distinct identity so projects stay easy to scan.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><Field label="Name"><Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Freelance" /></Field><Field label="Icon"><Select value={icon} onValueChange={setIcon}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{iconOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Accent"><div className="flex flex-wrap gap-2">{accentOptions.map((color) => <button key={color} type="button" onClick={() => setAccent(color)} className={cn("size-8 rounded-full border-2", accent === color ? "border-foreground" : "border-transparent")} style={{ backgroundColor: color }} aria-label={`Use ${color}`} />)}</div></Field><DialogFooter className="items-center sm:justify-between">{mode === "edit" && workspace ? <HoldButton onComplete={() => onDelete(workspace.id)} holdDuration={1200}>Hold to delete · {boardCount} board{boardCount === 1 ? "" : "s"}</HoldButton> : <span />}<div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={!name.trim()}>{mode === "edit" ? "Save changes" : "Create workspace"}</Button></div></DialogFooter></form></DialogContent></Dialog>;
}

function BoardDialog({ open, onClose, workspaceId, createBoard }: { open: boolean; onClose: () => void; workspaceId: string; createBoard: ReturnType<typeof useFlowvoraStore.getState>["createBoard"] }) {
  const [name, setName] = useState(""); const [template, setTemplate] = useState<BoardTemplateId | "blank">("blank");
  const submit = (event: React.FormEvent) => { event.preventDefault(); const id = createBoard(workspaceId, name, template === "blank" ? undefined : template); if (id) { toast.success("Board created"); onClose(); setName(""); } };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Create board</DialogTitle><DialogDescription>Start blank or use a practical workflow template.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><Field label="Board name"><Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Product launch" /></Field><Field label="Template"><Select value={template} onValueChange={(value) => setTemplate(value as BoardTemplateId | "blank")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blank">Default Flow workflow</SelectItem>{BOARD_TEMPLATES.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" disabled={!workspaceId || !name.trim()}>Create board</Button></DialogFooter></form></DialogContent></Dialog>;
}
