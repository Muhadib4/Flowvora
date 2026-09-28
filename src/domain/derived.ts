import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";

import { PRIORITY_WEIGHT } from "./constants";
import type {
  AgingState,
  Board,
  BoardId,
  BoardPulse,
  ChecklistItem,
  ChecklistProgress,
  Column,
  ColumnId,
  Energy,
  FlowvoraAnalytics,
  FlowvoraData,
  Label,
  LocalDate,
  Priority,
  SearchResult,
  SuggestedTask,
  Task,
  TaskFilters,
  TaskSort,
  WorkspaceId,
} from "./types";

const DAY_KEY_FORMAT = "yyyy-MM-dd";

export function toLocalDateKey(date: Date): LocalDate {
  return format(date, DAY_KEY_FORMAT);
}

export function isLocalDate(value: string): value is LocalDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toLocalDateKey(parseISO(value)) === value;
}

export function isDueToday(task: Pick<Task, "dueDate">, now: Date): boolean {
  return task.dueDate === toLocalDateKey(now);
}

export function isDueTomorrow(task: Pick<Task, "dueDate">, now: Date): boolean {
  return task.dueDate === toLocalDateKey(addDays(now, 1));
}

export function isOverdue(
  task: Pick<Task, "dueDate" | "completedAt" | "archivedAt">,
  now: Date,
): boolean {
  return (
    task.dueDate !== null &&
    task.dueDate < toLocalDateKey(now) &&
    task.completedAt === null &&
    task.archivedAt === null
  );
}

export function getTaskAgeDays(task: Pick<Task, "updatedAt">, now: Date): number {
  return Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(parseISO(task.updatedAt))));
}

export function getColumnAgeDays(task: Pick<Task, "columnEnteredAt">, now: Date): number {
  return Math.max(
    0,
    differenceInCalendarDays(startOfDay(now), startOfDay(parseISO(task.columnEnteredAt))),
  );
}

export function getAgingState(
  task: Pick<Task, "updatedAt">,
  settings: FlowvoraData["settings"]["aging"],
  now: Date,
): AgingState {
  const days = getTaskAgeDays(task, now);
  if (days < settings.freshBeforeDays) return "fresh";
  if (days > settings.staleAfterDays) return "stale";
  return "idle";
}

export function isTaskComplete(task: Task, column: Column | undefined): boolean {
  return task.completedAt !== null || column?.stage === "done";
}

export function isTaskStuck(
  task: Task,
  column: Column | undefined,
  settings: FlowvoraData["settings"]["aging"],
  now: Date,
): boolean {
  if (
    task.archivedAt !== null ||
    task.completedAt !== null ||
    (column?.stage !== "active" && column?.stage !== "review")
  ) {
    return false;
  }

  return getColumnAgeDays(task, now) >= settings.stuckAfterDays;
}

