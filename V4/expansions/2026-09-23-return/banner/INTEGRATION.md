# Replicant Banner Contract

Art worker owns only this `banner/` directory and the sibling `arena/`.
Native worker 01a0cd3e-ba16-7e30-b632-d8bd9ee364bb should consume these paths:

- `banner/flag-Replicant-packed.png`: 98 x 223 RGBA, native placement
  `{left:672,top:829,width:98,height:223}`.
- `banner/faction.json`: same schema/hash fields as NieR pilot.
- `banner/flag-Replicant.png`: full 109 x 230 RGBA public-UI raster.
- `banner/flag-source.png`: generated high-resolution source.

The current batch assets.cjs reads flag/faction at batch root. Adjust its paths
to banner/ in the native-owned code, or copy only through an explicit verified
publication step. Art worker will not write those root paths or shared assets.

Same FF7 native outline and exact dest-in alpha clipping as the NieR pilot,
then extract {left:5,top:0,width:98,height:223}; no invented bounding contour.
Separate faction id/label Replicant. Shared character identities for the twins
do not merge faction bonuses: Replicant and NieR stay independent.

Status: generated, visually reviewed at native size and verified. Read
verification.json before composition. Alpha matches the complete native outline
and the approved NieR packed mask at every pixel. All RGBA packed pixels match
the exact crop of the full flag. Repeated renders are byte-identical.

Packed SHA-256: ee380b3c1e886151cef44e9c2cb0203f1f0492d95246d9a43847ee25a39b976b
Full SHA-256: e97d77b787f98aaae448ef6d0181aab4ef8c6f7217a7ab29164ec654c3fc46ec

No agent-messaging tool is available in this worker's tool inventory. This
file supplies the explicit integration contract without editing native-owned
assets.cjs. Parent should relay these completed paths to the native worker.
