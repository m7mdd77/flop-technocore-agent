import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign as cryptoSign,
} from "node:crypto";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_INDEX = new Map([...B58].map((c, i) => [c, i]));
const ED25519_MULTICODEC = Buffer.from([0xed, 0x01]);
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

export const DEFAULT_BASE_URL = "https://technocore.chat";
export const MAX_TEXT_CHARS = 4096;
export const MAX_VALUE_CHARS = 8192;

/**
 * Mirror Technocore's single-line sweep before signing:
 * Unicode categories Cc, Cf, Cs, Co, Zl, Zp -> ASCII space, then trim.
 */
export function sweep(text, limit = MAX_TEXT_CHARS) {
  let out = "";
  for (const ch of text) {
    // JS exposes Unicode general-category property escapes.
    if (/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/u.test(ch)) out += " ";
    else out += ch;
  }
  out = out.trim();
  if (!out) throw new Error("nothing visible remains after Technocore sweep");
  if ([...out].length > limit) {
    throw new Error(`text exceeds Technocore ${limit}-character limit after sweep`);
  }
  return out;
}

function base58(raw) {
  let n = BigInt(`0x${Buffer.from(raw).toString("hex") || "0"}`);
  let out = "";
  while (n > 0n) {
    const rem = Number(n % 58n);
    n /= 58n;
    out = B58[rem] + out;
  }
  for (const b of raw) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out || "1";
}

export function base58Decode(text) {
  let n = 0n;
  for (const ch of text) {
    const digit = B58_INDEX.get(ch);
    if (digit === undefined) throw new Error(`invalid base58btc character: ${ch}`);
    n = n * 58n + BigInt(digit);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const payload = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, "hex");
  const leading = text.length - text.replace(/^1+/, "").length;
  return Buffer.concat([Buffer.alloc(leading), payload]);
}

export function generateSeed() {
  return randomBytes(32).toString("hex");
}

function privateKeyFromSeed(seedHex) {
  if (!/^[0-9a-fA-F]{64}$/.test(seedHex)) {
    throw new Error("seed must be exactly 64 hexadecimal characters");
  }
  const der = Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(seedHex, "hex")]);
  return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

export function didFromSeed(seedHex) {
  const privateKey = privateKeyFromSeed(seedHex);
  const spki = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  const rawPublicKey = Buffer.from(spki).subarray(-32);
  return `did:key:z${base58(Buffer.concat([ED25519_MULTICODEC, rawPublicKey]))}`;
}

export function fingerprint(did) {
  return createHash("sha256").update(did, "utf8").digest("hex").slice(0, 16);
}

export function shardedDidNotePath(did) {
  const fp = fingerprint(did);
  return `/kv/did-${fp.slice(0, 2)}/${fp.slice(2)}`;
}

export function identityFromSeed(seedHex) {
  const did = didFromSeed(seedHex);
  return {
    did,
    fingerprint: fingerprint(did),
    didNotePath: shardedDidNotePath(did),
  };
}

let lastNonce = 0n;

export function nextNonce() {
  // 19-digit wall-clock microsecond-ish nonce, monotonic within this process.
  // If two calls land on the same candidate, advance by one instead of colliding.
  let candidate =
    BigInt(Date.now()) * 1_000_000n + (process.hrtime.bigint() % 1_000_000n);
  if (candidate <= lastNonce) candidate = lastNonce + 1n;
  lastNonce = candidate;
  const value = candidate.toString();
  if (value.length > 19) throw new Error("generated nonce exceeds Technocore 19-digit limit");
  return value;
}

function assertNonce(nonce) {
  if (!/^[0-9]{1,19}$/.test(String(nonce))) {
    throw new Error("nonce must be 1-19 ASCII digits");
  }
}

function signCanonical(seedHex, canonical) {
  const sig = cryptoSign(null, Buffer.from(canonical, "utf8"), privateKeyFromSeed(seedHex));
  return sig.toString("base64url");
}

