import { addDays, format } from "date-fns";

import { createId, type IdFactory } from "../domain/ids";
import type {
  Board,
  BoardBackground,
  Column,
  ColumnStage,
  Energy,
  Label,
  Priority,
  Task,
  WorkspaceId,
} from "../domain/types";

export type BoardTemplateId =
  | "software-development"
  | "study-planner"
  | "personal-tasks"
  | "freelance-project"
  | "content-production"
  | "bug-tracking"
  | "product-roadmap";

export interface TemplateTask {
  title: string;
  description: string;
  priority: Priority;
  energy: Energy | null;
  labels?: string[];
  checklist?: string[];
  dueInDays?: number;
}

export interface TemplateColumn {
  name: string;
  stage: ColumnStage;
  accent: string;
  tasks?: TemplateTask[];
}

export interface BoardTemplate {
  id: BoardTemplateId;
  name: string;
  description: string;
  accent: string;
  background: BoardBackground;
  columns: TemplateColumn[];
}

const BASE_COLUMNS = {
  backlog: { name: "Ideas", stage: "backlog", accent: "#697586" },
  planned: { name: "Planned", stage: "planned", accent: "#7B8CFF" },
  active: { name: "In Progress", stage: "active", accent: "#65C9A8" },
  review: { name: "Review", stage: "review", accent: "#D9A441" },
  done: { name: "Done", stage: "done", accent: "#68B984" },
} satisfies Record<ColumnStage, Omit<TemplateColumn, "tasks">>;

