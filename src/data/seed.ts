import { addDays, format, subDays } from "date-fns";

import { DEFAULT_SETTINGS } from "../domain/constants";
import { createId, type IdFactory } from "../domain/ids";
import type {
  ActivityEvent,
  ChecklistItem,
  Column,
  FlowvoraData,
  Label,
  Priority,
  Energy,
  Task,
  Workspace,
  Board,
} from "../domain/types";

function cloneDefaultSettings(): FlowvoraData["settings"] {
  return {
    ...DEFAULT_SETTINGS,
    aging: { ...DEFAULT_SETTINGS.aging },
    newBoardColumns: DEFAULT_SETTINGS.newBoardColumns.map((column) => ({ ...column })),
  };
}

export function createEmptyFlowvoraData(): FlowvoraData {
  return {
    schemaVersion: 1,
    workspacesById: {},
    boardsById: {},
    columnsById: {},
    tasksById: {},
    labelsById: {},
    activities: [],
    currentWorkspaceId: null,
    currentFocusTaskId: null,
    settings: cloneDefaultSettings(),
    focusTimer: {
      status: "idle",
      durationSeconds: DEFAULT_SETTINGS.focusDurationMinutes * 60,
      remainingSeconds: DEFAULT_SETTINGS.focusDurationMinutes * 60,
      startedAt: null,
      endsAt: null,
    },
  };
}

