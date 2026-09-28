import type { FlowvoraSettings, TaskFilters } from "./types";

export const DEFAULT_COLUMN_TEMPLATE: FlowvoraSettings["newBoardColumns"] = [
  { name: "Ideas", stage: "backlog", accent: "#697586" },
  { name: "Planned", stage: "planned", accent: "#7B8CFF" },
  { name: "In Progress", stage: "active", accent: "#65C9A8" },
  { name: "Review", stage: "review", accent: "#D9A441" },
  { name: "Done", stage: "done", accent: "#68B984" },
];

export const DEFAULT_SETTINGS: FlowvoraSettings = {
  theme: "system",
  startupPage: "/dashboard",
  defaultWorkspaceId: null,
  compactMode: false,
  motionPreference: "system",
  motionBackgrounds: true,
  defaultBoardView: "kanban",
  defaultFlowMode: true,
  newBoardColumns: DEFAULT_COLUMN_TEMPLATE,
  focusDurationMinutes: 25,
  availableEnergy: "medium",
  aging: {
    freshBeforeDays: 3,
    staleAfterDays: 7,
    stuckAfterDays: 3,
  },
  activityLimit: 750,
};

export const EMPTY_TASK_FILTERS: TaskFilters = {
  priorities: [],
  labelIds: [],
  energies: [],
  agingStates: [],
  deadline: "any",
  stuckOnly: false,
  completedOnly: false,
  includeArchived: false,
  query: "",
};

export const PRIORITY_WEIGHT = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
} as const;