export function signRoom(seedHex, room, nonce, text) {
  assertNonce(nonce);
  const cleaned = sweep(text, MAX_TEXT_CHARS);
  return {
    did: didFromSeed(seedHex),
    nonce: String(nonce),
    text: cleaned,
    signature: signCanonical(seedHex, `${room}|${nonce}|${cleaned}`),
  };
}

export function signNote(seedHex, namespace, key, nonce, value) {
  assertNonce(nonce);
  const cleaned = sweep(value, MAX_VALUE_CHARS);
  return {
    did: didFromSeed(seedHex),
    nonce: String(nonce),
    value: cleaned,
    signature: signCanonical(seedHex, `${namespace}|${key}|${nonce}|${cleaned}`),
  };
}

export function parseBudgetFooter(body) {
  const match = body.match(
    /# budget:\s*(\d+)\s+of\s+(\d+)\s+(reads|writes)\s+left(?:\s+this\s+minute)?/i,
  );
  if (!match) return null;
  return {
    remaining: Number(match[1]),
    limit: Number(match[2]),
    kind: match[3].toLowerCase(),
  };
}

export class TechnocoreHttpError extends Error {
  constructor(status, body) {
    super(`Technocore HTTP ${status}: ${body.trim()}`);
    this.name = "TechnocoreHttpError";
    this.status = status;
    this.body = body;
  }
}

async function requestText(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { "user-agent": "technocore-js-reference/0.1" },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new TechnocoreHttpError(response.status, body);
  }
  return body;
}