export function getChecklistProgress(items: readonly ChecklistItem[]): ChecklistProgress {
  const total = items.length;
  const completed = items.reduce((count, item) => count + (item.completed ? 1 : 0), 0);
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function selectWorkspaceBoards(
  data: FlowvoraData,
  workspaceId: WorkspaceId,
  includeArchived = false,
): Board[] {
  return Object.values(data.boardsById)
    .filter(
      (board) => board.workspaceId === workspaceId && (includeArchived || board.archivedAt === null),
    )
    .sort(comparePositionThenCreated);
}

export function selectBoardColumns(data: FlowvoraData, boardId: BoardId): Column[] {
  return Object.values(data.columnsById)
    .filter((column) => column.boardId === boardId)
    .sort(comparePositionThenCreated);
}

export function selectColumnTasks(
  data: FlowvoraData,
  columnId: ColumnId,
  includeArchived = false,
): Task[] {
  return Object.values(data.tasksById)
    .filter(
      (task) => task.columnId === columnId && (includeArchived || task.archivedAt === null),
    )
    .sort((left, right) => left.manualOrder - right.manualOrder || left.id.localeCompare(right.id));
}

export function selectBoardTasks(
  data: FlowvoraData,
  boardId: BoardId,
  includeArchived = false,
): Task[] {
  return Object.values(data.tasksById).filter(
    (task) => task.boardId === boardId && (includeArchived || task.archivedAt === null),
  );
}

export function selectCurrentFocus(data: FlowvoraData): Task | null {
  if (data.currentFocusTaskId === null) return null;
  const task = data.tasksById[data.currentFocusTaskId];
  if (!task || task.archivedAt !== null) return null;
  const board = data.boardsById[task.boardId];
  return board && board.archivedAt === null ? task : null;
}

export function getBoardPulse(data: FlowvoraData, boardId: BoardId, now: Date): BoardPulse {
  const pulse: BoardPulse = {
    active: 0,
    dueToday: 0,
    overdue: 0,
    stuck: 0,
    completedToday: 0,
  };

  for (const task of Object.values(data.tasksById)) {
    if (task.boardId !== boardId || task.archivedAt !== null) continue;
    const column = data.columnsById[task.columnId];
    const completed = isTaskComplete(task, column);

    if (!completed) {
      pulse.active += 1;
      if (isDueToday(task, now)) pulse.dueToday += 1;
      if (isOverdue(task, now)) pulse.overdue += 1;
      if (isTaskStuck(task, column, data.settings.aging, now)) pulse.stuck += 1;
    } else if (task.completedAt && isSameDay(parseISO(task.completedAt), now)) {
      pulse.completedToday += 1;
    }
  }

  return pulse;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function matchesText(haystack: string, query: string): boolean {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const normalizedHaystack = normalizeSearch(haystack);
  return tokens.every((token) => normalizedHaystack.includes(token));
}

function labelText(task: Task, labelsById: Record<string, Label>): string {
  return task.labelIds.map((id) => labelsById[id]?.name ?? "").join(" ");
}

export function taskMatchesFilters(
  task: Task,
  data: FlowvoraData,
  filters: TaskFilters,
  now: Date,
): boolean {
  const column = data.columnsById[task.columnId];
  const complete = isTaskComplete(task, column);

  if (!filters.includeArchived && task.archivedAt !== null) return false;
  if (filters.completedOnly && !complete) return false;
  if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
  if (filters.energies.length > 0 && (!task.energy || !filters.energies.includes(task.energy))) {
    return false;
  }
  if (
    filters.labelIds.length > 0 &&
    !filters.labelIds.every((labelId) => task.labelIds.includes(labelId))
  ) {
    return false;
  }
  if (
    filters.agingStates.length > 0 &&
    !filters.agingStates.includes(getAgingState(task, data.settings.aging, now))
  ) {
    return false;
  }
  if (filters.stuckOnly && !isTaskStuck(task, column, data.settings.aging, now)) return false;

  if (filters.deadline === "today" && !isDueToday(task, now)) return false;
  if (filters.deadline === "tomorrow" && !isDueTomorrow(task, now)) return false;
  if (filters.deadline === "overdue" && !isOverdue(task, now)) return false;
  if (filters.deadline === "none" && task.dueDate !== null) return false;

  if (
    filters.query &&
    !matchesText(
      `${task.title} ${task.description} ${task.notes} ${labelText(task, data.labelsById)}`,
      filters.query,
    )
  ) {
    return false;
  }

  return true;
}

export function filterTasks(
  tasks: readonly Task[],
  data: FlowvoraData,
  filters: TaskFilters,
  now: Date,
): Task[] {
  return tasks.filter((task) => taskMatchesFilters(task, data, filters, now));
}

export function sortTasks(tasks: readonly Task[], sort: TaskSort): Task[] {
  const sorted = [...tasks];
  sorted.sort((left, right) => {
    switch (sort) {
      case "priority":
        return PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority] || stableTaskOrder(left, right);
      case "deadline":
        if (left.dueDate === right.dueDate) return stableTaskOrder(left, right);
        if (left.dueDate === null) return 1;
        if (right.dueDate === null) return -1;
        return left.dueDate.localeCompare(right.dueDate) || stableTaskOrder(left, right);
      case "newest":
        return right.createdAt.localeCompare(left.createdAt) || stableTaskOrder(left, right);
      case "oldest":
        return left.createdAt.localeCompare(right.createdAt) || stableTaskOrder(left, right);
      case "recently-updated":
        return right.updatedAt.localeCompare(left.updatedAt) || stableTaskOrder(left, right);
      case "manual":
      default:
        return stableTaskOrder(left, right);
    }
  });
  return sorted;
}

function stableTaskOrder(left: Task, right: Task): number {
  return left.manualOrder - right.manualOrder || left.id.localeCompare(right.id);
}

export function scoreSuggestedTask(
  task: Task,
  data: FlowvoraData,
  selectedEnergy: Energy,
  now: Date,
): SuggestedTask | null {
  const column = data.columnsById[task.columnId];
  if (
    task.archivedAt !== null ||
    isTaskComplete(task, column) ||
    task.id === data.currentFocusTaskId
  ) {
    return null;
  }

  let score = 0;
  const reasons: string[] = [];
  if (task.priority === "urgent") {
    score += 4;
    reasons.push("Urgent priority");
  } else if (task.priority === "high") {
    score += 3;
    reasons.push("High priority");
  }

  if (task.dueDate !== null) {
    const dueInDays = differenceInCalendarDays(parseISO(task.dueDate), startOfDay(now));
    if (dueInDays <= 1) {
      score += 4;
      reasons.push(dueInDays < 0 ? "Overdue" : "Due within 24 hours");
    } else if (dueInDays <= 3) {
      score += 2;
      reasons.push("Due within 3 days");
    }
  }

  if (task.energy === selectedEnergy) {
    score += 2;
    reasons.push("Matches available energy");
  }

  if (getAgingState(task, data.settings.aging, now) === "stale") {
    score -= 1;
    reasons.push("Stale task");
  }

  return { task, score, reasons };
}

export function getSuggestedTasks(
  data: FlowvoraData,
  selectedEnergy: Energy,
  now: Date,
  limit = 5,
): SuggestedTask[] {
  const suggestions = Object.values(data.tasksById).flatMap((task) => {
    const suggestion = scoreSuggestedTask(task, data, selectedEnergy, now);
    return suggestion ? [suggestion] : [];
  });

  return suggestions
    .sort(
      (left, right) =>
        right.score - left.score ||
        compareNullableDate(left.task.dueDate, right.task.dueDate) ||
        PRIORITY_WEIGHT[right.task.priority] - PRIORITY_WEIGHT[left.task.priority] ||
        right.task.updatedAt.localeCompare(left.task.updatedAt) ||
        left.task.id.localeCompare(right.task.id),
    )
    .slice(0, Math.max(0, limit));
}

function compareNullableDate(left: LocalDate | null, right: LocalDate | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

export function getFlowvoraAnalytics(
  data: FlowvoraData,
  now: Date,
  boardId?: BoardId,
): FlowvoraAnalytics {
  const tasks = Object.values(data.tasksById).filter(
    (task) => task.archivedAt === null && (boardId === undefined || task.boardId === boardId),
  );
  const activeTasks = tasks.filter(
    (task) => !isTaskComplete(task, data.columnsById[task.columnId]),
  );
  const completedTasks = tasks.filter((task) => isTaskComplete(task, data.columnsById[task.columnId]));
  const byPriority: Record<Priority, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  const byEnergy: Record<Energy | "unassigned", number> = {
    low: 0,
    medium: 0,
    deep: 0,
    unassigned: 0,
  };
  const boardCounts = new Map<BoardId, number>();

  for (const task of tasks) {
    byPriority[task.priority] += 1;
    byEnergy[task.energy ?? "unassigned"] += 1;
    boardCounts.set(task.boardId, (boardCounts.get(task.boardId) ?? 0) + 1);
  }

  const recentCompletionTrend = Array.from({ length: 7 }, (_, index) => {
    const date = toLocalDateKey(subDays(now, 6 - index));
    return {
      date,
      completed: completedTasks.filter(
        (task) => task.completedAt && toLocalDateKey(parseISO(task.completedAt)) === date,
      ).length,
    };
  });

  const totalAge = activeTasks.reduce((sum, task) => sum + getTaskAgeDays(task, now), 0);
  return {
    tasksCreated: tasks.length,
    tasksCompleted: completedTasks.length,
    completionRate: tasks.length === 0 ? 0 : Math.round((completedTasks.length / tasks.length) * 100),
    overdue: activeTasks.filter((task) => isOverdue(task, now)).length,
    stuck: activeTasks.filter((task) =>
      isTaskStuck(task, data.columnsById[task.columnId], data.settings.aging, now),
    ).length,
    averageTaskAgeDays: activeTasks.length === 0 ? 0 : Math.round((totalAge / activeTasks.length) * 10) / 10,
    byPriority,
    byEnergy,
    byBoard: [...boardCounts.entries()]
      .map(([id, count]) => ({
        boardId: id,
        boardName: data.boardsById[id]?.name ?? "Deleted board",
        count,
      }))
      .sort((left, right) => right.count - left.count || left.boardName.localeCompare(right.boardName)),
    recentCompletionTrend,
  };
}

export function searchFlowvora(data: FlowvoraData, query: string, limit = 20): SearchResult[] {
  if (normalizeSearch(query).length === 0) return [];
  const results: Array<SearchResult & { rank: number }> = [];

  for (const workspace of Object.values(data.workspacesById)) {
    if (matchesText(`${workspace.name} ${workspace.icon}`, query)) {
      results.push({ kind: "workspace", id: workspace.id, title: workspace.name, subtitle: "Workspace", rank: 3 });
    }
  }
  for (const board of Object.values(data.boardsById)) {
    if (board.archivedAt === null && matchesText(`${board.name} ${board.description}`, query)) {
      results.push({
        kind: "board",
        id: board.id,
        title: board.name,
        subtitle: data.workspacesById[board.workspaceId]?.name ?? "Workspace",
        workspaceId: board.workspaceId,
        rank: 2,
      });
    }
  }
  for (const task of Object.values(data.tasksById)) {
    if (
      task.archivedAt === null &&
      matchesText(`${task.title} ${task.description} ${task.notes} ${labelText(task, data.labelsById)}`, query)
    ) {
      results.push({
        kind: "task",
        id: task.id,
        title: task.title,
        subtitle: data.boardsById[task.boardId]?.name ?? "Board",
        boardId: task.boardId,
        rank: 1,
      });
    }
  }
  for (const label of Object.values(data.labelsById)) {
    if (matchesText(label.name, query)) {
      results.push({
        kind: "label",
        id: label.id,
        title: label.name,
        subtitle: data.workspacesById[label.workspaceId]?.name ?? "Workspace",
        workspaceId: label.workspaceId,
        rank: 4,
      });
    }
  }

  return results
    .sort((left, right) => left.rank - right.rank || left.title.localeCompare(right.title))
    .slice(0, Math.max(0, limit))
    .map(({ rank: _rank, ...result }) => result);
}

function comparePositionThenCreated<T extends { position: number; createdAt: string; id: string }>(
  left: T,
  right: T,
): number {
  return left.position - right.position || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

