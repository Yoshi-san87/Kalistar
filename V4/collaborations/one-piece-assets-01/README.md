# One Piece assets 01

Additive assets for the 11-card / 10-character One Piece expansion. No Photoshop,
catalogue publication, Git operation or protected-lock rewrite is performed here.

## API

`require('./assets.cjs')` exposes `verify()`, `inputs()`, `banner(layers,spec)`,
`FLAG` and `GEOMETRY`. `banner` requires `spec.faction === 'ONEPIECE'` and exactly
one packed faction layer; all other layers are preserved.

- Full flag: `flag-ONEPIECE.png`, 109 x 230, exact approved FF8 alpha.
- Packed flag: `flag-ONEPIECE-packed.png`, 98 x 223 at (672,829), exact FF8 alpha.
- Site faction: `V4/site/assets/factions/ONEPIECE.png`, byte-identical full flag.
- SHARKAN: `race-SHARKAN.png`, 96 x 95 at (711,1116), existing native enamel.
- Motif: `race-SHARKAN.motif.png`; every nonzero alpha corner is within 37.846 px
  of the optical target (limit 39); optical error 0.473 px or less (limit 0.75).
- Installed race: `V4/atelier/designer-assets/extensions/race-SHARKAN.png` plus
  the additive entry in `race-extensions.json`. Only SHARKAN was added to the
  designer-core allowlist. Existing SKULLZ, CERELF and all other races are reused.

## Art And Provenance

Current originals, copied byte-for-byte from built-in image generation:
`V4/Illustrations/OP_robin_01.png`, `OP_franky_01.png`, `OP_brook_01.png`,
`OP_jinbe_01.png`. No complete card was generated.

`requests.json` retains exact prompts under asset IDs `ONEPIECE`, `SHARKAN`,
`robin`, `franky`, `brook`, `jinbe`, and the targeted `robin-face-v2` revision.
`provenance.json.assets` provides the four current art IDs, portable output paths,
SHA-256 values and prompt/reference keys. `entries` retains all seven calls,
reference hashes and generated output provenance. The first Robin is preserved
as `OP_robin_01.initial.png`; the selected illustration has corrected adult
facial volumes. Official references and the direct-page HTTP 403 limitation are
recorded honestly. Each distinct asset/version used one built-in call, no API CLI.

Parent visual QA approved the banner, emblem, Franky, Brook and Jinbe. Robin v2
is technically ready; final parent visual review was pending when provenance
was sealed. No human approval is inferred. `qa/robin-face-v2.png` is a close-up;
`qa/art-contact.png` and `qa/components.png` are inspection derivatives only.
Native frame, central crop and barcode QA remain with the parent/native agent.

## Tests

From the active checkout:

```powershell
node --test V4/site/one-piece.test.cjs
node --test V4/collaborations/one-piece-assets-01/assets.test.cjs
node V4/collaborations/one-piece-assets-01/browser.test.cjs
```

The site suite uses only Node built-ins and portable site modules, with no sharp,
designer, native runtime or protected artwork imports. The local component suite
requires the existing Kalistar native dependencies. The browser suite uses an
isolated headless Chrome context without production storage or a live server.
Its fixture images test loading/layout, not final card appearance. Reports and
screenshots remain exclusively under this package's `qa/browser/` directory.

Verified: one `data-id="one-piece"` scope, 11 versions / 10 character groups,
two Chopper versions in one group, keyboard activation, local asset routes and
six responsive widths (320,390,700,1024,1200,1600). The scope grid was expanded
to three rows on phones and two rows on intermediate screens to avoid overlap.

`prepare.cjs` deterministically prepares the components and installs only new
binary copies. It does not edit the race registry or any protected lock.
Do not rerun preparation/provenance after the native agent freezes sources.
