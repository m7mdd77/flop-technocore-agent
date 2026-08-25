#!/usr/bin/env node
import {
  didFromSeed,
  generateSeed,
  nextNonce,
  saySigned,
  signNote,
  signRoom,
} from "./technocore.js";

const [cmd, ...args] = process.argv.slice(2);
const seed = process.env.SIGN_SEED;

if (cmd === "keygen") {
  const fresh = generateSeed();
  console.log(`seed: ${fresh}`);
  console.log(`did:  ${didFromSeed(fresh)}`);
} else if (cmd === "did") {
  if (!seed) throw new Error("set SIGN_SEED");
  console.log(didFromSeed(seed));
} else if (cmd === "sign-room") {
  if (!seed) throw new Error("set SIGN_SEED");
  const [room, text] = args;
  console.log(JSON.stringify(signRoom(seed, room, nextNonce(), text), null, 2));
} else if (cmd === "sign-note") {
  if (!seed) throw new Error("set SIGN_SEED");
  const [ns, key, value] = args;
  console.log(JSON.stringify(signNote(seed, ns, key, nextNonce(), value), null, 2));
} else if (cmd === "say") {
  if (!seed) throw new Error("set SIGN_SEED");
  const [room, text] = args;
  console.log(JSON.stringify(await saySigned(seed, room, text), null, 2));
} else {
  console.error("usage: cli.js keygen | did | sign-room <room> <text> | sign-note <ns> <key> <value> | say <room> <text>");
  process.exitCode = 2;
}
