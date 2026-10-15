# Collection sleeve bottom seal - 4.5.59

Author request: attach the identification strip to the bottom of the sleeve,
with the visible clear lip below the card instead of below the label.

The existing 4px lower margin moves between the card and its strip. The sleeve
ends exactly at the strip bottom. Its total height, artwork size, controls,
reflections and responsive layouts are unchanged. This is one CSS adjustment;
no gameplay, storage, native images, new assets or runtime JavaScript.

The preceding 4.5.58 Pages run failed because a new native verification test
loaded sharp from a Windows-only workstation path. The shared native helper
now respects `KALISTAR_NODE_MODULES`, already configured by Pages, and preserves
its exact local fallback. No verifier, image proof, reference hash or lock is
weakened. A subprocess test verifies the configured runtime takes precedence.

## Verification

- `node --test --test-isolation=none V4/site/ui-system.test.cjs`
- `node --test --test-isolation=none V4/releases/2026-10-09-sleeve-bottom-seal/runtime.test.cjs`
- `node V4/site/collection-map.browser.test.cjs`
- `node V4/site/collection-versions.test.cjs`
- `node V4/releases/2026-10-09-sleeve-bottom-seal/verify-static.cjs <snapshot>`

The map test measures card/strip gap, exact bottom alignment and pocket fit
at seven desktop/phone sizes. It also checks contrast, no horizontal overflow,
Reduced Motion, hover/focus, real touch favorites, paging, filters, versions,
notebook tabs, Story navigation and reload. Edition interaction tests retain
their rapid-click and cancellation scenarios. Tests use disposable contexts.
The edition test now derives Final Fantasy expectations from the collaboration
registry instead of its obsolete FF7/FF8/FF10-only count. No filter behavior is
changed, and every current Final Fantasy faction remains explicitly checked.

All 467 committed workflow tests and the additional runtime override test pass.
The 988-file Pages build succeeds (294 playable cards). Both browser suites
pass against that build, including seven responsive sizes and real touch
controls. Kept captures show desktop, Razr, compact phone and the sleeve detail.
Native LFS sources required by the new FF tests were hydrated in the isolated
snapshot with size/SHA verification; no protected resource was changed.
All 15 changed source/test/documentation files match the tested snapshot byte
for byte. The temporary source/build copies are removed after verification.

Publication targets personal `Yoshi-san87/Kalistar`, main and annotated tag
`v4.5.59`. Unfinished equipment production and workflow changes are excluded.
Verification outputs and desktop/mobile captures accompany this release.
