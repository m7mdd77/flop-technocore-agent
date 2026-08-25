import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTaskReadiness,
  validateOfficialTechnocoreUrl,
} from "../src/task-readiness-lib.js";

const SEED = "00".repeat(32);

test("task readiness stays local until an official route is configured", () => {
  const readiness = buildTaskReadiness(SEED);
  assert.equal(readiness.status, "WAITING_FOR_OFFICIAL_TASK_ROUTE");
  assert.equal(readiness.taskUrl, null);
  assert.equal(readiness.signer.testSignatureLength, 86);
  assert.match(readiness.did, /^did:key:z6Mk/);
});

test("task readiness accepts only HTTPS technocore.chat URLs", () => {
  assert.equal(
    validateOfficialTechnocoreUrl("https://technocore.chat/tasks/example"),
    "https://technocore.chat/tasks/example",
  );
  assert.throws(
    () => validateOfficialTechnocoreUrl("http://technocore.chat/tasks/example"),
    /HTTPS on technocore\.chat/,
  );
  assert.throws(
    () => validateOfficialTechnocoreUrl("https://example.com/tasks/example"),
    /HTTPS on technocore\.chat/,
  );
  assert.throws(
    () => validateOfficialTechnocoreUrl("https://user:pass@technocore.chat/tasks/example"),
    /embedded credentials/,
  );
  assert.throws(
    () => validateOfficialTechnocoreUrl("https://technocore.chat/tasks/example#secret"),
    /fragment/,
  );
});

test("configured task URL is validated but never called", () => {
  const readiness = buildTaskReadiness(SEED, "https://technocore.chat/tasks/example");
  assert.equal(readiness.status, "OFFICIAL_TASK_URL_CONFIGURED_NOT_CALLED");
  assert.equal(readiness.taskUrl, "https://technocore.chat/tasks/example");
});