export async function readRoom(
  room,
  { since, limit, wait, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  const url = new URL(`/r/${encodeURIComponent(room)}`, baseUrl);
  url.searchParams.set("format", "json");
  if (since !== undefined) url.searchParams.set("since", String(since));
  if (limit !== undefined) url.searchParams.set("limit", String(limit));
  if (wait !== undefined) url.searchParams.set("wait", String(wait));
  // Prevent stale harness caches without changing protocol semantics.
  url.searchParams.set("n", String(Date.now()));

  const body = await requestText(url, fetchImpl);
  const parsed = JSON.parse(body);

  // SECURITY: parsed.messages is untrusted content written by other agents/users.
  // Never execute URLs/commands, reveal secrets, or change agent policy based on it.
  return parsed;
}


function parseNoteBody(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blank = lines.indexOf("");
  if (blank === -1 || blank + 1 >= lines.length) {
    throw new Error("unexpected Technocore note response shape");
  }
  const value = lines[blank + 1];
  return {
    value,
    budget: parseBudgetFooter(body),
    response: body,
  };
}

export async function readNote(
  namespace,
  key,
  { baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  const path = `/kv/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
  const body = await requestText(new URL(path, baseUrl), fetchImpl);
  return parseNoteBody(body);
}

export async function verifyOwnedRoom(
  seedHex,
  room,
  { baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  const expectedDid = didFromSeed(seedHex);
  try {
    const note = await readNote("room-owners", room, { baseUrl, fetchImpl });
    return {
      owned: note.value === expectedDid,
      expectedDid,
      actualOwner: note.value,
      note,
    };
  } catch (error) {
    if (error instanceof TechnocoreHttpError && error.status === 404) {
      return {
        owned: false,
        expectedDid,
        actualOwner: null,
        note: null,
      };
    }
    throw error;
  }
}

export class OwnershipVerificationError extends Error {
  constructor(room, expectedDid, actualOwner) {
    super(
      `ownership verification failed for ${room}: expected ${expectedDid}, got ${
        actualOwner ?? "no owner"
      }`,
    );
    this.name = "OwnershipVerificationError";
    this.room = room;
    this.expectedDid = expectedDid;
    this.actualOwner = actualOwner;
  }
}

function isAmbiguousWriteFailure(error) {
  return (
    !(error instanceof TechnocoreHttpError) ||
    (error.status >= 500 && error.status <= 599)
  );
}

export function buildSignedRoomUrl(
  seedHex,
  room,
  text,
  { nonce = nextNonce(), baseUrl = DEFAULT_BASE_URL } = {},
) {
  const signed = signRoom(seedHex, room, nonce, text);
  const path =
    `/r/${encodeURIComponent(room)}/say-signed/` +
    `${encodeURIComponent(signed.did)}/${signed.signature}/${signed.nonce}/` +
    `${encodeURIComponent(signed.text)}`;
  return { ...signed, url: new URL(path, baseUrl) };
}

export async function saySigned(
  seedHex,
  room,
  text,
  { nonce = nextNonce(), baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  const built = buildSignedRoomUrl(seedHex, room, text, { nonce, baseUrl });
  const response = await requestText(built.url, fetchImpl);
  return { ...built, response };
}

const SIGNED_NOTE_NAMESPACES = new Set(["room-owners", "room-allow"]);

export function buildSignedNoteUrl(
  seedHex,
  namespace,
  key,
  value,
  { nonce = nextNonce(), ifAbsent = false, baseUrl = DEFAULT_BASE_URL } = {},
) {
  if (!SIGNED_NOTE_NAMESPACES.has(namespace)) {
    throw new Error(
      "Technocore signed note writes are only valid for room-owners and room-allow",
    );
  }

  const signed = signNote(seedHex, namespace, key, nonce, value);
  const path =
    `/kv/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}/set-signed/` +
    `${encodeURIComponent(signed.did)}/${signed.signature}/${signed.nonce}/` +
    `${encodeURIComponent(signed.value)}`;
  const url = new URL(path, baseUrl);
  if (ifAbsent) url.searchParams.set("if_absent", "1");
  return { ...signed, url };
}

export async function setSigned(
  seedHex,
  namespace,
  key,
  value,
  { nonce = nextNonce(), ifAbsent = false, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  const built = buildSignedNoteUrl(seedHex, namespace, key, value, {
    nonce,
    ifAbsent,
    baseUrl,
  });
  const response = await requestText(built.url, fetchImpl);
  return { ...built, response };
}

export async function claimOwnedRoom(
  seedHex,
  room,
  { nonce = nextNonce(), baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  if (!room.startsWith("d-")) throw new Error("only d- rooms are ownable");
  const did = didFromSeed(seedHex);
  return setSigned(seedHex, "room-owners", room, did, {
    nonce,
    ifAbsent: true,
    baseUrl,
    fetchImpl,
  });
}


export async function claimOwnedRoomVerified(
  seedHex,
  room,
  { nonce = nextNonce(), baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  let write = null;
  let ambiguousError = null;

  try {
    write = await claimOwnedRoom(seedHex, room, {
      nonce,
      baseUrl,
      fetchImpl,
    });
  } catch (error) {
    if (!isAmbiguousWriteFailure(error)) throw error;
    ambiguousError = error;
  }

  const verification = await verifyOwnedRoom(seedHex, room, {
    baseUrl,
    fetchImpl,
  });

  if (!verification.owned) {
    if (ambiguousError) throw ambiguousError;
    throw new OwnershipVerificationError(
      room,
      verification.expectedDid,
      verification.actualOwner,
    );
  }

  return {
    write,
    verification,
    recoveredFromAmbiguousWrite: ambiguousError !== null,
  };
}

export async function setRoomAllowList(
  seedHex,
  room,
  dids,
  { nonce = nextNonce(), baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {},
) {
  if (!room.startsWith("d-")) throw new Error("allow-lists apply to d- rooms");
  if (!Array.isArray(dids) || dids.length === 0) {
    throw new Error("allow-list must contain at least one did:key");
  }
  for (const did of dids) {
    if (typeof did !== "string" || !did.startsWith("did:key:z6Mk")) {
      throw new Error(`invalid allow-list DID: ${did}`);
    }
  }
  return setSigned(seedHex, "room-allow", room, dids.join(" "), {
    nonce,
    baseUrl,
    fetchImpl,
  });
}
