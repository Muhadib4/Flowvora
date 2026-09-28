import { describe, expect, it } from "vitest";
import { subDays } from "date-fns";
import { createSeedData } from "../data/seed";
import { getAgingState, getBoardPulse, getChecklistProgress, getSuggestedTasks, isTaskStuck, sortTasks } from "./derived";
import type { Task } from "./types";

const now = new Date("2026-09-28T10:00:00.000Z");

describe("derived workflow state", () => {
  it("uses documented aging boundaries", () => {
    const settings = { freshBeforeDays: 3, staleAfterDays: 7, stuckAfterDays: 3 };
    expect(getAgingState({ updatedAt: subDays(now, 2).toISOString() }, settings, now)).toBe("fresh");
    expect(getAgingState({ updatedAt: subDays(now, 3).toISOString() }, settings, now)).toBe("idle");
    expect(getAgingState({ updatedAt: subDays(now, 7).toISOString() }, settings, now)).toBe("idle");
    expect(getAgingState({ updatedAt: subDays(now, 8).toISOString() }, settings, now)).toBe("stale");
  });

  it("detects stuck tasks only in active stages", () => {
    const data = createSeedData(now);
    const task = Object.values(data.tasksById).find((entry) => entry.title === "Connect task filters") as Task;
    const column = data.columnsById[task.columnId];
    expect(isTaskStuck(task, column, data.settings.aging, now)).toBe(true);
    expect(isTaskStuck({ ...task, completedAt: now.toISOString() }, column, data.settings.aging, now)).toBe(false);
    expect(isTaskStuck(task, { ...column, stage: "planned" }, data.settings.aging, now)).toBe(false);
  });

  it("calculates checklist progress including an empty checklist", () => {
    expect(getChecklistProgress([])).toEqual({ completed: 0, total: 0, percent: 0 });
    expect(getChecklistProgress([
      { id: "a", title: "A", completed: true, position: 0, createdAt: now.toISOString(), completedAt: now.toISOString() },
      { id: "b", title: "B", completed: false, position: 1, createdAt: now.toISOString(), completedAt: null },
    ])).toEqual({ completed: 1, total: 2, percent: 50 });
  });

  it("derives Board Pulse from live task state", () => {
    const data = createSeedData(now);
    const boardId = Object.keys(data.boardsById)[0];
    const pulse = getBoardPulse(data, boardId, now);
    expect(pulse.active).toBe(6);
    expect(pulse.dueToday).toBe(2);
    expect(pulse.overdue).toBe(1);
    expect(pulse.stuck).toBeGreaterThanOrEqual(1);
    expect(pulse.completedToday).toBe(1);
  });

  it("scores suggested work deterministically and preserves manual order", () => {
    const data = createSeedData(now);
    const suggestions = getSuggestedTasks(data, "deep", now);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].reasons.length).toBeGreaterThan(0);
    const tasks = Object.values(data.tasksById);
    const orders = tasks.map((task) => task.manualOrder);
    sortTasks(tasks, "priority");
    expect(tasks.map((task) => task.manualOrder)).toEqual(orders);
  });
});
