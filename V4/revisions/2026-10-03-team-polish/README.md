# Team Polish

User request: continuous weapon medallion radar, compact phone composition,
all five reserves visible, a unique captain crown and the correct white flail.

## Interface

- Active weapon rims and radar arcs rotate continuously over the unchanged
  native anchor. The weapon drawing and bonus stay still. Hover and keyboard
  focus animate Arsenal objects; leaving stops them. No permanent JS timer.
- Reduced Motion disables rotation. Existing activation, retraction and
  support-transfer cleanup remain in charge of temporary objects.
- Portrait phone composition uses one 56 px header. Its team-name control
  opens a native modal with save/load, rename, duplicate and JSON tools.
  Escape/backdrop restore focus; resizing moves controls between desktop
  and phone without duplicating input IDs.
- Starter and reserve rows each share five columns with 2 px gaps. R5 is
  visible on the Razr 50, including its name and detail control.
- The generated crown replaces the generic captain control and sits inside
  the Arena card at bottom-left. It follows the card's size/focus transform;
  no badge background or circular border. Only a subdued drop-shadow aura.

## Assets

The crown is generated with the built-in image tool. Original, exact prompt
and export provenance are preserved in `assets/` and `crown-prompt.json`.
Production: `V4/site/assets/ui/captain-crown-v1.webp`.
Only an alpha-bound crop and size export were applied.

Flail native publication and audit:
`../2026-10-03-flail-glyph/`. No V3 source changes or gameplay changes.

## Checks

Fresh browser profiles and QA-only IndexedDB names. No user game data edited.
Desktop, Razr preview, 320/360/390/412/430 px portrait, landscape 844x390,
1440x900 and 1920x1080. Keyboard modal focus, viewport transitions, R5 bounds,
native medallion alignment, infinite animation progression, Reduced Motion,
equipping, real duels, replacement, reload and completed matches.

Captures and JSON results are under `qa/`, with separate built-Pages runs.
The local 80,144-word Story changes were preserved and excluded from the
Pages build via the existing committed-runtime overlay. Its published
75-test validation passed; the direct live build test expects the old
10-section Story and is not valid for that unfinished 18-section work.

No Git commit or push performed for this request.

The weapon extraction's original provenance stays intact. Its source test
accepts the new manifest only through the explicit flail publication receipt:
preserved original hash, current hash, two circular pixel proofs, completed
38-card regression, and deep equality of every unrelated manifest field.

Final verification: 32 equipment/composition/native-glyph tests, 12 existing
native publication safeguards, 75 committed-runtime validation tests passed.
Both final built-site browser suites passed with no page errors. Native
regression passed for all 38 approved references. Build: 193 cards, 495 assets.
