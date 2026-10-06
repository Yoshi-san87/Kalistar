# Quinze nouveaux visages de Kalistar

Selection utilisateur du 6 octobre 2026 parmi les vingt propositions.
Les cinq autres restent des propositions locales, sans entree au catalogue :
Kharza, Talune, Ivor, Rozh, Delys. Aucune carte precedente n'est supprimee.

## Illustrations retenues

Les illustrations sont produites separement du template natif. Le grain
pictural de Momo et Valazar reste la reference ; Sareth a aussi ete comparee
a Aelis. Douze illustrations sont conservees a l'identique.

- Ysane devient **Dame Ysane** ; son identifiant stable reste `ysane-kalistar`.
- Bex : suppression des grands batiments lointains et telepheriques, avec
  conservation du sourire, de la lampe et du bras mecanique.
- Pelag : bottes sombres a Kalistel Hydro bleu, d'apres Brask ; l'une est
  pleinement visible et l'autre partiellement masquee par sa pose accroupie.
- Vaume : demande de "split horizontal" interpretee comme un miroir
  gauche/droite. Edition generative tres proche, pas une symetrie pixel exacte.

Les originaux `Faces_*_01.png`, les trois editions `_02.png`, leurs prompts
et empreintes sont conserves. `art-selection.json` relie chaque carte a la
source retenue. Aucun drapeau de faction n'est invente dans le cadre natif.

## Profils jouables

| Carte | Role principal | Intention |
| --- | --- | --- |
| Oskara | P1 | Protection et sauvetage, garde |
| Nell | P5 | Soutien du receveur, garde et relance |
| Sareth | P4 | Lumiere et jugement, trois faces magiques |
| Daska | P3 | Mecanicienne robuste, soutien physique |
| Orel | P2 | Precision du serrurier, esquive |
| Dame Ysane | P2 | Aiguilles de sang, attaque et esquive |
| Sivel | P5 | Conservation et retour, mana/relance/reraise |
| Maudre | P1 | Maitrise du four, garde et barrieres |
| Nacre | P1 | Protection des plongeurs, garde Hydro |
| Bex | P3 | Courant reparateur, soutien mana |
| Hadruk | P5 | Entraineur, force/garde/relance |
| Sovan | P3 | Exploration, profil polyvalent |
| Ombrine | P4 | Cloche Necro, magie et mana sans Mort |
| Pelag | P4 | Harpon et Hydro, combattant a distance |
| Vaume | P5 | Apothicaire, mana/relance/reraise |

Identifiants `49900701` a `49900715`. Valeurs numeriques differenciees dans
les bornes V3 de chaque role ; aucune nouvelle mecanique, aucun bonus cache,
aucune modification du moteur ou de la matrice des armes. Les descriptions
prolongent les scenes des illustrations, sans reecrire l'histoire des heros.
Les deux decks de QA sont des fixtures, pas des presets installes au joueur.
Ces controles assurent la conformite aux regles, pas un equilibrage competitif
definitif garanti par seulement 24 matchs.

## Production et controle

897 x 1497 px, 300 dpi, cadre V4 valide, texte natif editable, composants en
objets dynamiques. Photoshop 26.11.8, calibre contre les references existantes.
Les 177 creations preexistantes et les sources protegees sont figees avant
preparation dans leurs manifests ; ces manifests ne sont jamais reinitialises.

```powershell
node V4/expansions/2026-10-06-fifteen-faces/verify-current.cjs
node --test --test-isolation=none V4/expansions/2026-10-06-fifteen-faces/integration.test.cjs V4/expansions/2026-10-06-fifteen-faces/accent-typography.test.cjs
node V4/expansions/2026-10-06-fifteen-faces/browser.test.cjs
```

`build.cjs verify` est conserve avec ses dependances d'origine : sa regle
historique de hauteur d'encre 25-35 px rejette le E accentue de PELAG (39 px).
Le verificateur courant conserve tous les controles natifs, le corps exact
10 pt et la police Times New Roman, et verifie l'encre complete dans l'inset
du titre. Seules les capitales accentuees ont un budget de hauteur adapte.
Les noms sans accent passent aussi le controle historique. Les tests de
mutation refusent agrandissement, debordement, decalage et faux accent.
Aucun ancien rapport, verrou, PNG ou PSD protege n'a ete modifie pour cela.

Publication additive via `publish.cjs`, apres verification de preparation,
hashes, typographie, cadrage, code-barres et reouverture PSD. La verification
du jeu parcourt 90 faces ATK et 90 faces DEF, puis 24 matchs ABBA avec les
deux camps, effets de soutien, remplacements et reprises JSON repetees.

La galerie `galerie.html` ouvre les PNG et PSD individuels ; `vue-ensemble.jpg`
montre les quinze cartes. Les captures du site sont sous `browser-proof/`.
