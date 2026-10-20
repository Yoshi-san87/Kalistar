# Kalistar 4.6.98

20 octobre 2026. Publication coordonnee apres 4.6.97
`c316af0c35939e3bd445245f1f63167456488db3`. Perimetre : les deux
cartes de Riko, anciennement propose sous le nom Orilo.

## Contenu

- `49903201` : Riko, L'horizon dans la poche, Navigateur, P3/P5 (principal P5).
- `49903202` : Riko, Des ailes autrement, Pilote, P3/P4 (principal P3).
- Identite commune `riko-kalistar`, KORBOW, Nestown, AERO.
- Deux illustrations retouchees avec les references peintes Momo/Valazar,
  puis composees dans le cadre natif, jamais regenere.
- Catalogue passe de 444 a 446 modeles. Aucun ancien profil, matrice, regle,
  equipement, preset, schema de sauvegarde ou roman modifie.
- Les autres rencontres proposees pour Kaylis restent locales et non validees.

[Dossier natif et choix de jeu](../../expansions/2026-10-20-riko/README.md).

## Verification Avant Publication

- Composition Photoshop sequentielle ; cadre fixe : zero difference.
- PSD reouverts : zero pixel different ; code-barres de chaque carte valide.
- Textes editables, quatre lignes de description, chiffres et icones verifies.
- Controle visuel des deux cartes natives, variantes 300px, Collection mobile
  et duel PC ; les scenes et regards restent distincts.
- Tests Riko : 8 reussis, dont chaque face ATK/DEF, soutiens, barrieres,
  journal, reprises et deux rencontres ABBA completes. Les deux versions
  sont regroupees et leur presence simultanee dans un deck est interdite.
- Suite `ci` complete : 97 invocations terminees avec succes.
- Suite `local` : 13 invocations terminees avec succes, bases ephemeres.
- Suite `repository` et `npm run check` apres staging explicite : succes.
- Build Cloudflare : 446 cartes, 1509 fichiers listes, environ 1071.8 Mio.
  Limites de fichier et nombre de fichiers respectees.
- Galerie : 1440, 412 (Razr), 320px, acces aux PNG/PSD et focus clavier.
- Site : deux lecteurs natifs a 1440/412/320px, empreintes des images servies,
  groupement des versions, migration additive, duel et reload PC/Razr.
- Test navigateur deploy general : Collection, telechargement PNG, Decks,
  Arene et sauvegarde PC/mobile, sans erreur HTTP ou JavaScript.

Les logs/captures sont conserves sous `work/qa/riko/`. Le rapport de preparation
et les controles post-commit restent sous `work/publication/` et `work/qa/riko/`,
sans nouveau commit au meme numero de version.

Incidents resolus sans affaiblir les controles : le pont COM Photoshop exigeait
une execution hors confinement ; le premier lancement de la suite ne trouvait
pas `marked` sans `KALISTAR_NODE_MODULES` ; deux assertions regex de version
avaient encore 4.6.97. Le build sans `CF_PAGES=1` applique normalement l'ancienne
limite GitHub de 900 Mio. La variable Cloudflare est reservee au build, pas a la
suite qui verifie aussi le plan de publication historique. Les essais echoues
ont leurs logs ; aucun verrou ou ancien rapport n'a ete recrit.

## Sources Et Livraison

Sauvegarde privee hors checkout :
`sauvegardes-personnelles/creation/2026-10-20-riko/`.
99 fichiers, 95 322 942 octets, copies et SHA-256 verifies avant publication.
Elle contient illustrations, PSD, PNG, profils, composants et preuves natives.
Les images et PSD ne sont pas ajoutes a Git ; seules les sources texte et les
empreintes des deux nouveaux PNG publics sont versionnees.

Livraison : commit cible, tag annote `v4.6.98`, push atomique de `main` et de
ce seul tag, build exact par `prepare-release.cjs`, validation de cette sortie
puis publication sur le projet Cloudflare personnel `kalistar`.
Les changements de compte en preparation dans un autre chat sont exclus.
Le site conserve l'origine et les donnees des joueurs. Une publication de
modele ne cree pas automatiquement une possession sur le registre en ligne.
