# Nerval - Le Veilleur des Passerelles

Approved illustration and playable card requested on 9 October 2026.
Model 49901402, stable characterId nerval-kalistar. Original Kalistar character,
not a collaboration or an extra equipment item.

## Character and gameplay

Human of Chroma, Veilleur, Luxo, Baton. P3/P5 compatibility, Support role 5.
His patience and lantern suggest protection and support, not offensive burst.
ATK D6-D1: 173, 139 (magic), 108, guard, 48, mana.
DEF D6-D1: 204, 168, 132 (barrier), 96, 61, 28.
Numbers remain in the established role-5 bands. Guard grants the existing
physical ward; mana grants the existing next-magical-attack token. No new rule,
guaranteed outcome, permanent buff or automatic equipment bonus is introduced.
The bracelet and staff light belong to the approved illustration only.

## Source and native production

The approved image is preserved byte-for-byte in
`V4/propositions/2026-10-09-nerval/illustration.png`, alongside the exact prompt
and built-in ImageGen provenance. The upper crop preserves the face and lantern;
the source image is not retouched. Parts of the staff sit behind the native
ATK column, as with the other character illustrations.

The existing Photoshop 26.11.8 compositor produces 897 x 1497 px, 300 ppi
PSD/PNG files, native editable text and embedded component smart objects.
The original card frame, sources and locked hashes remain unchanged.
`before.json` freezes production inputs and the pre-publication catalogue.
The shared transactional publisher installs only the new model after native
verification and preserves all prior entries. No existing card is modified.

## Validation

- Fixed-frame pixel differences: 0; PSD reopen differences: 0.
- Barcode read from the actual PNG: passed, model 49901402.
- Native typography, description bounds and embedded objects: passed.
- 35 targeted tests: profile limits, all twelve faces, support, magic, barrier,
  restoration, existing Skaern/Luxo cards, factions, catalogue, deployment and PWA.
- The four Nerval tests also pass against the committed 4.5.64 runtime, isolated
  from the concurrent equipment changes in the working directory.
- Browser readers: 1440x1000, Razr 50 412x915, compact 320x740.
- Desktop/mobile arena and match reload: passed, no JavaScript or asset errors.
- Captures and results: `browser-proof/`; public reruns use `public-browser-proof/`.

Run `node --test V4/expansions/2026-10-09-nerval/integration.test.cjs`.
Run `node V4/expansions/2026-10-09-nerval/browser.test.cjs` after the static build.
Set KALISTAR_PAGES_URL to the deployed project root for public browser checks.
Do not rerun prepare over frozen production. A future art revision must use
new versioned outputs and retain this approved source.
