# Native status

2026-10-01: all 48 native PSDs rendered and reopened, all 48 proofs verified.
Photoshop and its mutex are FREE. No active render or verification process.
The four contact sheets in `qa/` were inspected. Parent aggregate proof review
and publication grant were received. All 48 revisions are PUBLISHED.
The catalogue remains at 175; all unrelated entries, original artwork and
protected sources remain exact. `completion.json` records the successful final
audit. All 31 portable tests pass after publication, including 11 focused tests
expanded from the nine initial approved policies. No active process or Git work.

Plan and native proofs: parent approved all 48 profiles.
Native grant: `KALISTAR_STATS_PS_GRANTED=2026-10-01`.
Publication grant: `KALISTAR_STATS_PARENT_REVIEWED=2026-10-01`.

Pilot Luffy initially encountered an optional missing Photoshop text transform
descriptor before exports; the native reader now treats its absence as identity.
Its first complete render then preserved every style-run byte but changed a few
last IEEE-754 bits in the linear transform during calibrated translation.
The entire native attempt, code, request and original hash manifest were moved
intact to `attempts/01-pilot-transform-rounding/`. No hashes were rewritten to
pretend that code or evidence had stayed unchanged.

The strict verifier compares every native style-run byte exactly and allows at
most `1e-12` matrix drift only on deliberately edited numeric layers. Unedited
transforms remain exact. The actual maximum measured drift was
`2.9976021664879227e-15` on the pilot, and the full batch maximum is
`4.6629367034256575e-15`. All 48 proofs PASS: exact reopened PNG, unchanged
frame with numeric text hidden, zero changed pixels outside number-and-shadow
masks, preserved artwork/components and valid real barcodes.

Two verifier-only repairs are documented with the actual prior source hashes
and sources intact: the raw pixel helper is internal to lib.cjs, and the
radius-64/radius-44 number-and-native-shadow masks cover more than the
radius-52/radius-35.5 physical fill. They are not an inner-fill containment
claim. The independent exact hidden-number frame comparison still proves that
the actual painted rim and frame are unchanged.
`verifier-repairs.json` records this explicitly; renderer and evidence hashes
were not falsified or refreshed to hide drift. The pilot proof is in
`work/49800101/verification.json`. Small batches may now proceed, releasing the
native mutex between them. All 48 proofs are complete and published; originals
remain byte-identical in the early backups. The native review snapshot itself
was not rewritten after publication.

The first publication preflight rejected absent optional `nativeRevision`
metadata on older MGS entries because absence differs from explicit undefined.
The comparator now removes only the two authorized fields on both sides and
compares all other metadata exactly. An added regression test covers this case
and still rejects missing/extra identity fields. `publication-repair.json`
links the actual archived render-time source and its hash; native proofs and
render-input hashes were not modified. No production write occurred on failure.
