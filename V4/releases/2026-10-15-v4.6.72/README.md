# Kalistar 4.6.72

## Perimetre

Dix cartes Tortues Ninja, identifiants 49902901 a 49902910 : Leonardo, Raphael,
Donatello, Michelangelo, Shredder, Krang, Bebop, Rocksteady, April O'Neil et
Maitre Splinter. Shredder est entierement regenere en garde dans un dojo ;
April et Michelangelo utilisent leurs nouvelles scenes.

Nouvelle collection TMNT et banniere, race Facoche demandee pour Bebop,
Tortuga pour les quatre freres. Rhinoz, Ratz, Humain et Cyborg reutilises.
Tous possedent un Kalistel. Aucun changement du moteur, des matchups,
des anciennes cartes, des equipements ou des sauvegardes personnelles.

Profils, motivations et preuves : [lot natif](../../expansions/2026-10-15-tortues-ninja/README.md).
Prompts : [revisions artistiques](../../propositions/2026-10-15-tortues-ninja/revision-02.json).

## Verification

- Dix PSD natifs editables, 897 x 1497 : cadre fixe identique, reouverture
  identique, code-barres lu, accents et description sur quatre lignes maximum.
- 120 faces ATK/DEF dans le moteur, soutiens, journaux, barrieres magiques,
  positions et dix matchs ABBA termines avec reprises intermediaires.
- Galerie : 1920, 1440, 800, 412 et 320 px, filtres, clavier et Reduced Motion.
- Jeu : lecteurs des dix cartes, desktop/Razr/320 px, duel des deux camps,
  reload et import d'une sauvegarde anterieure. Dix cartes ajoutees sans perte.
- Parcours general : Collection, telechargement PNG, Decks, Arene, plein ecran,
  reprise et publication additive sur desktop et telephone.

La suite locale Atelier a passe ses dix invocations. Les 88 commandes de la
suite generale passent : 1300 tests node:test reussis, zero echec, un test
navigateur optionnel de reliques ignore par son garde existant. Les tests
navigateur de ce lot et le parcours deploy ont ete executes separement.
La validation utilise le runtime Node du poste et `CF_PAGES=1`, cible active.
Les premiers lancements sans ce contexte ont signale le module marked et le
budget historique GitHub ; les garde-fous n'ont pas ete modifies.
Les assertions de version desktop et mobile sont synchronisees en 4.6.72.

## Sources et livraison

Sauvegarde verifiee hors checkout :
`Kalistar/maintenance/private-backups/2026-10-15-tmnt-v4.6.72/`,
446 fichiers, 466404090 octets avec manifeste SHA-256.
Les PNG/PSD restent sur le PC ; Git contient profils, scripts et empreintes.
Le registre public ajoute seulement dix cartes et trois assets web.

Build local : 434 cartes, 1443 assets, 972.9 Mio. Limites Cloudflare conservees.
Publication prevue depuis le commit exact tague v4.6.72 via prepare:release,
puis verification du build fige et envoi au projet personnel `kalistar`.
Preuves de navigateur et journaux complets : `work/qa/tmnt-*` ; le rapport
de preparation et le resultat Cloudflare restent dans `work/publication/`.
