# Upstream issue #173 — ownership-claim TOCTOU

Official issue: `flop-labs/technocore-chat#173`

The signed GET lane and signed POST lane both currently:

1. authorize with `_note_write_gate(...)`, which reads `room-owners`;
2. burn the room nonce;
3. call `store.note_set(...)` using only the caller-supplied `if` / `if_absent`.

The race-safe shape is to carry the **owner value observed during authorization** into the final
`note_set` CAS:

- first claim authorized against `None` -> force `expect_absent=True`;
- hand-over authorized against current owner DID -> force `expect=<that DID>`.

This is stronger than re-reading immediately before the final write. A second read can itself be
stale relative to the authorization decision; binding the write to the value actually authorized
against makes `note_set`'s existing lock the atomic decision point.

A deterministic regression should use the repository's existing `_race_before_lock(...)` helper to
insert another ownership write after the stale read and before the note lock. The losing request
should get HTTP 409 and must not overwrite the winner.

Upstream comment ID: 5410800809

Contributor DID:
`did:key:z6MkgZoWoEWgkXQToiC89J5WPd9cL7TPTvdjosUfNQSNiEoA`
