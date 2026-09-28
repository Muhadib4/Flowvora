"use client";

import { create } from "zustand";

import { createEmptyFlowvoraData, createSeedData } from "@/data/seed";
import { materializeBoardTemplate, type BoardTemplateId } from "@/data/templates";
import { createId } from "@/domain/ids";
import type {
  ActivityEvent,
  Board,
  BoardBackground,
  BoardId,
  BoardView,
  ChecklistItem,
  Column,
  ColumnId,
  ColumnStage,
  Energy,
  FlowvoraData,
  FlowvoraSettings,
  Label,
  LabelId,
  Priority,
  Task,
  TaskId,
  Workspace,
  WorkspaceId,
} from "@/domain/types";
import { loadStoredData, removeStoredData, saveStoredData } from "@/persistence/storage";

export type HydrationStatus = "idle" | "loading" | "ready" | "failed";
export type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface UndoEntry { id: string; label: string; snapshot: FlowvoraData; createdAt: number }

export interface CreateTaskInput {
  boardId: BoardId;
  columnId?: ColumnId;
  title: string;
  description?: string;
  priority?: Priority;
  energy?: Energy | null;
  dueDate?: string | null;
}

export type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "notes" | "priority" | "energy" | "dueDate" | "labelIds">>;

export interface FlowvoraStore {
  data: FlowvoraData;
  hydrationStatus: HydrationStatus;
  saveStatus: SaveStatus;
  storageMessage: string | null;
  lastSavedAt: string | null;
  undoEntries: UndoEntry[];
  hydrate: () => void;
  createWorkspace: (name: string, options?: Partial<Pick<Workspace, "icon" | "accent" | "favorite">>) => WorkspaceId;
  updateWorkspace: (id: WorkspaceId, patch: Partial<Pick<Workspace, "name" | "icon" | "accent" | "favorite">>) => void;
  deleteWorkspace: (id: WorkspaceId) => void;
  createBoard: (workspaceId: WorkspaceId, name: string, templateId?: BoardTemplateId) => BoardId | null;
  updateBoard: (id: BoardId, patch: Partial<Pick<Board, "name" | "description" | "accent" | "favorite" | "flowMode" | "view" | "background">>) => void;
  archiveBoard: (id: BoardId) => void;
  restoreBoard: (id: BoardId) => void;
  deleteBoard: (id: BoardId) => void;
  duplicateBoard: (id: BoardId) => BoardId | null;
  openBoard: (id: BoardId) => void;
  setBoardView: (id: BoardId, view: BoardView) => void;
  setBoardBackground: (id: BoardId, background: BoardBackground) => void;
  createColumn: (boardId: BoardId, name?: string, stage?: ColumnStage) => ColumnId | null;
  updateColumn: (id: ColumnId, patch: Partial<Pick<Column, "name" | "stage" | "accent" | "collapsed">>) => void;
  deleteColumn: (id: ColumnId, destinationId?: ColumnId) => void;
  reorderColumns: (boardId: BoardId, orderedIds: ColumnId[]) => void;
  createTask: (input: CreateTaskInput) => TaskId | null;
  updateTask: (id: TaskId, patch: UpdateTaskInput) => void;
  archiveTask: (id: TaskId) => void;
  deleteTask: (id: TaskId) => void;
  duplicateTask: (id: TaskId) => TaskId | null;
  moveTask: (id: TaskId, toColumnId: ColumnId, toIndex?: number) => void;
  setTaskCanvasPosition: (id: TaskId, x: number, y: number) => void;
  setCurrentFocus: (id: TaskId | null) => void;
  addChecklistItem: (taskId: TaskId, title: string) => void;
  updateChecklistItem: (taskId: TaskId, itemId: string, patch: Partial<Pick<ChecklistItem, "title" | "completed">>) => void;
  deleteChecklistItem: (taskId: TaskId, itemId: string) => void;
  createLabel: (workspaceId: WorkspaceId, name: string, color: string) => LabelId | null;
  updateLabel: (id: LabelId, patch: Partial<Pick<Label, "name" | "color">>) => void;
  deleteLabel: (id: LabelId) => void;
  updateSettings: (patch: Partial<FlowvoraSettings>) => void;
  setAvailableEnergy: (energy: Energy) => void;
  startTimer: (minutes?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: (minutes?: number) => void;
  replaceData: (data: FlowvoraData) => void;
  resetApplication: () => void;
  clearDemo: () => void;
  undo: (id: string) => void;
  dismissUndo: (id: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function copyData(data: FlowvoraData): FlowvoraData {
  return structuredClone(data);
}

function workspaceForBoard(data: FlowvoraData, boardId: BoardId | null) {
  return boardId ? data.boardsById[boardId]?.workspaceId ?? null : null;
}

function addActivity(data: FlowvoraData, input: Omit<ActivityEvent, "id" | "occurredAt">, timestamp = new Date().toISOString()) {
  const event: ActivityEvent = { ...input, id: createId("activity"), occurredAt: timestamp };
  data.activities = [event, ...data.activities].slice(0, data.settings.activityLimit);
}

function orderedTasks(data: FlowvoraData, columnId: ColumnId) {
  return Object.values(data.tasksById)
    .filter((task) => task.columnId === columnId && task.archivedAt === null)
    .sort((a, b) => a.manualOrder - b.manualOrder || a.id.localeCompare(b.id));
}

function reindex(tasks: Task[]) {
  tasks.forEach((task, index) => { task.manualOrder = index; });
}

function normalizeFocus(data: FlowvoraData) {
  const focus = data.currentFocusTaskId ? data.tasksById[data.currentFocusTaskId] : null;
  if (!focus || focus.archivedAt || data.boardsById[focus.boardId]?.archivedAt) data.currentFocusTaskId = null;
}

export const useFlowvoraStore = create<FlowvoraStore>((set, get) => {
  const scheduleSave = (data: FlowvoraData) => {
    set({ saveStatus: "saving" });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        saveStoredData(window.localStorage, data);
        set({ saveStatus: "saved", lastSavedAt: new Date().toISOString(), storageMessage: null });
      } catch (error) {
        set({ saveStatus: "failed", storageMessage: error instanceof Error ? error.message : "Flowvora could not save locally." });
      }
    }, 180);
  };

  const commit = (next: FlowvoraData, undoLabel?: string) => {
    const previous = get().data;
    const undoEntry = undoLabel ? { id: createId("undo"), label: undoLabel, snapshot: previous, createdAt: Date.now() } : null;
    set((state) => ({
      data: next,
      undoEntries: undoEntry ? [undoEntry, ...state.undoEntries].slice(0, 5) : state.undoEntries,
    }));
    scheduleSave(next);
  };

  const edit = (recipe: (draft: FlowvoraData, now: string) => void, undoLabel?: string) => {
    const next = copyData(get().data);
    recipe(next, new Date().toISOString());
    normalizeFocus(next);
    commit(next, undoLabel);
  };

  return {
    data: createEmptyFlowvoraData(),
    hydrationStatus: "idle",
    saveStatus: "idle",
    storageMessage: null,
    lastSavedAt: null,
    undoEntries: [],

    hydrate: () => {
      if (get().hydrationStatus !== "idle") return;
      set({ hydrationStatus: "loading" });
      const loaded = loadStoredData(window.localStorage);
      if (loaded.status === "loaded") {
        set({ data: loaded.data, hydrationStatus: "ready", saveStatus: "saved" });
      } else {
        const seeded = createSeedData();
        set({
          data: seeded,
          hydrationStatus: loaded.status === "unavailable" ? "failed" : "ready",
          storageMessage: loaded.status === "corrupt" || loaded.status === "unavailable" ? loaded.message : null,
        });
        scheduleSave(seeded);
      }
    },

    createWorkspace: (name, options) => {
      const trimmed = name.trim();
      if (!trimmed) return "";
      const id = createId("ws");
      edit((data, now) => {
        const workspace: Workspace = { id, name: trimmed, icon: options?.icon ?? "Layers3", accent: options?.accent ?? "#7B8CFF", favorite: options?.favorite ?? false, position: Object.keys(data.workspacesById).length, createdAt: now, updatedAt: now };
        data.workspacesById[id] = workspace;
        data.currentWorkspaceId = id;
        if (!data.settings.defaultWorkspaceId) data.settings.defaultWorkspaceId = id;
        addActivity(data, { type: "workspace.created", workspaceId: id, boardId: null, taskId: null, title: `Created ${trimmed}`, detail: null, metadata: {} }, now);
      });
      return id;
    },

    updateWorkspace: (id, patch) => edit((data, now) => {
      const current = data.workspacesById[id];
      if (!current) return;
      data.workspacesById[id] = { ...current, ...patch, name: patch.name?.trim() || current.name, updatedAt: now };
    }),

    deleteWorkspace: (id) => edit((data) => {
      if (!data.workspacesById[id]) return;
      const boardIds = new Set(Object.values(data.boardsById).filter((board) => board.workspaceId === id).map((board) => board.id));
      for (const task of Object.values(data.tasksById)) if (boardIds.has(task.boardId)) delete data.tasksById[task.id];
      for (const column of Object.values(data.columnsById)) if (boardIds.has(column.boardId)) delete data.columnsById[column.id];
      for (const boardId of boardIds) delete data.boardsById[boardId];
      for (const label of Object.values(data.labelsById)) if (label.workspaceId === id) delete data.labelsById[label.id];
      delete data.workspacesById[id];
      const remaining = Object.values(data.workspacesById).sort((a, b) => a.position - b.position);
      data.currentWorkspaceId = remaining[0]?.id ?? null;
      if (data.settings.defaultWorkspaceId === id) data.settings.defaultWorkspaceId = remaining[0]?.id ?? null;
      data.activities = data.activities.filter((activity) => activity.workspaceId !== id);
    }, "Workspace deleted"),

    createBoard: (workspaceId, name, templateId) => {
      if (!get().data.workspacesById[workspaceId] || !name.trim()) return null;
      let createdId: BoardId | null = null;
      edit((data, now) => {
        const position = Object.values(data.boardsById).filter((board) => board.workspaceId === workspaceId).length;
        if (templateId) {
          const materialized = materializeBoardTemplate({ workspaceId, templateId, boardName: name.trim(), boardPosition: position, existingLabels: Object.values(data.labelsById), now: new Date(now) });
          data.boardsById[materialized.board.id] = materialized.board;
          for (const column of materialized.columns) data.columnsById[column.id] = column;
          for (const task of materialized.tasks) data.tasksById[task.id] = task;
          for (const label of materialized.newLabels) data.labelsById[label.id] = label;
          createdId = materialized.board.id;
        } else {
          const id = createId("board"); createdId = id;
          data.boardsById[id] = { id, workspaceId, name: name.trim(), description: "", accent: "#7B8CFF", background: { type: "solid", preset: "graphite" }, favorite: false, archivedAt: null, view: data.settings.defaultBoardView, flowMode: data.settings.defaultFlowMode, position, lastOpenedAt: now, createdAt: now, updatedAt: now };
          data.settings.newBoardColumns.forEach((entry, index) => {
            const columnId = createId("col");
            data.columnsById[columnId] = { id: columnId, boardId: id, name: entry.name, stage: entry.stage, accent: entry.accent, collapsed: false, position: index, createdAt: now, updatedAt: now };
          });
        }
        const boardId = createdId as BoardId;
        data.currentWorkspaceId = workspaceId;
        addActivity(data, { type: "board.created", workspaceId, boardId, taskId: null, title: `Created ${name.trim()}`, detail: templateId ? "Created from template" : null, metadata: {} }, now);
      });
      return createdId;
    },

    updateBoard: (id, patch) => edit((data, now) => {
      const board = data.boardsById[id]; if (!board) return;
      data.boardsById[id] = { ...board, ...patch, name: patch.name?.trim() || board.name, updatedAt: now };
    }),

    archiveBoard: (id) => edit((data, now) => {
      const board = data.boardsById[id]; if (!board) return;
      board.archivedAt = now; board.updatedAt = now;
      addActivity(data, { type: "board.archived", workspaceId: board.workspaceId, boardId: id, taskId: null, title: `Archived ${board.name}`, detail: null, metadata: {} }, now);
    }, "Board archived"),

    restoreBoard: (id) => edit((data, now) => {
      const board = data.boardsById[id]; if (!board) return;
      board.archivedAt = null; board.updatedAt = now;
      addActivity(data, { type: "board.restored", workspaceId: board.workspaceId, boardId: id, taskId: null, title: `Restored ${board.name}`, detail: null, metadata: {} }, now);
    }),

    deleteBoard: (id) => edit((data) => {
      for (const task of Object.values(data.tasksById)) if (task.boardId === id) delete data.tasksById[task.id];
      for (const column of Object.values(data.columnsById)) if (column.boardId === id) delete data.columnsById[column.id];
      delete data.boardsById[id];
      data.activities = data.activities.filter((activity) => activity.boardId !== id);
    }, "Board deleted"),

    duplicateBoard: (id) => {
      const source = get().data.boardsById[id]; if (!source) return null;
      const newId = createId("board");
      edit((data, now) => {
        const board: Board = { ...source, id: newId, name: `${source.name} copy`, favorite: false, archivedAt: null, position: Object.values(data.boardsById).filter((item) => item.workspaceId === source.workspaceId).length, lastOpenedAt: now, createdAt: now, updatedAt: now };
        data.boardsById[newId] = board;
        const columnMap = new Map<string, string>();
        Object.values(data.columnsById).filter((column) => column.boardId === id).forEach((column) => {
          const columnId = createId("col"); columnMap.set(column.id, columnId);
          data.columnsById[columnId] = { ...column, id: columnId, boardId: newId, createdAt: now, updatedAt: now };
        });
        Object.values(data.tasksById).filter((task) => task.boardId === id).forEach((task) => {
          const taskId = createId("task"); const columnId = columnMap.get(task.columnId); if (!columnId) return;
          data.tasksById[taskId] = { ...task, id: taskId, boardId: newId, columnId, checklist: task.checklist.map((item) => ({ ...item, id: createId("check"), createdAt: now, completedAt: item.completed ? now : null })), createdAt: now, updatedAt: now, columnEnteredAt: now, completedAt: task.completedAt ? now : null };
        });
        addActivity(data, { type: "board.created", workspaceId: board.workspaceId, boardId: newId, taskId: null, title: `Duplicated ${source.name}`, detail: null, metadata: {} }, now);
      });
      return newId;
    },

    openBoard: (id) => edit((data, now) => { const board = data.boardsById[id]; if (board) { board.lastOpenedAt = now; data.currentWorkspaceId = board.workspaceId; } }),
    setBoardView: (id, view) => get().updateBoard(id, { view }),
    setBoardBackground: (id, background) => get().updateBoard(id, { background }),

    createColumn: (boardId, name = "New stage", stage = "planned") => {
      if (!get().data.boardsById[boardId]) return null;
      const id = createId("col");
      edit((data, now) => { data.columnsById[id] = { id, boardId, name: name.trim() || "New stage", stage, accent: "#7B8CFF", collapsed: false, position: Object.values(data.columnsById).filter((column) => column.boardId === boardId).length, createdAt: now, updatedAt: now }; });
      return id;
    },
    updateColumn: (id, patch) => edit((data, now) => { const column = data.columnsById[id]; if (column) data.columnsById[id] = { ...column, ...patch, name: patch.name?.trim() || column.name, updatedAt: now }; }),
    deleteColumn: (id, destinationId) => edit((data, now) => {
      const column = data.columnsById[id]; if (!column) return;
      const destination = destinationId ? data.columnsById[destinationId] : undefined;
      const tasks = orderedTasks(data, id);
      if (destination && destination.boardId === column.boardId) {
        const target = orderedTasks(data, destination.id);
        tasks.forEach((task, index) => { task.columnId = destination.id; task.columnEnteredAt = now; task.updatedAt = now; task.manualOrder = target.length + index; task.completedAt = destination.stage === "done" ? now : null; });
      } else tasks.forEach((task) => delete data.tasksById[task.id]);
      delete data.columnsById[id];
      Object.values(data.columnsById).filter((item) => item.boardId === column.boardId).sort((a, b) => a.position - b.position).forEach((item, index) => { item.position = index; });
    }, "Column deleted"),
    reorderColumns: (boardId, orderedIds) => edit((data, now) => { orderedIds.forEach((id, index) => { const column = data.columnsById[id]; if (column?.boardId === boardId) { column.position = index; column.updatedAt = now; } }); }),

    createTask: (input) => {
      const title = input.title.trim(); const board = get().data.boardsById[input.boardId]; if (!title || !board) return null;
      const columns = Object.values(get().data.columnsById).filter((column) => column.boardId === input.boardId).sort((a, b) => a.position - b.position);
      const column = (input.columnId && get().data.columnsById[input.columnId]) || columns[0]; if (!column) return null;
      const id = createId("task");
      edit((data, now) => {
        data.tasksById[id] = { id, boardId: input.boardId, columnId: column.id, title, description: input.description?.trim() ?? "", notes: "", priority: input.priority ?? "medium", energy: input.energy ?? null, labelIds: [], checklist: [], dueDate: input.dueDate ?? null, archivedAt: null, manualOrder: orderedTasks(data, column.id).length, canvasPosition: { x: column.position * 300 + 32, y: orderedTasks(data, column.id).length * 170 + 32 }, createdAt: now, updatedAt: now, columnEnteredAt: now, completedAt: column.stage === "done" ? now : null };
        addActivity(data, { type: "task.created", workspaceId: board.workspaceId, boardId: board.id, taskId: id, title: `Created “${title}”`, detail: null, metadata: {} }, now);
      });
      return id;
    },

    updateTask: (id, patch) => edit((data, now) => {
      const task = data.tasksById[id]; if (!task) return;
      const previousPriority = task.priority; const previousDue = task.dueDate;
      data.tasksById[id] = { ...task, ...patch, title: patch.title?.trim() || task.title, updatedAt: now };
      if (patch.priority && patch.priority !== previousPriority) addActivity(data, { type: "task.priority-changed", workspaceId: workspaceForBoard(data, task.boardId), boardId: task.boardId, taskId: id, title: task.title, detail: `${previousPriority} → ${patch.priority}`, metadata: { from: previousPriority, to: patch.priority } }, now);
      if (patch.dueDate !== undefined && patch.dueDate !== previousDue) addActivity(data, { type: "task.due-date-changed", workspaceId: workspaceForBoard(data, task.boardId), boardId: task.boardId, taskId: id, title: task.title, detail: patch.dueDate ?? "Due date cleared", metadata: { from: previousDue, to: patch.dueDate } }, now);
    }),

    archiveTask: (id) => edit((data, now) => { const task = data.tasksById[id]; if (!task) return; task.archivedAt = now; task.updatedAt = now; addActivity(data, { type: "task.archived", workspaceId: workspaceForBoard(data, task.boardId), boardId: task.boardId, taskId: id, title: `Archived “${task.title}”`, detail: null, metadata: {} }, now); }, "Task archived"),
    deleteTask: (id) => edit((data) => { delete data.tasksById[id]; }, "Task deleted"),
    duplicateTask: (id) => {
      const source = get().data.tasksById[id]; if (!source) return null;
      const newId = createId("task");
      edit((data, now) => { data.tasksById[newId] = { ...source, id: newId, title: `${source.title} copy`, checklist: source.checklist.map((item) => ({ ...item, id: createId("check"), createdAt: now, completedAt: item.completed ? now : null })), manualOrder: orderedTasks(data, source.columnId).length, archivedAt: null, createdAt: now, updatedAt: now, columnEnteredAt: now, completedAt: data.columnsById[source.columnId]?.stage === "done" ? now : null }; });
      return newId;
    },

    moveTask: (id, toColumnId, toIndex) => edit((data, now) => {
      const task = data.tasksById[id]; const targetColumn = data.columnsById[toColumnId]; const sourceColumn = task ? data.columnsById[task.columnId] : undefined;
      if (!task || !sourceColumn || !targetColumn || sourceColumn.boardId !== targetColumn.boardId) return;
      const oldColumnId = task.columnId;
      const sourceTasks = orderedTasks(data, oldColumnId).filter((item) => item.id !== id);
      if (oldColumnId === toColumnId) {
        const index = Math.max(0, Math.min(toIndex ?? sourceTasks.length, sourceTasks.length)); sourceTasks.splice(index, 0, task); reindex(sourceTasks); task.updatedAt = now; return;
      }
      reindex(sourceTasks);
      const targetTasks = orderedTasks(data, toColumnId);
      const index = Math.max(0, Math.min(toIndex ?? targetTasks.length, targetTasks.length));
      task.columnId = toColumnId; task.columnEnteredAt = now; task.updatedAt = now; task.completedAt = targetColumn.stage === "done" ? now : null;
      targetTasks.splice(index, 0, task); reindex(targetTasks);
      addActivity(data, { type: targetColumn.stage === "done" ? "task.completed" : "task.moved", workspaceId: workspaceForBoard(data, task.boardId), boardId: task.boardId, taskId: id, title: task.title, detail: `${sourceColumn.name} → ${targetColumn.name}`, metadata: { from: sourceColumn.name, to: targetColumn.name } }, now);
    }),

    setTaskCanvasPosition: (id, x, y) => edit((data, now) => { const task = data.tasksById[id]; if (task) { task.canvasPosition = { x: Math.round(x), y: Math.round(y) }; task.updatedAt = now; } }),
    setCurrentFocus: (id) => edit((data, now) => { const task = id ? data.tasksById[id] : null; data.currentFocusTaskId = task && !task.archivedAt ? id : null; addActivity(data, { type: "focus.changed", workspaceId: task ? workspaceForBoard(data, task.boardId) : null, boardId: task?.boardId ?? null, taskId: task?.id ?? null, title: task ? `Focused “${task.title}”` : "Cleared current focus", detail: null, metadata: {} }, now); }),

    addChecklistItem: (taskId, title) => edit((data, now) => { const task = data.tasksById[taskId]; if (!task || !title.trim()) return; task.checklist.push({ id: createId("check"), title: title.trim(), completed: false, position: task.checklist.length, createdAt: now, completedAt: null }); task.updatedAt = now; }),
    updateChecklistItem: (taskId, itemId, patch) => edit((data, now) => {
      const task = data.tasksById[taskId]; const item = task?.checklist.find((entry) => entry.id === itemId); if (!task || !item) return;
      if (patch.title !== undefined && patch.title.trim()) item.title = patch.title.trim();
      if (patch.completed !== undefined) { item.completed = patch.completed; item.completedAt = patch.completed ? now : null; }
      task.updatedAt = now;
      const completed = task.checklist.filter((entry) => entry.completed).length;
      if (patch.completed !== undefined && completed > 0 && (completed === task.checklist.length || completed % 3 === 0)) addActivity(data, { type: "checklist.milestone", workspaceId: workspaceForBoard(data, task.boardId), boardId: task.boardId, taskId, title: task.title, detail: `${completed} / ${task.checklist.length} completed`, metadata: { completed, total: task.checklist.length } }, now);
    }),
    deleteChecklistItem: (taskId, itemId) => edit((data, now) => { const task = data.tasksById[taskId]; if (!task) return; task.checklist = task.checklist.filter((item) => item.id !== itemId).map((item, index) => ({ ...item, position: index })); task.updatedAt = now; }),

    createLabel: (workspaceId, name, color) => {
      if (!get().data.workspacesById[workspaceId] || !name.trim()) return null;
      const id = createId("label"); edit((data, now) => { data.labelsById[id] = { id, workspaceId, name: name.trim(), color, createdAt: now, updatedAt: now }; }); return id;
    },
    updateLabel: (id, patch) => edit((data, now) => { const label = data.labelsById[id]; if (label) data.labelsById[id] = { ...label, ...patch, name: patch.name?.trim() || label.name, updatedAt: now }; }),
    deleteLabel: (id) => edit((data) => { delete data.labelsById[id]; Object.values(data.tasksById).forEach((task) => { task.labelIds = task.labelIds.filter((labelId) => labelId !== id); }); }, "Label deleted"),

    updateSettings: (patch) => edit((data) => { data.settings = { ...data.settings, ...patch, aging: patch.aging ? { ...data.settings.aging, ...patch.aging } : data.settings.aging, newBoardColumns: patch.newBoardColumns ?? data.settings.newBoardColumns }; }),
    setAvailableEnergy: (energy) => get().updateSettings({ availableEnergy: energy }),
    startTimer: (minutes) => edit((data, now) => { const duration = Math.round((minutes ?? data.settings.focusDurationMinutes) * 60); data.focusTimer = { status: "running", durationSeconds: duration, remainingSeconds: duration, startedAt: now, endsAt: new Date(Date.parse(now) + duration * 1000).toISOString() }; }),
    pauseTimer: () => edit((data, now) => { const timer = data.focusTimer; if (timer.status !== "running" || !timer.endsAt) return; const remaining = Math.max(0, Math.ceil((Date.parse(timer.endsAt) - Date.parse(now)) / 1000)); data.focusTimer = { ...timer, status: "paused", remainingSeconds: remaining, startedAt: null, endsAt: null }; }),
    resumeTimer: () => edit((data, now) => { const timer = data.focusTimer; if (timer.status !== "paused" || timer.remainingSeconds <= 0) return; data.focusTimer = { ...timer, status: "running", startedAt: now, endsAt: new Date(Date.parse(now) + timer.remainingSeconds * 1000).toISOString() }; }),
    resetTimer: (minutes) => edit((data) => { const duration = Math.round((minutes ?? data.settings.focusDurationMinutes) * 60); data.focusTimer = { status: "idle", durationSeconds: duration, remainingSeconds: duration, startedAt: null, endsAt: null }; }),

    replaceData: (data) => { commit(copyData(data), "Data import"); },
    resetApplication: () => { const seeded = createSeedData(); try { removeStoredData(window.localStorage); } catch { /* app remains usable */ } commit(seeded); set({ undoEntries: [] }); },
    clearDemo: () => { const empty = createEmptyFlowvoraData(); try { removeStoredData(window.localStorage); } catch { /* app remains usable */ } commit(empty, "Demo content cleared"); },
    undo: (id) => { const entry = get().undoEntries.find((item) => item.id === id); if (!entry) return; const next = copyData(entry.snapshot); set((state) => ({ data: next, undoEntries: state.undoEntries.filter((item) => item.id !== id) })); scheduleSave(next); },
    dismissUndo: (id) => set((state) => ({ undoEntries: state.undoEntries.filter((item) => item.id !== id) })),
  };
});

export const flowvoraStore = useFlowvoraStore;
export function hydrateFlowvora() { useFlowvoraStore.getState().hydrate(); }
export function flushFlowvoraPersistence() {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  try { saveStoredData(window.localStorage, useFlowvoraStore.getState().data); } catch { /* surfaced on next scheduled save */ }
}
