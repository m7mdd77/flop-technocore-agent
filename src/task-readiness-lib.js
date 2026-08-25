import { base58Decode, identityFromSeed, signRoom, sweep } from "./technocore.js";

export const OFFICIAL_TECHNOCORE_HOST = "technocore.chat";

export function validateOfficialTechnocoreUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("task URL must be a non-empty string");
  }
  if (value !== value.trim()) {
    throw new Error("task URL must not contain surrounding whitespace");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("task URL is not a valid URL");
  }

  if (url.protocol !== "https:" || url.hostname !== OFFICIAL_TECHNOCORE_HOST) {
    throw new Error("task URL must use HTTPS on technocore.chat");
  }
  if (url.username || url.password) {
    throw new Error("task URL must not contain embedded credentials");
  }
  if (url.hash) {
    throw new Error("task URL must not contain a fragment");
  }
  return url.toString();
}

export function buildTaskReadiness(seedHex, configuredUrl = null) {
  const identity = identityFromSeed(seedHex);
  const decoded = base58Decode(identity.did.slice("did:key:z".length));
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error("persistent DID does not decode as an Ed25519 did:key");
  }

  const probe = signRoom(
    seedHex,
    "task-readiness",
    "1",
    sweep("FLOP Technocore task readiness"),
  );

  const taskUrl = configuredUrl ? validateOfficialTechnocoreUrl(configuredUrl) : null;
  return {
    status: taskUrl ? "OFFICIAL_TASK_URL_CONFIGURED_NOT_CALLED" : "WAITING_FOR_OFFICIAL_TASK_ROUTE",
    did: identity.did,
    fingerprint: identity.fingerprint,
    didNotePath: identity.didNotePath,
    signer: {
      algorithm: "Ed25519",
      signatureEncoding: "base64url-unpadded",
      testSignatureLength: probe.signature.length,
    },
    taskUrl,
    safety: [
      "Use the same persistent DID for official FLOP/Technocore tasks.",
      "Never submit SIGN_SEED to a task page, room message, GitHub issue, or faucet.",
      "Do not reuse the DID seed/private key as a network-wallet seed/private key.",
      "Do not guess unpublished task or faucet endpoints.",
      "Record task IDs, signed receipts, room sequence numbers, and testnet transaction IDs when available.",
    ],
  };
}
