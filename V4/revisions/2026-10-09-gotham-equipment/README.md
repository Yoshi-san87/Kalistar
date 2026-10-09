# Gotham : équipements Batman

## Lot intégré

Douze objets : quatre armes, trois protections et cinq reliques. Chaque objet
possède une illustration détourée, une scène peinte et un anneau ajouré propres.
Les fonds restent simples ; aucune image n'est partagée entre deux équipements.
Génération par l'outil intégré ImageGen, puis export déterministe Sharp.
Les noms narratifs et les effets sont des adaptations Kalistar, pas des noms
officiels garantis de l'univers DC.

| Objet | Identité stable | Catégorie | Bonus | Condition |
| --- | --- | --- | --- | --- |
| Fouet de Selina | catwoman-batman | Arme | +20 ATK | Jet ATK 6 numérique conservé : +20 ATK pour ce duel. |
| Fusil Cryogénique | mr-freeze-batman | Arme | +25 ATK | Jet ATK 6 numérique conservé : +25 ATK pour ce duel. |
| Lame de la Ligue | ras-al-ghul-batman | Arme | +25 ATK | Jet ATK 6 numérique conservé : +25 ATK pour ce duel. |
| Parapluie de l'Iceberg | pingouin-batman | Arme | +20 ATK | Jet ATK 6 numérique conservé : +20 ATK pour ce duel. |
| Scaphandre Cryogénique | mr-freeze-batman | Protection | +30 DEF | Jet DEF 6 numérique conservé : +30 DEF pour ce duel. |
| Lunettes de Selina | catwoman-batman | Protection | +20 DEF | Jet DEF 6 numérique conservé : +20 DEF pour ce duel. |
| Masque de l'Épouvantail | epouvantail-batman | Protection | +25 DEF | Jet DEF 6 numérique conservé : +25 DEF pour ce duel. |
| La Pièce de Harvey | double-face-batman | Relique | +20 DEF | Première défense physique. |
| Le Dernier Point d'Interrogation | sphinx-batman | Relique | +20 DEF | Après un nouveau buff physique accordé. |
| La Dernière Graine | poison-ivy-batman | Relique | +25 DEF | Après une nouvelle potion ou un Reraise. |
| Ceinture de la Dernière Issue | batman-batman | Relique | +20 DEF | Après une nouvelle garde accordée. |
| Mémoire de Lazare | ras-al-ghul-batman | Relique | +25 DEF | Après une élimination alliée. |

## Règles

- Conserve les règles V4.6 : trois emplacements indépendants, Arme / Protection /
  Relique. Aucun nouveau mécanisme de poison, gel, peur ou résurrection.
- Armes : bonus seulement sur le D6 ATK numérique conservé.
- Protections : bonus seulement sur le D6 DEF numérique conservé.
- Reliques : une charge défensive par partie, pour la prochaine défense du
  bénéficiaire. Les attaques et aides reçues ne consomment pas cette charge.
  Plusieurs reliques ne cumulent pas leurs valeurs : le moteur existant choisit
  la plus forte, puis consomme les charges concernées.
- Les aides du Sphinx, d'Ivy et de Batman exigent réellement un nouveau buff
  physique, une potion / un Reraise, ou une garde. Pas de déclenchement sur
  une tentative qui ne donne rien.
- Mémoire de Lazare n'accorde aucune résurrection. Une élimination alliée prépare
  simplement +25 DEF pour Ra's, une seule fois.
- Toutes les restrictions utilisent characterId. Les armes exigent aussi la
  famille imprimée de la carte. Le matchup d'armes n'est jamais remplacé.
- Aucune carte native, valeur ATK/DEF, matrice, faction ou profil PSD n'est modifié.

## Compatibilité et données

Les entrées sont ajoutées après la copie des définitions historiques dans
`site/weapons.js`. Les 93 définitions legacy sont inchangées ; les nouvelles
parties utilisent désormais 105 définitions modernes.
L'ancien plafond de validation de 100 définitions empêchait de commencer une
partie. Il est porté à 512, avec maintien de tous les contrôles individuels,
d'unicité, de slots et d'intégrité du snapshot. Un test rejette les doublons et
un snapshot de 513 entrées. Aucun numéro de schéma de sauvegarde ne change.

Les créations suivantes suivent simplement les structures déjà déclaratives :
`RETAINED_SIX` pour arme/protection et `ONCE_DEFENSE` pour relique.
Le manifeste `site/weapon-art.js` associe le même objet, la même scène et le même
anneau aux vues collection, popup, deck et arène.

## Sources et génération

- `art-plan.json` : plan artistique initial, y compris deux propositions exclues.
- `definitions-draft.json` : brouillon initial, pas une source runtime.
- `selection.json` : liste exacte des 12 objets livrés et des 3 exclusions.
- `generation.json` : prompts complets, références, sorties originales et refus.
- `build-assets.cjs` : export WebP déterministe, contrôle alpha et centre ajouré.
- `media-provenance.json` : hashes des 36 PNG sources et des 48 WebP distribués.
- Sources : `V4/weapon-cards/sources/gotham-*.png`.
- Cartes : `V4/site/assets/weapon-cards/gotham-*.webp`.
- Objets et anneaux : `V4/site/assets/equipment/gotham-*.webp`.

Le Batarang, la Canne du Dernier Rire et l'Armure du Chevalier Noir n'ont pas
été intégrés : l'outil a refusé leur génération. Aucun contournement, nouvelle
tentative reformulée ni image factice n'a été utilisé.

Références DC consultées pour les objets reconnaissables :
[Batman](https://www.dc.com/characters/batman),
[Mister Freeze](https://www.dc.com/characters/mister-freeze),
[Penguin](https://www.dc.com/characters/penguin),
[Two-Face](https://www.dc.com/characters/two-face),
[Catwoman](https://www.dc.com/characters/catwoman),
[Scarecrow](https://www.dc.com/characters/scarecrow),
[Ra's al Ghul](https://www.dc.com/characters/ras-al-ghul).
Le fouet et les lunettes de Selina sont aussi documentés dans les articles DC
[historique de Catwoman](https://www.dc.com/blog/2020/04/17/purrfect-history-twelve-moments-that-defined-catwoman)
et [costume](https://www.dc.com/blog/2018/05/21/exclusive-get-a-sneak-peek-at-catwomans-new-costume).
Les capsules, coffrets et traitements Kalistar sont des créations adaptées.

## Validation

`site/gotham-equipment.test.cjs` vérifie les 12 objets sur les faces natives,
des deux côtés, les restrictions stables, les calculs, journaux, sauvegardes,
l'expiration et 16 matchs ABBA complets. Les scénarios ne réécrivent aucune stat.
Le test V4.6 général couvre également chaque nouvelle arme/protection en D5/D6,
les relais de soutien, les retries, Kalistel et les anciennes sauvegardes.

`site/gotham-equipment.browser.test.cjs` contrôle les popups, porteurs, équipement,
retrait, reload, géométrie des anneaux en arène et popup, resize, nettoyage et
Reduced Motion sur PC, Razr et 320 px. Captures de la publication dans `qa-release/`.
Les sorties de validation de publication sont conservées dans le dossier release.
