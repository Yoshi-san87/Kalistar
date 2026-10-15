# Metal Gear fidelity revision

Artwork-only scope: Major Ocelot 49600114, Raiden 49600102, Naomi 49592640,
Vamp 49600105, Venom Snake 49600115, Otacon 49600103, The Boss 49600107.
New revision; historical evidence and reference hashes are not rewritten.
Publication is deferred to parent coordination. No catalogue writes or Git actions.

Pipeline copied from 2026-09-30-metal-gear-saga: duplicate original native PSD,
replace embedded illustration contents only, reopen and verify. Profile bytes,
all native text style runs, other layers and all pixels outside [80,156,817,1077]
must remain identical. Original creations are untouched during prepare/render/verify.

Official visual references downloaded from Konami:
- https://www.konami.com/mg/history/jp/ja/mgs3
  chara_13.png (short-haired young Ocelot), chara_06.png (The Boss silver suit).
- https://www.konami.com/mg/history/jp/ja/mgs4
  chara_04.png (Raiden forehead/temple and jaw armor), chara_16.png (Vamp
  asymmetric olive top, harness, bare chest, dark trousers, knife gear).
- https://www.konami.com/mg/mgs5/tpp/jp/goods/item_playartskai_ddog.html
  goods_playartskai_ddog_pic1.jpg (grey canine, black sneaking suit, eyepatch).
- https://metalgear.konami.net/manual/mc2/mgs4/ps5/en/page11.html
  comic_11_03.png (miniature scout Mk.II, display mast and compact bipod).
- https://img.konami.com/mg/mc2/s/img/top/book_sample_mgs4_en.pdf
  Official archive sample consulted as additional context.

The Boss opening is the user's requested final-battle neckline variation;
the closed suit in the portal reference is not treated as proof of that opening.
Momo and Valazar are style references only, not costume sources.
Naomi uses a deterministic crop of the existing 1122 x 1402 illustration:
left 170, top 100, width 780, height 975, retaining the face and both hands.
Other edits use individual built-in image generation calls; exact prompts are
recorded in prompts.json, selected results in versioned V4/Illustrations files.

Commands from personal clone: node V4/revisions/2026-10-01-metal-gear-fidelity/revise.cjs prepare,
Windows PowerShell 5 render.ps1 (Photoshop COM .190, 26.11.7), then revise.cjs verify.
