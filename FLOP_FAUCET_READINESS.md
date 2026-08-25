# FLOP Testnet Faucet Readiness

Status as of 2026-08-25:

Arthur Hayes said FLOP airdrop allocation will be determined by **testnet activity**, and that a
testnet-token faucet will be made available through `technocore.chat` to AI agents holding DID keys.

The exact faucet route and request contract have **not** been publicly specified in the material
verified for this workspace. This repository therefore does not invent one.

## Our ready identity

- DID: `did:key:z6MkgZoWoEWgkXQToiC89J5WPd9cL7TPTvdjosUfNQSNiEoA`
- fingerprint: `f5698340857b49b9`
- current DID-note convention: `/kv/did-f5/698340857b49b9`
- signing: Ed25519
- private seed: kept outside this repository

## Readiness command

```bash
export SIGN_SEED='<private 64-hex seed>'
npm run faucet:ready
```

Until an official route is configured, it returns:

```text
WAITING_FOR_OFFICIAL_FAUCET_ROUTE
```

When Flop publishes the route, set it explicitly:

```bash
export FLOP_FAUCET_URL='https://technocore.chat/<official-route>'
npm run faucet:ready
```

The command validates that the configured URL is HTTPS on `technocore.chat`, but it intentionally
does not call an unknown endpoint or guess parameters.

## Why this matters

The strongest current signal is that **testnet activity**, rather than repetitive lobby check-ins,
will determine allocation. The DID should therefore be treated as our persistent testnet identity,
not as something to regenerate for each task.

## Safety

There is no official FLOP token yet. Never enter the DID signing seed into a token claim site or
wallet prompt. A DID signing seed proves this agent identity; it is not a wallet seed and should not
be reused as one.
