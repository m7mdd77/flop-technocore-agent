# FLOP Testnet Execution Plan

This plan is intentionally split into **ready now** and **activate when official specs land**.

## Ready now

### Identity

Persistent DID:

`did:key:z6MkgZoWoEWgkXQToiC89J5WPd9cL7TPTvdjosUfNQSNiEoA`

Do not mint disposable DIDs for farming.

### Signing

The repository has a tested Ed25519 signer and exact Technocore canonicalization.

### Faucet readiness

`npm run faucet:ready`

Current expected state:

`WAITING_FOR_OFFICIAL_FAUCET_ROUTE`

We will not guess a route.

### Public useful contribution

We have already contributed technical analysis to official Technocore issue #173 covering the
ownership TOCTOU across both signed GET and signed POST lanes.

## Activate immediately when faucet/specs are published

### 1. Bind testnet account to the persistent identity

- determine the official wallet/address format;
- generate a **separate** network wallet if required;
- never reuse the DID seed as the wallet seed;
- bind DID ↔ testnet account only through the official mechanism.

### 2. Claim testnet FLOP

- use only the official Technocore faucet route;
- capture the response / transaction identifier;
- never paste the DID private seed into the faucet;
- record faucet activity locally.

### 3. Perform real inference requests

Prefer varied, useful requests over repetitive no-op calls.

For every request record:

- local timestamp;
- testnet account;
- model requested;
- compute quantity if exposed;
- price / FLOP spent;
- miner/provider;
- request ID;
- receipt/proof identifier;
- latency;
- success/failure;
- output hash where appropriate (not sensitive output);
- chain transaction/block reference.

### 4. Exercise failure paths

Useful testnet participation should also reveal defects:

- miner timeout;
- malformed receipt;
- price mismatch;
- double submission;
- validator disagreement;
- failed inference;
- retry/idempotency behavior;
- insufficient balance;
- storage/memory retrieval failure.

File reproducible upstream reports instead of generating volume for its own sake.

### 5. Agent-to-agent commerce

When the protocol supports it:

- publish a genuine task;
- have another agent perform it;
- settle payment in testnet FLOP;
- verify the result;
- store reproducible public evidence without leaking private data.

### 6. Persistent memory

Test:

- storing context;
- retrieving it in a new agent session;
- integrity of returned context;
- access/censorship behavior;
- latency and price;
- recovery after node/provider failure.

### 7. Miner / validator readiness

Once hardware and protocol requirements are public, produce separate reproducible runbooks for:

- miner install/config;
- validator install/config;
- telemetry;
- benchmark;
- upgrade;
- failure recovery;
- key management;
- resource/cost accounting.

## What we should optimize for

Not raw transaction count.

Optimize for:

1. unique protocol surfaces exercised;
2. meaningful compute consumed/provided;
3. valid bug reports and fixes;
4. integrations used by real agents;
5. reliable miner/validator uptime if we operate infrastructure;
6. agentic commerce;
7. memory/storage activity;
8. long-lived identity continuity;
9. reproducible public engineering evidence.

That matches Hayes's repeated “do something useful” framing better than a spam strategy.
