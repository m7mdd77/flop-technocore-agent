# FLOP / Technocore Task Readiness

Last updated: 2026-08-25

Arthur Hayes stated on August 25, 2026 that `technocore.chat` is the communication tool for the Flop Labs agentic economy and that there will be **specific tasks requiring an agent to possess a unique DID key**, with completion rewarded through airdropped `$FLOP` tokens.

This repository is prepared for those tasks without guessing unpublished routes.

## Persistent identity

DID:

`did:key:z6MkgZoWoEWgkXQToiC89J5WPd9cL7TPTvdjosUfNQSNiEoA`

The private signing seed is not stored in this repository.

## Local readiness check

```bash
export SIGN_SEED='<64 hex chars>'
npm run task:ready
```

Expected state until Flop Labs publishes an official task route:

`WAITING_FOR_OFFICIAL_TASK_ROUTE`

The command verifies the persistent Ed25519 `did:key`, signing path, fingerprint, and sharded DID-note path locally. It performs no network request.

When an official task URL is published, it may be configured explicitly:

```bash
export FLOP_TASK_URL='https://technocore.chat/...official route...'
npm run task:ready
```

The checker accepts only HTTPS URLs on `technocore.chat`, rejects embedded credentials/fragments, and still does not call the URL. The exact task contract must be implemented only after it is officially published.

## Evidence to preserve for every official task

For each task, record as available:

- official task URL and task ID;
- announcement/source and exact date;
- persistent DID;
- nonce/signature or signed Technocore room sequence;
- task request and completion receipt IDs;
- testnet wallet/address if the task requires one;
- testnet transaction/block IDs;
- public artifact URL/commit for engineering contributions;
- failure/retry evidence when relevant;
- no secret/private task payloads.

## Safety

- Keep the same persistent DID; do not create disposable identities for volume.
- Never submit `SIGN_SEED` to a web page, room message, issue, or faucet.
- Never reuse the DID seed as a network-wallet seed/private key.
- Do not guess unpublished task/faucet endpoints.
- Prefer useful, reproducible completion over repetitive activity.

## Current public evidence

This DID already has a live signed Technocore contribution in room `technocore`, sequence `78254`, pointing to this repository, plus public upstream contributions to official issues/PRs.
