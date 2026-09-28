export const FLOWVORA_SCHEMA_VERSION = 1 as const;

export type ISODateTime = string;
export type LocalDate = string;

export type WorkspaceId = string;
export type BoardId = string;
export type ColumnId = string;
export type TaskId = string;
export type LabelId = string;
export type ChecklistItemId = string;
export type ActivityId = string;

export type ThemePreference = "light" | "dark" | "system";
export type MotionPreference = "system" | "reduce" | "allow";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Energy = "low" | "medium" | "deep";
export type BoardView = "kanban" | "canvas";
export type ColumnStage = "backlog" | "planned" | "active" | "review" | "done";
export type AgingState = "fresh" | "idle" | "stale";
export type TaskSort =
  | "manual"
  | "priority"
  | "deadline"
  | "newest"
  | "oldest"
  | "recently-updated";

export type DeadlineFilter = "any" | "today" | "tomorrow" | "overdue" | "none";

export type StartupPage =
  | "/dashboard"
  | "/workspaces"
  | "/daily-flow"
  | "/focus"
  | "/activity"
  | "/analytics";

export type StaticBackgroundPreset = "graphite" | "paper" | "mist" | "midnight";
export type MotionBackgroundEffect =
  | "balatro"
  | "liquidEther"
  | "colorBends"
  | "lightRays"
  | "pixelBlast"
  | "prism";

export type BoardBackground =
  | { type: "solid"; preset: StaticBackgroundPreset }
  | { type: "gradient"; preset: "slate" }
  | { type: "motion"; effect: MotionBackgroundEffect; preset: string };

export interface Workspace {
  id: WorkspaceId;
  name: string;
  icon: string;
  accent: string;
  favorite: boolean;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Board {
  id: BoardId;
  workspaceId: WorkspaceId;
  name: string;
  description: string;
  accent: string;
  background: BoardBackground;
  favorite: boolean;
  archivedAt: ISODateTime | null;
  view: BoardView;
  flowMode: boolean;
  position: number;
  lastOpenedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Column {
  id: ColumnId;
  boardId: BoardId;
  name: string;
  stage: ColumnStage;
  accent: string;
  collapsed: boolean;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ChecklistItem {
  id: ChecklistItemId;
  title: string;
  completed: boolean;
  position: number;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface Task {
  id: TaskId;
  boardId: BoardId;
  columnId: ColumnId;
  title: string;
  description: string;
  notes: string;
  priority: Priority;
  energy: Energy | null;
  labelIds: LabelId[];
  checklist: ChecklistItem[];
  dueDate: LocalDate | null;
  archivedAt: ISODateTime | null;
  manualOrder: number;
  canvasPosition: CanvasPosition | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  columnEnteredAt: ISODateTime;
  completedAt: ISODateTime | null;
}

export interface Label {
  id: LabelId;
  workspaceId: WorkspaceId;
  name: string;
  color: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ActivityType =
  | "workspace.created"
  | "board.created"
  | "board.archived"
  | "board.restored"
  | "task.created"
  | "task.moved"
  | "task.completed"
  | "task.archived"
  | "focus.changed"
  | "checklist.milestone"
  | "task.due-date-changed"
  | "task.priority-changed";

export type ActivityDetailValue = string | number | boolean | null;

export interface ActivityEvent {
  id: ActivityId;
  type: ActivityType;
  occurredAt: ISODateTime;
  workspaceId: WorkspaceId | null;
  boardId: BoardId | null;
  taskId: TaskId | null;
  title: string;
  detail: string | null;
  metadata: Record<string, ActivityDetailValue>;
}

export interface AgingSettings {
  /** Tasks younger than this many full days are fresh. */
  freshBeforeDays: number;
  /** Tasks older than this many full days are stale. The interval is idle. */
  staleAfterDays: number;
  stuckAfterDays: number;
}

export interface NewBoardColumn {
  name: string;
  stage: ColumnStage;
  accent: string;
}

export interface FlowvoraSettings {
  theme: ThemePreference;
  startupPage: StartupPage;
  defaultWorkspaceId: WorkspaceId | null;
  compactMode: boolean;
  motionPreference: MotionPreference;
  motionBackgrounds: boolean;
  defaultBoardView: BoardView;
  defaultFlowMode: boolean;
  newBoardColumns: NewBoardColumn[];
  focusDurationMinutes: number;
  availableEnergy: Energy;
  aging: AgingSettings;
  activityLimit: number;
}

export interface FocusTimerState {
  status: "idle" | "running" | "paused";
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: ISODateTime | null;
  endsAt: ISODateTime | null;
}

export interface FlowvoraData {
  schemaVersion: typeof FLOWVORA_SCHEMA_VERSION;
  workspacesById: Record<WorkspaceId, Workspace>;
  boardsById: Record<BoardId, Board>;
  columnsById: Record<ColumnId, Column>;
  tasksById: Record<TaskId, Task>;
  labelsById: Record<LabelId, Label>;
  activities: ActivityEvent[];
  currentWorkspaceId: WorkspaceId | null;
  currentFocusTaskId: TaskId | null;
  settings: FlowvoraSettings;
  focusTimer: FocusTimerState;
}

export interface BoardPulse {
  active: number;
  dueToday: number;
  overdue: number;
  stuck: number;
  completedToday: number;
}

export interface ChecklistProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface TaskFilters {
  priorities: Priority[];
  labelIds: LabelId[];
  energies: Energy[];
  agingStates: AgingState[];
  deadline: DeadlineFilter;
  stuckOnly: boolean;
  completedOnly: boolean;
  includeArchived: boolean;
  query: string;
}

export interface SuggestedTask {
  task: Task;
  score: number;
  reasons: string[];
}

export interface AnalyticsPoint {
  date: LocalDate;
  completed: number;
}

export interface FlowvoraAnalytics {
  tasksCreated: number;
  tasksCompleted: number;
  completionRate: number;
  overdue: number;
  stuck: number;
  averageTaskAgeDays: number;
  byPriority: Record<Priority, number>;
  byEnergy: Record<Energy | "unassigned", number>;
  byBoard: Array<{ boardId: BoardId; boardName: string; count: number }>;
  recentCompletionTrend: AnalyticsPoint[];
}

export type SearchResult =
  | { kind: "task"; id: TaskId; title: string; subtitle: string; boardId: BoardId }
  | { kind: "board"; id: BoardId; title: string; subtitle: string; workspaceId: WorkspaceId }
  | { kind: "workspace"; id: WorkspaceId; title: string; subtitle: string }
  | { kind: "label"; id: LabelId; title: string; subtitle: string; workspaceId: WorkspaceId };

export interface FlowvoraExportEnvelope {
  version: number;
  exportedAt: ISODateTime;
  data: FlowvoraData;
}

