#!/usr/bin/env node
import {
  base58Decode,
  didFromSeed,
  fingerprint,
  identityFromSeed,
  shardedDidNotePath,
  signNote,
  signRoom,
  sweep,
} from "./technocore.js";

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK   ${message}`);
}

const seed = process.env.SIGN_SEED;
if (!seed) {
  console.error("Set SIGN_SEED to a 64-hex Ed25519 seed.");
  process.exit(2);
}

const identity = identityFromSeed(seed);
const did = identity.did;
const fp = identity.fingerprint;

console.log(`DID         ${did}`);
console.log(`fingerprint ${fp}`);
console.log(`DID note    ${identity.didNotePath}`);

// did:key wire shape
try {
  const raw = base58Decode(did.slice("did:key:z".length));
  if (raw.length !== 34) fail(`did:key payload length ${raw.length}, expected 34`);
  else if (raw[0] !== 0xed || raw[1] !== 0x01) fail("did:key multicodec is not ed25519-pub 0xed01");
  else ok("did:key multicodec and payload length");
} catch (error) {
  fail(`did:key decode: ${error.message}`);
}

// Sweep contract
const sweepCases = [
  ["Cc", "a\u0001b", "a b"],
  ["Cf", "a\u200Bb", "a b"],
  ["Co", "a\uE000b", "a b"],
  ["Zl", "a\u2028b", "a b"],
  ["Zp", "a\u2029b", "a b"],
  ["Zs-not-swept", "a\u00A0b", "a\u00A0b"],
  ["trim", "\u0001 hello \u0001", "hello"],
];

for (const [name, input, expected] of sweepCases) {
  const actual = sweep(input);
  if (actual !== expected) fail(`sweep ${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  else ok(`sweep ${name}`);
}

// Signature contract
const room = signRoom(seed, "conformance", "1000001", " hello\u200Bworld ");
if (room.text !== "hello world") fail("room canonicalization");
else if (room.signature.length !== 86) fail(`room signature length ${room.signature.length}`);
else ok("room signed payload shape");

const note = signNote(seed, "room-owners", "d-conformance", "1000002", did);
if (note.signature.length !== 86) fail(`note signature length ${note.signature.length}`);
else ok("note signed payload shape");

if (!process.exitCode) {
  console.log("\nCONFORMANCE PASS");
}
