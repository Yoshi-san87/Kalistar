# Theme officiel et introduction anime

## Sources

Musique fournie par l'auteur : Six-Note Motif, 2 min 48,77 s. Le MP3 original
reste intact dans `source/`, empreinte dans `exports.json`. Aucun remix ou
nouveau morceau genere. Les quatre nouvelles prises Runway partent des
keyframes anime approuvees ; prompts et identifiants dans `generation.json`.
336 credits existants consommes ; aucun achat ou changement d'abonnement.

Le film conserve Momo assis a la flute, Kaylis face a son eveil, Voloden devant
la mine et Balmhyr dans le vent avec son ours. Momo revient avant le logo.
Pas de revelation du roman ni modification des illustrations natives.

## Montage

32,5 secondes a 24 fps. Transitions aux images 192, 314, 474, 578 et 689 :
reperes d'attaque et de respiration du morceau, arrondis a l'image. Les plans
s'adaptent au morceau, jamais l'inverse. Les deux portions de Momo proviennent
du meme plan de dix secondes, sans reprise ou repetition.

Exports H264/AAC fast-start : PC 1280x720, portrait 720x1280. Les sources Runway
sont natives 720p ; aucune fausse revendication UHD. Le portrait suit les
visages mobiles de Voloden et Balmhyr. Chaque film reste sous 25 Mio.
Le rebuild `node V4/revisions/2026-11-17-official-score/build-film.cjs`
utilise les sources conservees et FFmpeg, sans depense de generation.

Une copie independante des sources, scripts et exports web est conservee dans
`sauvegardes-personnelles/cinematics/2026-11-17-official-score/`, hors checkout.
Les anciens films et leurs sources sont preserves.

## Integration

Voir [le contrat courant](../../docs/INTRO_CONNEXION.md). Un seul MP3 de menu,
volume doux et commande dans Plus / Mon compte. Aucun son de menu derriere
le film ou le loader. Pause en arene, dans le Gaming Book et en arriere-plan.
Le serveur Atelier declare aussi correctement le type MP4 pour les essais
locaux. Les medias restent prives dans Cloudflare et hors Git.