export function createSeedData(now = new Date(), idFactory: IdFactory = createId): FlowvoraData {
  const data = createEmptyFlowvoraData();
  const nowIso = now.toISOString();
  const workspaceId = idFactory("ws");
  const boardId = idFactory("board");

  const workspace: Workspace = {
    id: workspaceId,
    name: "Development",
    icon: "Code2",
    accent: "#7B8CFF",
    favorite: true,
    position: 0,
    createdAt: subDays(now, 24).toISOString(),
    updatedAt: nowIso,
  };

  const board: Board = {
    id: boardId,
    workspaceId,
    name: "Website Redesign",
    description: "Polish the new product experience from structure through launch.",
    accent: "#7B8CFF",
    background: { type: "solid", preset: "graphite" },
    favorite: true,
    archivedAt: null,
    view: "kanban",
    flowMode: true,
    position: 0,
    lastOpenedAt: nowIso,
    createdAt: subDays(now, 20).toISOString(),
    updatedAt: nowIso,
  };

  const columnSpecs = [
    ["Ideas", "backlog", "#697586"],
    ["Planned", "planned", "#7B8CFF"],
    ["In Progress", "active", "#65C9A8"],
    ["Review", "review", "#D9A441"],
    ["Done", "done", "#68B984"],
  ] as const;
  const columns = columnSpecs.map<Column>(([name, stage, accent], index) => ({
    id: idFactory("col"),
    boardId,
    name,
    stage,
    accent,
    collapsed: false,
    position: index,
    createdAt: board.createdAt,
    updatedAt: nowIso,
  }));

  const labelSpecs = [
    ["Frontend", "#6F83C8"],
    ["Design", "#A46E8C"],
    ["Bug", "#B46767"],
    ["Research", "#5F9F87"],
    ["Launch", "#B38A4A"],
  ] as const;
  const labels = labelSpecs.map<Label>(([name, color]) => ({
    id: idFactory("label"),
    workspaceId,
    name,
    color,
    createdAt: board.createdAt,
    updatedAt: nowIso,
  }));
  const labelId = Object.fromEntries(labels.map((label) => [label.name, label.id])) as Record<string, string>;

  const checklist = (titles: readonly string[], completedCount = 0): ChecklistItem[] =>
    titles.map((title, index) => ({
      id: idFactory("check"),
      title,
      completed: index < completedCount,
      position: index,
      createdAt: subDays(now, 5).toISOString(),
      completedAt: index < completedCount ? subDays(now, 1).toISOString() : null,
    }));

  const makeTask = (input: {
    column: number;
    order: number;
    title: string;
    description: string;
    priority: Priority;
    energy: Energy | null;
    labels: string[];
    dueOffset?: number;
    updatedDaysAgo?: number;
    columnDaysAgo?: number;
    checklist?: ChecklistItem[];
    completedDaysAgo?: number;
  }): Task => {
    const completedAt =
      input.completedDaysAgo === undefined ? null : subDays(now, input.completedDaysAgo).toISOString();
    return {
      id: idFactory("task"),
      boardId,
      columnId: columns[input.column].id,
      title: input.title,
      description: input.description,
      notes: "",
      priority: input.priority,
      energy: input.energy,
      labelIds: input.labels.map((name) => labelId[name]).filter(Boolean),
      checklist: input.checklist ?? [],
      dueDate:
        input.dueOffset === undefined ? null : format(addDays(now, input.dueOffset), "yyyy-MM-dd"),
      archivedAt: null,
      manualOrder: input.order,
      canvasPosition: { x: input.column * 300 + 32, y: input.order * 190 + 32 },
      createdAt: subDays(now, Math.max(6, input.updatedDaysAgo ?? 0)).toISOString(),
      updatedAt: subDays(now, input.updatedDaysAgo ?? 0).toISOString(),
      columnEnteredAt: subDays(now, input.columnDaysAgo ?? 0).toISOString(),
      completedAt,
    };
  };

  const tasks: Task[] = [
    makeTask({
      column: 0,
      order: 0,
      title: "Explore onboarding empty states",
      description: "Collect concise examples for first-time workspace guidance.",
      priority: "low",
      energy: "medium",
      labels: ["Research", "Design"],
      updatedDaysAgo: 8,
    }),
    makeTask({
      column: 1,
      order: 0,
      title: "Prepare form validation states",
      description: "Document inline error, success, and disabled behavior.",
      priority: "high",
      energy: "medium",
      labels: ["Frontend"],
      dueOffset: 0,
      updatedDaysAgo: 1,
    }),
    makeTask({
      column: 1,
      order: 1,
      title: "Review navigation labels",
      description: "Confirm each destination is distinct and easy to scan.",
      priority: "medium",
      energy: "low",
      labels: ["Design"],
      dueOffset: 2,
      updatedDaysAgo: 3,
    }),
    makeTask({
      column: 2,
      order: 0,
      title: "Fix mobile navigation",
      description: "Make the drawer reliable at 375 px and preserve board context.",
      priority: "urgent",
      energy: "deep",
      labels: ["Frontend", "Bug"],
      dueOffset: 1,
      updatedDaysAgo: 0,
      columnDaysAgo: 1,
      checklist: checklist(["Build drawer shell", "Add focus trap", "Test narrow screens"], 1),
    }),
    makeTask({
      column: 2,
      order: 1,
      title: "Connect task filters",
      description: "Compose priority, label, deadline, and energy filters.",
      priority: "high",
      energy: "deep",
      labels: ["Frontend"],
      dueOffset: -1,
      updatedDaysAgo: 4,
      columnDaysAgo: 4,
      checklist: checklist(["Filter model", "Active chips", "Clear action"], 2),
    }),
    makeTask({
      column: 3,
      order: 0,
      title: "Review task detail drawer",
      description: "Check keyboard flow, destructive actions, and mobile sizing.",
      priority: "medium",
      energy: "medium",
      labels: ["Design", "Frontend"],
      dueOffset: 0,
      updatedDaysAgo: 2,
      columnDaysAgo: 3,
    }),
    makeTask({
      column: 4,
      order: 0,
      title: "Define interface color tokens",
      description: "Finish the calm dark and light surface hierarchy.",
      priority: "high",
      energy: "deep",
      labels: ["Design"],
      updatedDaysAgo: 0,
      columnDaysAgo: 0,
      completedDaysAgo: 0,
      checklist: checklist(["Dark tokens", "Light tokens", "Contrast pass"], 3),
    }),
  ];

  const focusTask = tasks.find((task) => task.title === "Fix mobile navigation") ?? tasks[0];
  const activities: ActivityEvent[] = [
    {
      id: idFactory("activity"),
      type: "board.created",
      occurredAt: board.createdAt,
      workspaceId,
      boardId,
      taskId: null,
      title: "Created Website Redesign",
      detail: null,
      metadata: {},
    },
    {
      id: idFactory("activity"),
      type: "task.moved",
      occurredAt: subDays(now, 1).toISOString(),
      workspaceId,
      boardId,
      taskId: focusTask.id,
      title: focusTask.title,
      detail: "Planned → In Progress",
      metadata: { from: "Planned", to: "In Progress" },
    },
    {
      id: idFactory("activity"),
      type: "focus.changed",
      occurredAt: nowIso,
      workspaceId,
      boardId,
      taskId: focusTask.id,
      title: `Focused “${focusTask.title}”`,
      detail: null,
      metadata: {},
    },
  ];

  data.workspacesById[workspace.id] = workspace;
  data.boardsById[board.id] = board;
  for (const column of columns) data.columnsById[column.id] = column;
  for (const label of labels) data.labelsById[label.id] = label;
  for (const task of tasks) data.tasksById[task.id] = task;
  data.activities = activities;
  data.currentWorkspaceId = workspaceId;
  data.currentFocusTaskId = focusTask.id;
  data.settings.defaultWorkspaceId = workspaceId;
  return data;
}

