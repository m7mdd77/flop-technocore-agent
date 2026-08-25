#!/usr/bin/env node
import { buildTaskReadiness } from "./task-readiness-lib.js";

function die(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const seed = process.env.SIGN_SEED;
if (!seed) die("SIGN_SEED is required. Keep it local; never paste it into a task or faucet form.");

const configured = process.env.FLOP_TASK_URL?.trim() || null;
try {
  console.log(JSON.stringify(buildTaskReadiness(seed, configured), null, 2));
} catch (error) {
  die(error.message);
}
