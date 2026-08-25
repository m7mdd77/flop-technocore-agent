import { createHash } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

export async function readActivityLedger(path) {
  try {
    const raw = await readFile(path, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function appendActivity(path, activity) {
  const existing = await readActivityLedger(path);
  const previous = existing.length ? existing.at(-1).entryHash : null;
  const entry = {
    version: 1,
    recordedAt: new Date().toISOString(),
    previous,
    activity,
  };
  entry.entryHash = digest(entry);
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

export function verifyActivityLedger(entries) {
  let previous = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.previous !== previous) {
      return { valid: false, index, reason: "PREVIOUS_HASH_MISMATCH" };
    }
    const { entryHash, ...unsigned } = entry;
    if (digest(unsigned) !== entryHash) {
      return { valid: false, index, reason: "ENTRY_HASH_MISMATCH" };
    }
    previous = entryHash;
  }
  return { valid: true, entries: entries.length, head: previous };
}
