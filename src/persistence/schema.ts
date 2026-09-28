import { z } from "zod";

import { FLOWVORA_SCHEMA_VERSION, type FlowvoraData } from "@/domain/types";

const isoDateTime = z.string().datetime({ offset: true });
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableIso = isoDateTime.nullable();

const backgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), preset: z.enum(["graphite", "paper", "mist", "midnight"]) }).strict(),
  z.object({ type: z.literal("gradient"), preset: z.literal("slate") }).strict(),
  z.object({
    type: z.literal("motion"),
    effect: z.enum(["balatro", "liquidEther", "colorBends", "lightRays", "pixelBlast", "prism"]),
    preset: z.string().min(1).max(80),
  }).strict(),
]);

const workspaceSchema = z.object({
  id: z.string().min(1), name: z.string().min(1).max(100), icon: z.string().max(50), accent: z.string().min(1).max(40),
  favorite: z.boolean(), position: z.number().finite(), createdAt: isoDateTime, updatedAt: isoDateTime,
}).strict();

const boardSchema = z.object({
  id: z.string().min(1), workspaceId: z.string().min(1), name: z.string().min(1).max(140), description: z.string().max(4000),
  accent: z.string().min(1).max(40), background: backgroundSchema, favorite: z.boolean(), archivedAt: nullableIso,
  view: z.enum(["kanban", "canvas"]), flowMode: z.boolean(), position: z.number().finite(), lastOpenedAt: nullableIso,
  createdAt: isoDateTime, updatedAt: isoDateTime,
}).strict();

const columnSchema = z.object({
  id: z.string().min(1), boardId: z.string().min(1), name: z.string().min(1).max(100),
  stage: z.enum(["backlog", "planned", "active", "review", "done"]), accent: z.string().min(1).max(40),
  collapsed: z.boolean(), position: z.number().finite(), createdAt: isoDateTime, updatedAt: isoDateTime,
}).strict();

const checklistSchema = z.object({
  id: z.string().min(1), title: z.string().min(1).max(300), completed: z.boolean(), position: z.number().finite(),
  createdAt: isoDateTime, completedAt: nullableIso,
}).strict();

const taskSchema = z.object({
  id: z.string().min(1), boardId: z.string().min(1), columnId: z.string().min(1), title: z.string().min(1).max(300),
  description: z.string().max(10000), notes: z.string().max(20000), priority: z.enum(["low", "medium", "high", "urgent"]),
  energy: z.enum(["low", "medium", "deep"]).nullable(), labelIds: z.array(z.string()), checklist: z.array(checklistSchema),
  dueDate: localDate.nullable(), archivedAt: nullableIso, manualOrder: z.number().finite(),
  canvasPosition: z.object({ x: z.number().finite(), y: z.number().finite() }).strict().nullable(),
  createdAt: isoDateTime, updatedAt: isoDateTime, columnEnteredAt: isoDateTime, completedAt: nullableIso,
}).strict();

const labelSchema = z.object({
  id: z.string().min(1), workspaceId: z.string().min(1), name: z.string().min(1).max(80), color: z.string().min(1).max(40),
  createdAt: isoDateTime, updatedAt: isoDateTime,
}).strict();

const activitySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["workspace.created", "board.created", "board.archived", "board.restored", "task.created", "task.moved", "task.completed", "task.archived", "focus.changed", "checklist.milestone", "task.due-date-changed", "task.priority-changed"]),
  occurredAt: isoDateTime, workspaceId: z.string().nullable(), boardId: z.string().nullable(), taskId: z.string().nullable(),
  title: z.string().min(1).max(500), detail: z.string().max(1000).nullable(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
}).strict();

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  startupPage: z.enum(["/dashboard", "/workspaces", "/daily-flow", "/focus", "/activity", "/analytics"]),
  defaultWorkspaceId: z.string().nullable(), compactMode: z.boolean(), motionPreference: z.enum(["system", "reduce", "allow"]),
  motionBackgrounds: z.boolean(), defaultBoardView: z.enum(["kanban", "canvas"]), defaultFlowMode: z.boolean(),
  newBoardColumns: z.array(z.object({ name: z.string().min(1), stage: z.enum(["backlog", "planned", "active", "review", "done"]), accent: z.string().min(1) }).strict()).min(1).max(20),
  focusDurationMinutes: z.number().int().min(1).max(240), availableEnergy: z.enum(["low", "medium", "deep"]),
  aging: z.object({ freshBeforeDays: z.number().int().min(1).max(90), staleAfterDays: z.number().int().min(1).max(365), stuckAfterDays: z.number().int().min(1).max(365) }).strict(),
  activityLimit: z.number().int().min(50).max(5000),
}).strict();

