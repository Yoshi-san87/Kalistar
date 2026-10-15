# Quatorze nouvelles voix - Kalistar V4

Selection utilisateur du 13 octobre 2026. Quatorze cartes originales, sans
nouvelle regle de combat, nouvelle race ou nouvelle faction.
[Galerie des cartes](index.html).

## Personnages

| Carte | Race | Faction | Role principal | Positions | Cristal | Arme |
| --- | --- | --- | --- | --- | --- | --- |
| KESSARO | MACAKO | Vulkar | P4 | P3, P4 | PYRO | Projectile |
| BORELUNE | BATRA | Woodland | P5 | P3, P5 | HYDRO | Sceptre |
| RASKEL | RATZ | Durane | P5 | P3, P5 | NONE | Instrument |
| PÉRELLE | MICE | Chroma | P2 | P2, P3 | NONE | Dague |
| OSSUM | GOLEM | Durane | P5 | P3, P5 | MINERO | Instrument |
| ORSÉON | AURELION | Solaria | P1 | P1, P3 | LUXO | Lance |
| NÉRÉÏS | SIRENA | Thalassea | P2 | P2, P3 | HYDRO | Epée courte |
| KHARIEL | FALCO | Nestown | P1 | P1, P3 | AERO | Fléau |
| DAME VÉLKRIS | VAMP | Draevenheim | P1 | P1, P3 | HEMATO | Lance |
| SŒUR OSSIANE | SKULLZ | Cryptown | P5 | P3, P5 | NECRO | Tome |
| ELNÈVE | CERELF | Woodland | P5 | P5 | HERBO | Tome |
| AULDRAN | CERELF | Woodland | P1 | P1, P3 | GEO | Masse |
| ITHREK | RHINOZ | Zarok | P4 | P3, P4 | GEO | Projectile |
| KHORNA | RHINOZ | Zarok | P2 | P2, P3 | GEO | Poing |

Identifiants stables : 49902601 a 49902614, dans cet ordre.
Les six propositions non selectionnees ne deviennent pas des cartes.

## Retouches

- Raskel rejoint Durane. La banniere native et son texte correspondent a cette faction.
- Nereis porte une epee-harpon droite. Elle reste dans la famille Epee courte
  pour la matrice existante ; aucune nouvelle mecanique de harpon.
- Soeur Ossiane porte un masque opaque couvrant le bas du visage.
- Auldran tient son bouclier recentre devant le corps, avec le cristal au centre.
- Ithrek possede un lance-flechettes compact integre a sa manche.

Les quatre retouches utilisent le generateur integre image_gen, avec les
illustrations approuvees comme cibles. Les fichiers precedents sont conserves.
Prompts exacts, sources et sorties :
[provenance des retouches](../../propositions/2026-10-13-twenty-new-voices/card-adjustments.json).
Les autres illustrations sont conservees a l'identique. Decors varies et sobres.

## Choix de jeu

Auldran, Khariel, Orseon et Velkris sont des protecteurs P1 ; leurs Gardes ne
sont pas placees systematiquement sur la meme face. Khariel a une esquive,
Velkris une seule Mort, susceptible d'etre arretee par les defenses existantes.

Nereis et Perelle misent sur l'esquive et l'opportunite. Khorna frappe fort,
mais sacrifie une face d'attaque pour donner une puissance physique.
Ithrek est un tireur de precision GEO ; Kessaro convertit une face en potion.

Elneve, Ossiane et Raskel donnent un coeur preventif, pas une resurrection
depuis le cimetiere. Ossum protege ou renforce physiquement ses allies.
Borelune alterne protection et potion. Perelle et Raskel restent NONE :
hexagone eteint, aucune attaque magique, aucune barriere elementaire.
Les supports utilisent exclusivement les effets existants et leurs charges.

Les nombres sont choisis dans les bandes de leur role principal, D6 vers D1.
Le role secondaire P3 n'accorde aucun bonus automatique. Aucun equipement n'est
attribue implicitement et les restrictions Job existantes restent applicables.

## Production et controle

Composants actuels de l'Atelier, texte natif editable, objets dynamiques
incorpores. Format 897 x1497 a300 dpi. Rendu Photoshop26.11.8.
Le manifeste before.json fige les entrees de ce lot et les cartes existantes ;
il ne remplace aucun verrou de reference.

```powershell
node V4/expansions/2026-10-13-fourteen-new-voices/build.cjs game
node V4/expansions/2026-10-13-fourteen-new-voices/build.cjs verify
node --test V4/expansions/2026-10-13-fourteen-new-voices/integration.test.cjs
node V4/expansions/2026-10-13-fourteen-new-voices/verify-gallery.cjs
node V4/expansions/2026-10-13-fourteen-new-voices/browser.test.cjs
```

La verification native controle les composants fixes, la reouverture PSD,
les champs numeriques, le code-barres rendu et les quatre lignes de recit.
Le test d'integration couvre les168 faces, les dons natifs, les barrieres,
deux compositions et40 matchs complets avec sauvegarde/restauration.
Les objets LFS absents en CI sont compares par leur empreinte ; les verifications
de pixels et de PSD sont effectuees localement sur les fichiers natifs complets.
Ces scenarios ne constituent pas une preuve exhaustive d'equilibrage.

Les controles navigateur utilisent des profils jetables, jamais le stockage
personnel : galerie, lecteur Collection, cartes au combat et import d'une
ancienne sauvegarde. Captures dans qa/gallery et qa/game.