export const BOARD_TEMPLATES: readonly BoardTemplate[] = [
  {
    id: "software-development",
    name: "Software Development",
    description: "Move scoped engineering work from backlog to a verified release.",
    accent: "#7B8CFF",
    background: { type: "solid", preset: "graphite" },
    columns: [
      {
        ...BASE_COLUMNS.backlog,
        name: "Backlog",
        tasks: [
          {
            title: "Audit keyboard navigation",
            description: "List unreachable controls before the next polish pass.",
            priority: "medium",
            energy: "medium",
            labels: ["Frontend", "Accessibility"],
          },
        ],
      },
      { ...BASE_COLUMNS.planned, name: "Ready" },
      {
        ...BASE_COLUMNS.active,
        name: "Building",
        tasks: [
          {
            title: "Implement account settings",
            description: "Add profile preferences and validation states.",
            priority: "high",
            energy: "deep",
            labels: ["Frontend"],
            checklist: ["Build form", "Add validation", "Test error states"],
            dueInDays: 2,
          },
        ],
      },
      { ...BASE_COLUMNS.review, name: "Code Review" },
      { ...BASE_COLUMNS.done, name: "Shipped" },
    ],
  },
  {
    id: "study-planner",
    name: "Study Planner",
    description: "Plan coursework, focused study blocks, and review sessions.",
    accent: "#8B7FD7",
    background: { type: "gradient", preset: "slate" },
    columns: [
      {
        ...BASE_COLUMNS.backlog,
        name: "Modules",
        tasks: [
          {
            title: "Read database normalization notes",
            description: "Cover first through third normal form.",
            priority: "medium",
            energy: "medium",
            labels: ["Reading"],
          },
        ],
      },
      { ...BASE_COLUMNS.planned, name: "This Week" },
      {
        ...BASE_COLUMNS.active,
        name: "Studying",
        tasks: [
          {
            title: "Practice graph algorithms",
            description: "Solve one BFS and one shortest-path problem.",
            priority: "high",
            energy: "deep",
            labels: ["Practice"],
            dueInDays: 1,
          },
        ],
      },
      { ...BASE_COLUMNS.review, name: "Review" },
      { ...BASE_COLUMNS.done, name: "Complete" },
    ],
  },
  {
    id: "personal-tasks",
    name: "Personal Tasks",
    description: "A calm home for errands, routines, and personal projects.",
    accent: "#65C9A8",
    background: { type: "solid", preset: "mist" },
    columns: [
      {
        ...BASE_COLUMNS.backlog,
        name: "Someday",
        tasks: [
          {
            title: "Organize photo archive",
            description: "Sort the latest folders and remove duplicates.",
            priority: "low",
            energy: "low",
            labels: ["Home"],
          },
        ],
      },
      {
        ...BASE_COLUMNS.planned,
        name: "This Week",
        tasks: [
          {
            title: "Book dentist appointment",
            description: "Confirm an afternoon slot.",
            priority: "medium",
            energy: "low",
            labels: ["Errand"],
            dueInDays: 2,
          },
        ],
      },
      { ...BASE_COLUMNS.active, name: "Doing" },
      { ...BASE_COLUMNS.done, name: "Done" },
    ],
  },
  {
    id: "freelance-project",
    name: "Freelance Project",
    description: "Track client work from discovery through delivery and sign-off.",
    accent: "#D9A441",
    background: { type: "solid", preset: "midnight" },
    columns: [
      {
        ...BASE_COLUMNS.backlog,
        name: "Requests",
        tasks: [
          {
            title: "Confirm analytics access",
            description: "Ask the client for read-only access before discovery.",
            priority: "medium",
            energy: "low",
            labels: ["Client"],
          },
        ],
      },
      { ...BASE_COLUMNS.planned, name: "Scoped" },
      {
        ...BASE_COLUMNS.active,
        name: "In Production",
        tasks: [
          {
            title: "Build responsive landing page",
            description: "Implement the approved desktop and mobile layouts.",
            priority: "high",
            energy: "deep",
            labels: ["Delivery"],
            dueInDays: 3,
          },
        ],
      },
      { ...BASE_COLUMNS.review, name: "Client Review" },
      { ...BASE_COLUMNS.done, name: "Approved" },
    ],
  },
  {
    id: "content-production",
    name: "Content Production",
    description: "Shape ideas into drafted, reviewed, and published work.",
    accent: "#C784A6",
    background: { type: "gradient", preset: "slate" },
    columns: [
      {
        ...BASE_COLUMNS.backlog,
        name: "Ideas",
        tasks: [
          {
            title: "Developer workflow article",
            description: "Outline practical ways to reduce context switching.",
            priority: "medium",
            energy: "medium",
            labels: ["Article"],
          },
        ],
      },
      { ...BASE_COLUMNS.planned, name: "Briefed" },
      {
        ...BASE_COLUMNS.active,
        name: "Drafting",
        tasks: [
          {
            title: "Write September product update",
            description: "Summarize the shipped improvements with screenshots.",
            priority: "high",
            energy: "deep",
            labels: ["Newsletter"],
            checklist: ["Draft copy", "Choose screenshots", "Proofread"],
            dueInDays: 2,
          },
        ],
      },
      { ...BASE_COLUMNS.review, name: "Editing" },
      { ...BASE_COLUMNS.done, name: "Published" },
    ],
  },
  {
    id: "bug-tracking",
    name: "Bug Tracking",
    description: "Triage defects, verify fixes, and keep regressions visible.",
    accent: "#D46C6C",
    background: { type: "solid", preset: "graphite" },
    columns: [
      {
        ...BASE_COLUMNS.backlog,
        name: "Reported",
        tasks: [
          {
            title: "Mobile menu clips long board names",
            description: "Reproduces at 375 px with three-line titles.",
            priority: "high",
            energy: "medium",
            labels: ["Bug", "Mobile"],
          },
        ],
      },
      { ...BASE_COLUMNS.planned, name: "Triaged" },
      {
        ...BASE_COLUMNS.active,
        name: "Fixing",
        tasks: [
          {
            title: "Due date badge ignores local timezone",
            description: "Date shifts backward for positive UTC offsets.",
            priority: "urgent",
            energy: "deep",
            labels: ["Bug", "Dates"],
            dueInDays: 1,
          },
        ],
      },
      { ...BASE_COLUMNS.review, name: "Verification" },
      { ...BASE_COLUMNS.done, name: "Resolved" },
    ],
  },
  {
    id: "product-roadmap",
    name: "Product Roadmap",
    description: "Connect product opportunities to discovery, delivery, and release.",
    accent: "#5E9BC6",
    background: { type: "solid", preset: "midnight" },
    columns: [
      {
        ...BASE_COLUMNS.backlog,
        name: "Opportunities",
        tasks: [
          {
            title: "Saved board filter presets",
            description: "Validate whether recurring views reduce setup time.",
            priority: "medium",
            energy: "medium",
            labels: ["Discovery"],
          },
        ],
      },
      { ...BASE_COLUMNS.planned, name: "Validated" },
      {
        ...BASE_COLUMNS.active,
        name: "In Delivery",
        tasks: [
          {
            title: "Improve Daily Flow prioritization",
            description: "Expose score reasons and energy matching.",
            priority: "high",
            energy: "deep",
            labels: ["Product"],
            dueInDays: 3,
          },
        ],
      },
      { ...BASE_COLUMNS.review, name: "Release Check" },
      { ...BASE_COLUMNS.done, name: "Released" },
    ],
  },
] as const;

