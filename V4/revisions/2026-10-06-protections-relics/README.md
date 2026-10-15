# Protections et reliques - 6 octobre 2026

Demande validee le 6 octobre 2026 : ajouter vingt protections et vingt reliques,
avec un seul emplacement d'equipement par personnage, toutes categories
confondues. Les deux objets existants (Rempart de Durane / Pod 042) restent
distincts de ces quarante ajouts. Le libelle visible devient Protections ; la
cle historique `shield` et le slot `weapon` sont conserves pour les sauvegardes.

## Regles

Les nouveaux objets utilisent `ONCE_DEFENSE / NEXT_DEFENSE`, statistique DEF,
valeur 20 a 30, avec un evenement declaratif et un destinataire. Aucune famille
imprimee, face, matrice, vie, initiative ou de de combat n'est modifie.

- `DEFENSE` : premiere defense remplissant les conditions (type d'attaque,
  element adverse, presence d'un allie, effectif du plateau).
- `BLOCK` / `DODGE` : apres un Block ou une esquive, pas dans le duel declencheur.
- `ALLY_FALL` : elimination definitive d'un autre allie actif ; pas Reraise.
- `SUPPORT` : attribution d'une nouvelle charge existante, jamais renouvellement.
- `DEPLOY` / `ALLY_DEPLOY` : remplacement depuis la reserve apres un echange,
  pas placement initial.
- Destinataire `self`, `support`, `deployed` ou `ally` choisi explicitement.
  Le choix manuel bloque Tour suivant, est sauvegarde et est egalement gere
  par l'IA. L'auteur ne peut pas se choisir pour une aide `ally`.

La charge attend la prochaine vraie defense de son destinataire. Attaquer ou
recevoir un soutien ne la depense pas. La charge est consommee meme sur une
face speciale, sans inventer de bonus numerique sur celle-ci. Les relances
conservent les modificateurs captures. Plusieurs equipements ne s'additionnent
pas : seul le plus fort bonus DEF s'applique, mais les charges de cette defense
sont toutes consommees. Aucun rechargement pendant le match.

Le snapshot `equipment.defensive` contient un registre des attributions et des
entrees depuis la reserve, sans nouvelle base ni changement du schema de jeu.
L'absence de ce champ conserve les anciennes parties. Les objets et leurs
conditions sont copies au debut du match comme les armes precedentes.

## Validation

`node --test --test-isolation=none V4/site/defensive-equipment.test.cjs`

126 tests : restrictions reelles, quarante effets dans les deux camps, formule,
consommation, reprise a chaque phase, dons manuels, non-cumul et sauvegardes.
Les scenarios unitaires modifient leurs propres fixtures de faces/positions
pour isoler les declencheurs ; aucun profil de production n'est modifie.
Une seconde passe execute 120 parties completes avec le catalogue INCHANGE,
les decisions IA, relances et restaurations de chaque etape, jusqu'a la fin.
Ces tests ne constituent pas une mesure d'equilibrage competitif.

`node V4/site/defensive-equipment.browser.test.cjs` couvre les 40 fiches et
attributions sur desktop 1440, telephone 412 et compact 320 en Reduced Motion.
Deux vrais combats permettent d'observer OctoCamo et le gilet de Leon dans les
deux camps ; le Sceau du Roi sans Trone teste le choix d'un allie, l'animation,
le rechargement et le nettoyage. Les equipes de test et leur registre IndexedDB
sont isoles du navigateur personnel. Captures finales du site construit et
rapport dans `qa/release/`.

## Direction artistique

Une scene peinte, un objet detoure et un anneau transparent sont generes
SEPAREMENT pour chaque objet. Aucun cadre de personnage ni PNG natif n'est
modifie. Les cadres horizontaux existants restent du DOM avec zones natives.
La scene occupe le cadre de gauche ; l'objet et son cercle restent independants
dans le medaillon tournant du catalogue, du deck et du combat.

Les anneaux reprennent les materiaux de l'objet : acier tactique, nacre, cuir,
maille, bois vivant ou metal patine. Pas d'explosion ni de Canvas par objet.
Les scenes ont un lieu identifiable mais peu de details secondaires.
Les deux originaux Rempart de Durane / Pod 042 ne sont pas regeneres.

`art-plan.json` decrit les intentions et `prompts.json` garde les prompts
exacts, chemins sources et reprises. Les sources PNG versionnees se trouvent
dans `V4/weapon-cards/sources/`. Cinq scenes v2 remplacent leur v1 affichee :
Carapace, Haubert Rhinoz, Boite de Momo, Sceau de Balmhyr et Metal Gear Mk.II.
Cela retire des emblemes de faction inventes, replace Chroma dans son contexte
futuriste et corrige la silhouette du Mk.II. Les v1 restent des essais archives.

Pipeline reproductible :

```powershell
node V4/revisions/2026-10-06-protections-relics/build-assets.cjs
node --test V4/site/weapon-art.test.cjs
```

Le script utilise Sharp (eventuellement via `KALISTAR_NODE_MODULES`), controle
l'alpha des objets/anneaux, puis produit 160 WebP. Le medaillon conserve sa
toile 488 x 488 et son centre optique 244,242. Les scenes et objets grand format
sont limites a 1122 px. `media-provenance.json` trace les hashes SHA-256 et
placements ; les tests comparent tous les fichiers effectivement distribues.

## Ajouter un equipement

1. Ajouter une definition dans `site/weapons.js` avec un ID stable, `kind`,
   restrictions sur IDs/edition/faction/race/job et un effet structure.
2. Pour ce lot, utiliser `ONCE_DEFENSE`, `NEXT_DEFENSE`, DEF 20-30 et un
   evenement pris en charge. Ne pas ajouter de `if(id===...)` au moteur.
3. Preciser le destinataire : `self`, `support`, `deployed` ou `ally`.
   La condition humaine doit decrire exactement l'evenement et ses qualificatifs.
4. Fournir lore court, numero de collection, scene, detourage et anneau.
   Ajouter l'entree correspondante a `weapon-art.js`, sans modifier les frames.
5. Produire les WebP et leur provenance dans une NOUVELLE revision, puis tester
   compatibilite, formule, consommation, reprise, vrais matchs et trois tailles.

Exemple conceptuel (pas une definition du catalogue) :

```js
effect: {
  trigger: 'ONCE_DEFENSE', stat: 'DEF', value: 25,
  duration: 'NEXT_DEFENSE', event: 'DEFENSE',
  when: {attack: 'physical'}, recipient: 'self'
}
```

Les protections ne recoivent pas automatiquement une restriction de famille
d'arme. Les noms affiches ne sont jamais des cles techniques. Une restriction
d'edition se cumule au characterId : Old Snake et Raiden sont limites a MGS4,
Leon a RE4 et le gilet S.T.A.R.S. de Chris a RE1.

## References des collaborations

Les objets sont des reinterpretations peintes pour Kalistar ; leurs effets
DEF sont des creations d'equilibrage Kalistar, pas les regles des jeux d'origine.

- [OctoCamo, manuel officiel MGS4](https://metalgear.konami.net/manual/mc2/mgs4/ps5/en/page09.html)
- [Boite d'infiltration, manuel officiel MGS2](https://metalgear.konami.net/manual/mc1/mgs2/pc/en/page23.html)
- [Metal Gear Mk.II, Master Book officiel](https://img.konami.com/mg/mc2/s/img/top/book_sample_mgs4_en.pdf)
- [Reference visuelle du Mk.II](https://www.pngkey.com/png/detail/441-4415992_otacon-mgs4-metal-gear-mk-ii.png)
- [Pods 042 et 153, site officiel NieR](https://nierautomata-anime.com/character/detail/?chara=pod)
- [Larme lunaire, Square Enix](https://na.store.square-enix-games.com/nier-gestalt_replicant-silver-necklace-lunar-tear)
- [Medaille de Yennefer, CD Projekt Red](https://gear.cdprojektred.com/products/the-witcher-yennefer-medallion-with-box)
- [Equipement de sorceleur, supplement sous licence](https://rtalsoriangames.com/wp-content/uploads/2022/04/RTG-WI-DLC-WitchersTools.pdf)
- [Gilet de Leon, reference secondaire](https://residentevil.fandom.com/wiki/Body_Armor)
- [Log Pose, reference secondaire](https://onepiece.fandom.com/wiki/Log_Pose)
- [Rumble Ball, One Piece officiel](https://one-piece.com/anime/290/index.html)
- [Tidus et embleme des Abes, reference secondaire](https://finalfantasy.fandom.com/wiki/Tidus)

Les autres objets identifiables sont notamment la Materia blanche d'Aeris,
Griever de Squall, la gourde et le manteau d'Auron, la cape de Vincent, les
crochets de Jill, le chapeau de Luffy et la reserve de cola de Franky.
