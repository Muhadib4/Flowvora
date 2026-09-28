export type EntityPrefix = "ws" | "board" | "col" | "task" | "label" | "check" | "activity" | "undo";

let fallbackCounter = 0;

function randomPart(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  fallbackCounter += 1;
  return `${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
}

export function createId(prefix: EntityPrefix): string {
  return `${prefix}_${randomPart()}`;
}

export type IdFactory = (prefix: EntityPrefix) => string;

