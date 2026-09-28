import type { FlowvoraData } from "@/domain/types";
import { validateFlowvoraData } from "./schema";

export const FLOWVORA_STORAGE_KEY = "flowvora:state";

interface StoredEnvelope { schemaVersion: number; savedAt: string; data: FlowvoraData }

export type LoadResult =
  | { status: "empty" }
  | { status: "loaded"; data: FlowvoraData }
  | { status: "corrupt"; message: string }
  | { status: "unavailable"; message: string };

export function loadStoredData(storage: Storage): LoadResult {
  try {
    const raw = storage.getItem(FLOWVORA_STORAGE_KEY);
    if (!raw) return { status: "empty" };
    const envelope = JSON.parse(raw) as unknown;
    if (!envelope || typeof envelope !== "object" || !("data" in envelope)) return { status: "corrupt", message: "The saved data envelope is invalid." };
    const result = validateFlowvoraData((envelope as { data: unknown }).data);
    return result.success ? { status: "loaded", data: result.data } : { status: "corrupt", message: result.issues.join("; ") };
  } catch (error) {
    return { status: "unavailable", message: error instanceof Error ? error.message : "Storage could not be read." };
  }
}

export function saveStoredData(storage: Storage, data: FlowvoraData): void {
  const envelope: StoredEnvelope = { schemaVersion: data.schemaVersion, savedAt: new Date().toISOString(), data };
  storage.setItem(FLOWVORA_STORAGE_KEY, JSON.stringify(envelope));
}

export function removeStoredData(storage: Storage): void {
  storage.removeItem(FLOWVORA_STORAGE_KEY);
}
