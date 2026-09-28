import { describe, expect, it } from "vitest";
import { createSeedData } from "../data/seed";
import { parseImport, serializeExport } from "./import-export";

describe("Flowvora import and export", () => {
  it("round-trips a valid backup", () => {
    const data = createSeedData(new Date("2026-09-28T10:00:00.000Z"));
    const result = parseImport(serializeExport(data));
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data.tasksById)).toHaveLength(Object.keys(data.tasksById).length);
  });

  it("rejects malformed JSON without returning replacement data", () => {
    expect(parseImport("{not valid")).toEqual({ success: false, message: "This file is not valid JSON." });
  });

  it("rejects dangling relations", () => {
    const data = createSeedData(new Date("2026-09-28T10:00:00.000Z"));
    const task = Object.values(data.tasksById)[0];
    task.columnId = "missing-column";
    const result = parseImport(serializeExport(data));
    expect(result.success).toBe(false);
  });
});
