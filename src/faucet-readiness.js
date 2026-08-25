#!/usr/bin/env node
import {
  base58Decode,
  identityFromSeed,
  signRoom,
  sweep,
} from "./technocore.js";

function die(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const seed = process.env.SIGN_SEED;
if (!seed) die("SIGN_SEED is required. Keep it local; never paste it into a faucet form.");

const identity = identityFromSeed(seed);
const decoded = base58Decode(identity.did.slice("did:key:z".length));
if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
  die("persistent DID does not decode as an Ed25519 did:key");
}

// Exercise the exact signed-lane machinery without sending anything.
const probe = signRoom(
  seed,
  "faucet-readiness",
  "1",
  sweep("FLOP testnet faucet readiness"),
);

const configured = process.env.FLOP_FAUCET_URL?.trim() || null;
if (configured) {
  let url;
  try {
    url = new URL(configured);
  } catch {
    die("FLOP_FAUCET_URL is not a valid URL");
  }
  if (url.protocol !== "https:" || url.hostname !== "technocore.chat") {
    die(
      "refusing FLOP_FAUCET_URL: current public guidance says the faucet will be on technocore.chat",
    );
  }
}

console.log(JSON.stringify({
  status: configured ? "OFFICIAL_URL_CONFIGURED_NOT_CALLED" : "WAITING_FOR_OFFICIAL_FAUCET_ROUTE",
  did: identity.did,
  fingerprint: identity.fingerprint,
  didNotePath: identity.didNotePath,
  signer: {
    algorithm: "Ed25519",
    signatureEncoding: "base64url-unpadded",
    testSignatureLength: probe.signature.length,
  },
  faucetUrl: configured,
  safety: [
    "No FLOP token is live yet.",
    "Do not reuse a wallet seed/private key as SIGN_SEED.",
    "Do not submit SIGN_SEED to a website, room message, GitHub issue, or faucet.",
    "Only use an official faucet route announced by Flop Labs / Arthur Hayes.",
  ],
}, null, 2));
