import type { FlowvoraData, FlowvoraExportEnvelope } from "@/domain/types";
import { validateFlowvoraData } from "./schema";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function createExportEnvelope(data: FlowvoraData, now = new Date()): FlowvoraExportEnvelope {
  return { version: data.schemaVersion, exportedAt: now.toISOString(), data };
}

export function serializeExport(data: FlowvoraData): string {
  return JSON.stringify(createExportEnvelope(data), null, 2);
}

export type ImportResult = { success: true; data: FlowvoraData } | { success: false; message: string };

export function parseImport(text: string): ImportResult {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) return { success: false, message: "Backup is larger than 5 MB." };
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { success: false, message: "This file is not valid JSON." }; }
  if (!value || typeof value !== "object") return { success: false, message: "Backup structure is invalid." };
  const envelope = value as { version?: unknown; data?: unknown };
  if (envelope.version !== 1) return { success: false, message: "This backup version is not supported." };
  const result = validateFlowvoraData(envelope.data);
  return result.success ? result : { success: false, message: `Backup validation failed: ${result.issues.join("; ")}` };
}

export function downloadExport(data: FlowvoraData): void {
  const blob = new Blob([serializeExport(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `flowvora-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
