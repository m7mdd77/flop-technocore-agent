import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendActivity,
  readActivityLedger,
  verifyActivityLedger,
} from "../src/activity-ledger.js";

test("activity ledger is append-only and hash chained", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flop-ledger-"));
  const path = join(dir, "activity.jsonl");

  const first = await appendActivity(path, {
    kind: "faucet",
    did: "did:key:z6Mkexample",
    tx: "testnet-tx-1",
  });
  const second = await appendActivity(path, {
    kind: "inference",
    requestId: "req-1",
    flopSpent: "10",
  });

  assert.equal(second.previous, first.entryHash);
  const entries = await readActivityLedger(path);
  assert.deepEqual(verifyActivityLedger(entries), {
    valid: true,
    entries: 2,
    head: second.entryHash,
  });
});

test("activity ledger detects tampering", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flop-ledger-"));
  const path = join(dir, "activity.jsonl");
  await appendActivity(path, { kind: "inference", requestId: "req-1" });

  const entries = await readActivityLedger(path);
  entries[0].activity.requestId = "tampered";
  const check = verifyActivityLedger(entries);
  assert.equal(check.valid, false);
  assert.equal(check.reason, "ENTRY_HASH_MISMATCH");
});
