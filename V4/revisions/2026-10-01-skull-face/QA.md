# Native QA: ready for parent publication

Validated 2026-10-01 after explicit parent Photoshop grant and shared-code
stability confirmation. No catalogue publication and no Git operations.

## Results

| Gate | Result |
| --- | --- |
| Focused tests | 7/7 pass, Node --test --test-isolation=none |
| Protected sources | 941 files verified, no lock rewritten |
| Designer assets | Existing bank and extensions validated |
| Photoshop | Active COM .190, version 26.11.7, locks released |
| Editable/native structure | 37 layers, 17 text styles, 37 effects preserved |
| New illustration and race icon | Embedded smart objects, same geometry |
| Profile | Only race HUMAIN -> SKULLZ |
| Original PSD -> original PNG | 0 changed pixels |
| Three changed layers hidden | 0 changed pixels before/after/reopened |
| Allowed-change rectangles | 450167 changes inside, 0 outside |
| Component proof | 0 fixed differences, 0 severe pixels |
| Reopened PSD -> final PNG | 0 changed pixels |
| Barcode | color-1, color-4, gray-1, gray-4 all 49600118 |
| Live-catalogue preflight | Passed at 163 cards, count derived dynamically |

Allowed rectangles: art `[80,156,817,1077]`; icon `[711,1116,807,1211]`;
old label `[549,1162,649,1183]`; new label `[553,1162,645,1183]`.
No numeric, position, flag, crystal, frame, description, identity or style change.

Native PNG SHA256:
`3c3f9f1ed99c1f0dff665cf9a316cb1e8872c749579121652d246f331abfa24b`

Native PSD SHA256:
`977341e0dc9814336cbda07097108545b73fe26ed60c524bdfbf146156efc0fc`

The parent retains final artistic and release approval. The final full-size and
300px images have been inspected locally; final publication must wait for the
11-card One Piece batch, then rerun preflight against its current catalogue.
Physical print barcode verification is outside this run.
