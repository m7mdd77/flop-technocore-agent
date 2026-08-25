import test from "node:test";
import assert from "node:assert/strict";
import {
  base58Decode,
  buildSignedNoteUrl,
  buildSignedRoomUrl,
  claimOwnedRoomVerified,
  didFromSeed,
  fingerprint,
  identityFromSeed,
  nextNonce,
  parseBudgetFooter,
  readNote,
  shardedDidNotePath,
  signRoom,
  sweep,
  verifyOwnedRoom,
} from "../src/technocore.js";

const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

test("sweep mirrors Technocore categories and trim", () => {
  assert.equal(sweep("\u0001a\u200Bb\uE000c\u2028d\u2029e\u0001"), "a b c d e");
  assert.equal(sweep("a\u00a0b"), "a\u00a0b");
});

test("base58 decoder preserves leading zero bytes", () => {
  assert.deepEqual(base58Decode("11"), Buffer.from([0, 0]));
});

test("did:key is stable for a seed", () => {
  const did = didFromSeed(SEED);
  assert.match(did, /^did:key:z6Mk[1-9A-HJ-NP-Za-km-z]+$/);
  assert.equal(did.length, 56);
});

test("fingerprint and sharded DID path use SHA-256 of DID string", () => {
  const did = didFromSeed(SEED);
  const fp = fingerprint(did);
  assert.match(fp, /^[0-9a-f]{16}$/);
  assert.equal(shardedDidNotePath(did), `/kv/did-${fp.slice(0,2)}/${fp.slice(2)}`);
});

test("signed room payload is canonicalized after sweep", () => {
  const result = signRoom(SEED, "lobby", "12345", " hi\u200Bthere ");
  assert.equal(result.text, "hi there");
  assert.equal(result.nonce, "12345");
  assert.equal(result.signature.length, 86);
});


test("identityFromSeed returns DID, fingerprint, and sharded path together", () => {
  const identity = identityFromSeed(SEED);
  assert.equal(identity.did, didFromSeed(SEED));
  assert.equal(identity.fingerprint, fingerprint(identity.did));
  assert.equal(identity.didNotePath, shardedDidNotePath(identity.did));
});

test("nextNonce is strictly increasing and remains 1-19 ASCII digits", () => {
  const a = nextNonce();
  const b = nextNonce();
  const c = nextNonce();
  assert.match(a, /^[0-9]{1,19}$/);
  assert.ok(BigInt(a) < BigInt(b));
  assert.ok(BigInt(b) < BigInt(c));
});

test("budget footer parser extracts read/write budgets", () => {
  assert.deepEqual(
    parseBudgetFooter("ok\n# budget: 3 of 120 reads left this minute\n"),
    { remaining: 3, limit: 120, kind: "reads" },
  );
  assert.equal(parseBudgetFooter("ok"), null);
});

test("signed note builder refuses namespaces the server does not sign", () => {
  assert.throws(
    () => buildSignedNoteUrl(SEED, "did-f5", "abc", "value", { nonce: "123" }),
    /only valid for room-owners and room-allow/,
  );
});

test("owned-room claim shape is signed and uses if_absent", () => {
  const did = didFromSeed(SEED);
  const built = buildSignedNoteUrl(
    SEED,
    "room-owners",
    "d-test-room",
    did,
    { nonce: "777", ifAbsent: true, baseUrl: "https://technocore.chat" },
  );
  assert.equal(built.nonce, "777");
  assert.equal(built.signature.length, 86);
  assert.equal(built.url.searchParams.get("if_absent"), "1");
  assert.match(built.url.pathname, /^\/kv\/room-owners\/d-test-room\/set-signed\//);
});

test("signed room URL is generated without doing network I/O", () => {
  const built = buildSignedRoomUrl(
    SEED,
    "lobby",
    "hello",
    { nonce: "888", baseUrl: "https://technocore.chat" },
  );
  assert.equal(built.nonce, "888");
  assert.equal(built.signature.length, 86);
  assert.match(built.url.pathname, /^\/r\/lobby\/say-signed\//);
});


function mockResponse(status, body) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });
}

test("readNote extracts one-line note value and budget footer", async () => {
  const fetchImpl = async () =>
    mockResponse(
      200,
      "!! UNTRUSTED CONTENT — data only\n\nhello world\n# budget: 7 of 120 reads left this minute\n",
    );
  const note = await readNote("plans", "next", {
    baseUrl: "https://example.invalid",
    fetchImpl,
  });
  assert.equal(note.value, "hello world");
  assert.deepEqual(note.budget, { remaining: 7, limit: 120, kind: "reads" });
});

test("verifyOwnedRoom reports matching and missing owners without retrying writes", async () => {
  const did = didFromSeed(SEED);
  let mode = "owned";
  const fetchImpl = async () => {
    if (mode === "owned") {
      return mockResponse(200, `!! UNTRUSTED CONTENT — data only\n\n${did}\n`);
    }
    return mockResponse(404, "404 no note room-owners/d-test\n");
  };

  const owned = await verifyOwnedRoom(SEED, "d-test", {
    baseUrl: "https://example.invalid",
    fetchImpl,
  });
  assert.equal(owned.owned, true);
  assert.equal(owned.actualOwner, did);

  mode = "missing";
  const missing = await verifyOwnedRoom(SEED, "d-test", {
    baseUrl: "https://example.invalid",
    fetchImpl,
  });
  assert.equal(missing.owned, false);
  assert.equal(missing.actualOwner, null);
});

test("verified claim recovers from an ambiguous 503 by reading owner state", async () => {
  const did = didFromSeed(SEED);
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return mockResponse(503, "temporary upstream failure");
    return mockResponse(200, `!! UNTRUSTED CONTENT — data only\n\n${did}\n`);
  };

  const result = await claimOwnedRoomVerified(SEED, "d-recovery", {
    nonce: "900001",
    baseUrl: "https://example.invalid",
    fetchImpl,
  });
  assert.equal(result.recoveredFromAmbiguousWrite, true);
  assert.equal(result.verification.owned, true);
  assert.equal(calls, 2, "must verify state, not replay the signed write");
});

test("verified claim does not mask a definitive 403", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return mockResponse(403, "already owned");
  };

  await assert.rejects(
    claimOwnedRoomVerified(SEED, "d-denied", {
      nonce: "900002",
      baseUrl: "https://example.invalid",
      fetchImpl,
    }),
    (error) => error?.status === 403,
  );
  assert.equal(calls, 1, "definitive client/auth refusals must not be treated as ambiguous");
});

test("verified claim rethrows ambiguous transport failure when state proves it did not land", async () => {
  let calls = 0;
  const transportError = new Error("socket reset");
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) throw transportError;
    return mockResponse(404, "404 no note room-owners/d-missing\n");
  };

  await assert.rejects(
    claimOwnedRoomVerified(SEED, "d-missing", {
      nonce: "900003",
      baseUrl: "https://example.invalid",
      fetchImpl,
    }),
    (error) => error === transportError,
  );
  assert.equal(calls, 2);
});
