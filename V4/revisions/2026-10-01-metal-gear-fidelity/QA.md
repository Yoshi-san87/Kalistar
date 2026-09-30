# Native QA and coordination

Seven cards rendered in Photoshop 26.11.7 through COM .190 / Windows PowerShell 5.
Renderer completed and released Local\KalistarV4AtelierRender. RE rendering may proceed.

All seven verified: editable native text and exact text style runs preserved;
profiles byte-identical; all unaffected layer states unchanged before/after/reopen;
zero changed pixels outside illustration window; zero changed pixels with artwork
hidden; reopened PSD export pixel-identical; smart objects preserved; actual
printed barcode decoded successfully. Strict typography verification passed.
Target profile hashes also match the frozen parent RE release baseline.

Visual native framing review: heads clear of top banner, Raiden forehead/temple
armor readable, Ocelot short hair visible, Naomi closer with face and hands in
window, Vamp costume and knife fan readable, D-Dog visible alongside Snake,
small Mk.II on floor beside Otacon, The Boss open neckline visible.

Parent review sheets, left to right: Major Ocelot, Raiden, Naomi, Vamp,
Venom Snake, Otacon, The Boss.
- contact-sheet-art.png: seven selected illustrations.
- contact-sheet-cards.png: seven native cards.
- contact-sheet-native-upper.png: native banner/headgear closeups.

Detailed proof: verified.json and work/<key>/verification.json, audit.json,
render/native.json and reopened.png. Individual small.png previews are present.
Exact prompts: prompts.json. Generation: six individual built-in image_gen calls;
Naomi: deterministic crop. Selected assets: versioned V4/Illustrations/MGS_*_Fidelity_20261001.png.

No catalogue or creation publication has been performed. Original target files
and approved reference lock remain unchanged. No Git actions were performed.
publish() is implemented but requires explicit parent coordination through
KALISTAR_MGS_PARENT_COORDINATED=2026-10-01. It reads the CURRENT catalogue,
changes only target nativeRevision metadata, preserves all profile bytes and
all unrelated entries, and validates the dynamic current game count.
The read-only preflight command may be run without publication authorization.
