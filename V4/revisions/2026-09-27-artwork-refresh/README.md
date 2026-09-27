# Artwork refresh - 27 September 2026

Scope: Auron `41124231`, Kaylis L'elan des couleurs `49055457`, and Lanio
Le vertige pour rire `47414613`. Never the original Kaylis or Lanio Astraball.
Illustration-only revision: no profile, gameplay, text, frame, flag or icon edits.

Kaylis and Lanio are exact byte copies of the user's selected supplied files.
Auron uses built-in image generation, with the real request in
`art/auron-request.json` and researched sword references in `art/REFERENCES.md`.
The original generated output is preserved. `art/provenance.json` records hashes.

## Coordination

Do not freeze or run Photoshop before the parent confirms the shared weapon
icon revision is finalized and the native queue is available. Historical native
evidence is explicitly declared in `set.json`. If an icon revision changed one
of these cards, create `evidence-overrides.json` mapping `auron`, `kaylis`, or
`lanio` to its updated native work directory, relative to the Kalistar root.
The corresponding card PNG must match the active creation byte-for-byte.
The prepare operation refuses stale evidence rather than silently accepting it.

All scripts and outputs are confined to this revision except the explicitly
guarded `publish --go-publish` operation. Publication requires separate parent GO.
The native bridge attaches only to Photoshop 2025 `26.11.7` and uses both the
Atelier render lock and native mutex. It never closes unrelated documents.

## Commands

Run with the configured bundled Node from the workspace root:

```powershell
node V4/revisions/2026-09-27-artwork-refresh/record-art.cjs
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs check
node --test --test-isolation=none V4/revisions/2026-09-27-artwork-refresh/revision.test.cjs
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs preview
# Only after explicit parent GO and the shared icon freeze:
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs prepare --go-native
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs render --go-native --key=auron
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs render --go-native --key=kaylis
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs render --go-native --key=lanio
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs verify
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs preflight
# Separate parent publication GO:
node V4/revisions/2026-09-27-artwork-refresh/revise.cjs publish --go-publish
```

Preparation captures fresh exact source bytes, protected reference/component
hashes, dependencies and playable catalogue. Replacing the artwork smart object
does not rasterize or reposition any other layer. Final verification compares
all native layer geometry, every text/style run, the complete image with artwork
hidden, every pixel outside the art window, PSD reopen, the actual barcode and
native components. Profiles remain byte-identical. Supplied sources are never
resampled on disk: only the separate 737 x 921 embedded component is fitted to
the established art window, without stretching or painting on the card.

The transaction has precisely sixteen targets: five artifacts per creation and
the shared catalogue's native evidence metadata. Originals remain preserved.
No production sources or catalogue have been changed until publication runs.