export interface MaterializedBoardTemplate {
  board: Board;
  columns: Column[];
  tasks: Task[];
  newLabels: Label[];
}

export interface MaterializeTemplateOptions {
  workspaceId: WorkspaceId;
  templateId: BoardTemplateId;
  now?: Date;
  idFactory?: IdFactory;
  boardName?: string;
  boardPosition?: number;
  existingLabels?: readonly Label[];
}

const LABEL_COLORS = ["#6F83C8", "#5F9F87", "#B38A4A", "#A46E8C", "#7A8291", "#B46767"];

export function getBoardTemplate(templateId: BoardTemplateId): BoardTemplate {
  const template = BOARD_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error(`Unknown board template: ${templateId}`);
  return template;
}

export function materializeBoardTemplate(options: MaterializeTemplateOptions): MaterializedBoardTemplate {
  const template = getBoardTemplate(options.templateId);
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const idFactory = options.idFactory ?? createId;
  const boardId = idFactory("board");
  const knownLabels = new Map<string, Label>();
  for (const label of options.existingLabels ?? []) {
    if (label.workspaceId === options.workspaceId) knownLabels.set(label.name.toLocaleLowerCase(), label);
  }
  const newLabels: Label[] = [];

  const ensureLabel = (name: string): Label => {
    const key = name.toLocaleLowerCase();
    const existing = knownLabels.get(key);
    if (existing) return existing;
    const label: Label = {
      id: idFactory("label"),
      workspaceId: options.workspaceId,
      name,
      color: LABEL_COLORS[knownLabels.size % LABEL_COLORS.length],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    knownLabels.set(key, label);
    newLabels.push(label);
    return label;
  };

  const board: Board = {
    id: boardId,
    workspaceId: options.workspaceId,
    name: options.boardName?.trim() || template.name,
    description: template.description,
    accent: template.accent,
    background: template.background,
    favorite: false,
    archivedAt: null,
    view: "kanban",
    flowMode: true,
    position: options.boardPosition ?? 0,
    lastOpenedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const columns: Column[] = [];
  const tasks: Task[] = [];
  template.columns.forEach((templateColumn, columnIndex) => {
    const columnId = idFactory("col");
    columns.push({
      id: columnId,
      boardId,
      name: templateColumn.name,
      stage: templateColumn.stage,
      accent: templateColumn.accent,
      collapsed: false,
      position: columnIndex,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    for (const [taskIndex, templateTask] of (templateColumn.tasks ?? []).entries()) {
      const checklist = (templateTask.checklist ?? []).map((title, checklistIndex) => ({
        id: idFactory("check"),
        title,
        completed: false,
        position: checklistIndex,
        createdAt: timestamp,
        completedAt: null,
      }));
      tasks.push({
        id: idFactory("task"),
        boardId,
        columnId,
        title: templateTask.title,
        description: templateTask.description,
        notes: "",
        priority: templateTask.priority,
        energy: templateTask.energy,
        labelIds: (templateTask.labels ?? []).map((name) => ensureLabel(name).id),
        checklist,
        dueDate:
          templateTask.dueInDays === undefined
            ? null
            : format(addDays(now, templateTask.dueInDays), "yyyy-MM-dd"),
        archivedAt: null,
        manualOrder: taskIndex,
        canvasPosition: { x: columnIndex * 280 + 24, y: taskIndex * 180 + 24 },
        createdAt: timestamp,
        updatedAt: timestamp,
        columnEnteredAt: timestamp,
        completedAt: templateColumn.stage === "done" ? timestamp : null,
      });
    }
  });

  return { board, columns, tasks, newLabels };
}

