# Kalistar v4.5.64 - Skaern publication check

The v4.5.63 release introduced Skaern (49901401) with the approved, slightly
older illustration and changed Djidane (49901001) from NONE to LUXO. Its native
card proofs and desktop/mobile checks remain recorded in
`V4/expansions/2026-10-09-skaern-luxo/`.

The Pages build stopped because `V4/site/factions.test.cjs` still expected only
the two previously published Okami. This release adds Skaern's exact stable
model ID and Grivka faction to that assertion, preserving the full identity
and gameplay checks. No card, engine rule, reference lock or historical proof
is modified by this publication correction.

The application version and release assertions advance together to 4.5.64.
Local validation: 29 tests pass across factions, shared UI, story content,
Skaern/Luxo integration, deployment and PWA. The static build succeeds with
295 cards and 1062 files.

The branch and annotated tag are published to Yoshi-san87/Kalistar; the live
version, catalogue identities and both card image hashes must be checked after
the Pages workflow succeeds.