const focusTimerSchema = z.object({
  status: z.enum(["idle", "running", "paused"]), durationSeconds: z.number().int().min(60).max(86400),
  remainingSeconds: z.number().int().min(0).max(86400), startedAt: nullableIso, endsAt: nullableIso,
}).strict();

export const FlowvoraDataSchema = z.object({
  schemaVersion: z.literal(FLOWVORA_SCHEMA_VERSION),
  workspacesById: z.record(z.string(), workspaceSchema), boardsById: z.record(z.string(), boardSchema),
  columnsById: z.record(z.string(), columnSchema), tasksById: z.record(z.string(), taskSchema), labelsById: z.record(z.string(), labelSchema),
  activities: z.array(activitySchema).max(5000), currentWorkspaceId: z.string().nullable(), currentFocusTaskId: z.string().nullable(),
  settings: settingsSchema, focusTimer: focusTimerSchema,
}).strict();

export type ValidationResult = { success: true; data: FlowvoraData } | { success: false; issues: string[] };

export function validateFlowvoraData(value: unknown): ValidationResult {
  const parsed = FlowvoraDataSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false, issues: parsed.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".") || "data"}: ${issue.message}`) };
  }

  const data = parsed.data as FlowvoraData;
  const issues: string[] = [];
  for (const [id, workspace] of Object.entries(data.workspacesById)) if (id !== workspace.id) issues.push(`Workspace key mismatch: ${id}`);
  for (const [id, board] of Object.entries(data.boardsById)) {
    if (id !== board.id) issues.push(`Board key mismatch: ${id}`);
    if (!data.workspacesById[board.workspaceId]) issues.push(`Board ${id} references a missing workspace`);
  }
  for (const [id, column] of Object.entries(data.columnsById)) {
    if (id !== column.id) issues.push(`Column key mismatch: ${id}`);
    if (!data.boardsById[column.boardId]) issues.push(`Column ${id} references a missing board`);
  }
  for (const [id, task] of Object.entries(data.tasksById)) {
    const column = data.columnsById[task.columnId];
    if (id !== task.id) issues.push(`Task key mismatch: ${id}`);
    if (!data.boardsById[task.boardId]) issues.push(`Task ${id} references a missing board`);
    if (!column || column.boardId !== task.boardId) issues.push(`Task ${id} references an invalid column`);
    for (const labelId of task.labelIds) if (!data.labelsById[labelId]) issues.push(`Task ${id} references a missing label`);
  }
  for (const [id, label] of Object.entries(data.labelsById)) {
    if (id !== label.id) issues.push(`Label key mismatch: ${id}`);
    if (!data.workspacesById[label.workspaceId]) issues.push(`Label ${id} references a missing workspace`);
  }
  if (data.currentWorkspaceId && !data.workspacesById[data.currentWorkspaceId]) issues.push("Current workspace is missing");
  if (data.currentFocusTaskId && (!data.tasksById[data.currentFocusTaskId] || data.tasksById[data.currentFocusTaskId].archivedAt)) issues.push("Current focus task is missing or archived");
  if (data.settings.defaultWorkspaceId && !data.workspacesById[data.settings.defaultWorkspaceId]) issues.push("Default workspace is missing");
  if (data.settings.aging.staleAfterDays < data.settings.aging.freshBeforeDays) issues.push("Stale threshold must not be before fresh threshold");
  return issues.length > 0 ? { success: false, issues: issues.slice(0, 20) } : { success: true, data };
}
