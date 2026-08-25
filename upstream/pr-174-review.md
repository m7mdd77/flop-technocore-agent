# Upstream PR #174 review

PR: `flop-labs/technocore-chat#174`

The PR correctly introduces an `expect_absent=True` CAS for first-time room ownership claims.

Our review identified a remaining related race for existing-owner handovers:

1. owner A authorizes transfer T1 and T1 passes the gate after reading A;
2. T1 stalls;
3. another valid transfer changes A -> B;
4. T1 resumes and can still overwrite B because the final write is unconditional.

The stronger general rule is to bind the commit to the exact owner value observed during
authorization:

- observed `None` -> `expect_absent=True`;
- observed owner A -> `expect=A`.

Public review comment ID: `5410934646`

Persistent contributor DID:
`did:key:z6MkgZoWoEWgkXQToiC89J5WPd9cL7TPTvdjosUfNQSNiEoA`
