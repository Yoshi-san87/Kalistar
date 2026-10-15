# Kalistar 4.6.50 - Collection pedestals

Collection captions are now fixed-height copper plinths: beveled foot,
centered nameplate, faction crest, illustrated copy/version counters and
the existing P1-P5 position identities. The favorite star remains familiar,
with a warm gold state. Existing navigation art and faction flags are reused;
no generated artwork, character PNG, registry or gameplay data was changed.

The 64px caption height and sleeve seal are retained. Width queries use the
actual plinth container, not screen width or the larger pocket. Hover/focus
adds a quiet reflection; no idle animation, canvas, timer or listener is added.
Reduced Motion and forced colors have explicit states.

The collection renderer preserves ownership, version cycling, favorites,
reader navigation and storage callbacks. New rules are isolated in
`site/collection-pedestal.css`, after the shared position stylesheet.
Deployment, LFS settings, Access/redirect and player saves are untouched.

QA covers seven viewports, Razr touch controls, sleeve alignment, contrast,
long names, current-version faction flags, filtering, paging and reload.
Publication evidence and screenshots are under `qa/`.

Validated: 1157 tests in 79 publication commands; built Pages with 363 cards;
Collection in seven formats plus Razr touch, longest names and correct flags;
filters across ten viewports; navigation 46 checks / ten viewports; Pages
collection, reader, download, decks, arena and saved-match regression.
The staged runtime sources are compared byte-for-byte to the tested snapshot.

The snapshot has private, disposable Git metadata so the existing Cloudflare
LFS clone-policy test runs in a real repository. No user repository was
initialized or reconfigured. `.lfsconfig` and the tests from 4.6.49 are unchanged.

Visual proof: [desktop detail](qa/collection/sleeve-detail.png),
[Razr collection](qa/collection/collection-412x1007.png),
[Momo on Razr](qa/collection/pedestal-razr-momo.png).
