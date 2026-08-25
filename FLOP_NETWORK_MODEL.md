# FLOP Network Model — Current Public Design

Last updated: 2026-08-25

This document separates **publicly described design** from **implementation details that are not yet
published**.

## Economic primitive

Arthur Hayes's stated thesis is that AI compute should have a common unit of account based on
floating-point operations rather than model-specific “tokens.”

An agent should be able to ask for:

- a particular model;
- an amount of compute (for example giga/tera-FLOPs);
- a completion time / service requirement;

and pay in FLOP.

The intended economic property is that FLOP is directly useful to an agent because it can be spent
on the resource that lets the agent operate: compute.

## Participants

### Agents

Agents are the demand side.

Publicly described testnet goals include:

- create a wallet;
- receive testnet FLOP from a faucet;
- submit inference requests;
- spend testnet FLOP on actual inference;
- conduct agent-to-agent commerce;
- integrate FLOP into normal agent workflows;
- use decentralized storage / memory capabilities.

### Miners

Miners provide compute.

Hayes described miners as taking inference requests, processing them on available accelerator
hardware, and earning:

- part of the FLOP block reward; and
- FLOP inference fees.

The design is hardware-agnostic in principle: the buyer cares about the requested model/work/service
being delivered, rather than which chip brand performed it.

### Validators

Hayes described validators as:

- judging disputed/dodgy behavior;
- participating in slashing;
- checking proof/receipts that requested work was completed;
- assembling blocks;
- maintaining a data-availability layer used for agent context/memory.

The actual cryptographic/technical verification mechanism for nondeterministic inference has not yet
been published. Do not invent one.

## Privacy boundary described publicly

Hayes said the inference exchange itself is off-chain: validators are not intended to know the
private data exchanged between miner and agent. The chain should see evidence/receipts that the work
was performed and accepted.

The exact receipt format and verification protocol are still unknown.

## Memory

The second major use case is persistent agent memory/context.

The stated goal is decentralized, censorship-resistant storage/retrieval so an agent can retain
context independently of one centralized model/provider.

Validators were described as maintaining the relevant data-availability layer. The exact storage
protocol is not yet public.

## Token launch / emissions — current statements

Public statements currently indicate:

- no presale;
- no VC sale/allocation in the launch pitch;
- fair-start positioning;
- block rewards emitted to network participants;
- roughly two-year halvings;
- after the sixth halving, a constant block reward was described, corresponding to roughly 1–2%
  continuing inflation;
- Flop Labs plans to receive a small amount per block for the first two years as development
  compensation, then that stream goes to zero;
- a foundation is planned to fund continued network development;
- roughly 20% of supply after ten years was described as the airdrop/bootstrapping pool;
- Q4 2026 is the current testnet/airdrop window;
- Q1 2027 is the current mainnet/genesis target.

These are current verbal/design statements, not a final tokenomics specification.

## Performance ambition

Hayes said the initial target block time is around one second and described a much more aggressive
future latency ambition as the agent economy scales.

No consensus implementation or benchmark has been published yet, so we should not build assumptions
around the future latency figure.

## Technocore relationship

Technocore is an onboarding/coordination surface operated by Flop Labs. Its own source explicitly
states that it is a satellite service and **not the FLOP protocol**.

The August 25 update makes Technocore more relevant because the future FLOP testnet faucet is
expected to be exposed there and gated by DID identity.

## What is still unknown

Do not guess any of the following until official material is published:

- chain / VM architecture;
- RPC format;
- wallet/address format;
- faucet URL and request contract;
- inference request schema;
- miner discovery / bidding protocol;
- receipt/proof format;
- validator quorum / stake requirements;
- slashing conditions;
- memory/storage encoding;
- exact genesis supply;
- final allocation percentages;
- exact block reward;
- detailed airdrop scoring formula;
- anti-Sybil rules;
- jurisdiction/eligibility restrictions.

## Primary sources

- Arthur Hayes, “The Book of Genesis”
  https://cryptohayes.substack.com/p/the-book-of-genesis
- Unchained, “Arthur Hayes on Why AI Agents Will Want to Transact in Units of Compute”
  2026-08-21
- https://flop.finance/
- https://github.com/flop-labs/technocore-chat
