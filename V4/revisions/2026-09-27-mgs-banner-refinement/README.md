# MGS banners and two crop adjustments

Scope: ten existing MGS cards plus Kaylis 49055457. No character generation,
gameplay, native typography, frame, icon bank or reference-lock changes.
The parent owns `art-flags/`, website assets, documentation and Git.

Approved crop studies are in `qa/liquid-snake/` and `qa/kaylis/`.
Left side is the current native PNG; right side is an approximate preview
with the old banner, not a final native rendering. Original artwork bytes stay
unchanged. Only `profile.crop` changes for these two cards, including their
catalogue metadata, so subsequent native renders retain the approved framing.

The revision reuses the prior artwork-refresh native replacement pattern,
the MGS crop and banner validators, native component/barcode verification,
and the established compare-and-swap publication transaction.

1. `node --test revision.test.cjs`
2. `node revise.cjs check`
3. `node revise.cjs prepare --go-prepare` captures fresh evidence without Photoshop.
4. After explicit native GO, render Liquid first, then `node revise.cjs gate`.
   Other renders refuse to start without this successful targeted gate.
   Run `node revise.cjs render --go-native --key=...` serially.
5. `node revise.cjs verify` then `node revise.cjs preflight`.
6. Stop for parent native visual review. Publication requires a separate GO:
   `node revise.cjs publish --go-publish`.

Required proofs: exact pixel identity outside authorized windows; zero difference
with replaced objects hidden; all native layers, text and mixed font runs
preserved; embedded smart objects; PSD reopen difference zero; four barcode
decodes per card; original illustrations and shared references unchanged.
No historical bank update and no 38-card regression are necessary for this scope.

## Native Import Resolution

The historical banner is an embedded 98 x 223 PSB at 300 ppi; the artwork is
an embedded 737 x 921 image at 72 ppi. A 72-ppi PNG directly replacing the PSB
would expand the banner by 300/72. The generated work component carries 300-ppi
metadata, with exact raw-pixel equality against the parent's packed flag.
The parent's source files are not rewritten. The native script verifies size,
bounds and all eight transform coordinates before, after and after reopening.

Failed attempts are preserved intact in `attempts/01-photoshop-layer-autoname/`
and `attempts/02-embedded-resolution/`, including the oversized invalid PNG/PSD.
No failed attempt was published. The successful Liquid gate is `liquid-gate.json`.
