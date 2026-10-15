# Equipements FFIX

Lot demande le 9 octobre 2026 : 8 armes, 5 protections et 5 reliques.
Production terminee pour la version 4.5.61. Aucun changement de famille imprimee, de matrice ou
de statistique native. Un seul emplacement equipe par personnage.

## References

- Noms francais : https://www.rpgsoluce.com/soluces/ps1/ff9/inventaire/armes.htm
- Silhouettes originales : https://shrines.rpgclassics.com/psx/ffix/weapons.shtml
- Save the Queen : https://eu.finalfantasy.com/topics/64
- Pendentif : https://fr.store.square-enix-games.com/final-fantasy-ix-silver-necklace---garnet
- Ruban : https://finalfantasy.fandom.com/wiki/Ribbon_(Final_Fantasy_IX)

Les miniatures de references ne sont ni des illustrations finales ni des
ressources distribuees. Les effets sont des adaptations Kalistar, pas les
effets FFIX d'origine. Les noms personnels de protections, du marteau,
de la plume, du fragment et du manuscrit sont des creations de ce crossover.

## Portee

ARM-034 a ARM-041, PRO-022 a PRO-026 et REL-022 a REL-026.
Les huit armes exigent characterId + famille imprimee. Protections et
reliques exigent characterId seulement, toutes editions compatibles.
Les dix effets ONCE_DEFENSE sont limites a une attribution par partie.
Gastrette reutilise AFTER_SUPPORT avec une seule charge NEXT_DUEL non
cumulable. Les autres armes reutilisent TEAM_STATE ou LAST_STANDING.

Illustrations, objets transparents et anneaux creux restent independants.
Sources generees versionnees, prompts et empreintes a conserver avec ce lot.

## Effets

| Objet | Porteur | Activation et effet |
| --- | --- | --- |
| Orichalque | Djidane / Dague | Inferiorite numerique : +20 ATK |
| Magekane | Vivi / Baton, 3 editions | Deux actifs ou moins : +20 ATK |
| Excalibur | Steiner / Epee longue | Reserve vide : +20 ATK |
| Save the Queen | Beate / Epee longue | Derniere active : +30 ATK |
| Dragonade | Freyja / Lance | Inferiorite numerique : +20 ATK |
| Runigriffe | Tarask / Poing | Deux actifs ou moins : +20 ATK |
| Gastrette | Kweena / Lance | Nouvelle potion : +20 DEF au beneficiaire pour son prochain duel |
| Marteau des Coulisses | Cina / Marteau | Reserve vide : +20 DEF |
| Casque du Serment | Steiner | Premiere defense physique : +30 DEF |
| Chapeau de Vivi | Vivi, 3 editions | Premiere defense magique : +25 DEF |
| Manteau de Bloumecia | Freyja | Premiere elimination alliee : +25 DEF prochaine defense |
| Bandages du Solitaire | Tarask | Premier Block : +25 DEF prochaine defense |
| Bandana des Retrouvailles | Franck | Entree depuis la reserve : +25 DEF prochaine defense |
| Pendentif de Grenat | Grenat / Dagga | Nouvelle potion ou Reraise : +25 DEF au beneficiaire, prochaine defense |
| Ruban de Mog | Eiko | Nouveau Reraise : +30 DEF au beneficiaire, prochaine defense |
| Plume du Dernier Acte | Kuja | Premiere defense avec deux actifs ou moins : +25 DEF |
| Fragment de Terra | Garland | Premier allie entre de reserve pendant sa presence : +25 DEF a cet allie, prochaine defense |
| Manuscrit des Tantalas | Ruby | Nouveau buff physique : +25 DEF au beneficiaire, prochaine defense |

Protections et reliques : une attribution par source par partie. Un soutien
rafraichi ne cree pas de charge. Les bonus d'equipement ne s'additionnent
pas : le plus fort s'applique et les charges concernees sont consommees.
Les faces speciales restent speciales, sans conversion en bonus numerique.
La mise en place initiale ne declenche pas les effets d'entree de reserve.

## Ajouter un objet

1. Ajouter une definition declarative dans site/weapons.js, avec un ID stable
   et des restrictions basees sur characterId (plus famille pour une arme).
2. Reutiliser un trigger documente dans docs/ARMES_EQUIPEES.md. Pour un objet
   defensif ponctuel, definir ONCE_DEFENSE, event, when et recipient.
3. Ajouter un objet, une scene et un anneau creux generes separement ;
   conserver leurs sources et prompts, sans retoucher les cartes natives.
4. Ajouter les trois chemins versionnes a site/weapon-art.js. Le cadre,
   la typographie, les effets et les ancrages sont ceux du rendu existant.
5. Produire les WebP avec un export cible comme build-assets.cjs ; conserver
   les empreintes sources/sorties et verifier l'alpha central de l'anneau.
6. Tester toutes les editions compatibles, l'application moteur et les vues
   petit/grand ecran. Ne jamais utiliser le nom affiche comme cle.

## Verification

516 tests du workflow de publication passes ; 54 controles navigateur sur
le build Pages (18 objets x PC, Razr 50, compact Reduced Motion), sans erreur
de chargement. Captures finales dans `qa-pages/`, rapports dans
`../../releases/2026-10-09-ff9-equipment/verification/`.

54 sources image_gen et 72 exports WebP : les 36 medaillons ont un alpha
verifie, un centre optique [244,242] et un objet entier contenu dans l'anneau.
Le site compile contient 294 cartes natives et 1061 fichiers, pour 723,5 MiB.

L'espace d'activation utilise la hauteur liberee par le porteur deplace
en bas a gauche. Le texte reste dans son cadre a 320 px, sans reduire la police.
Les declenchements DEFENSE indiquent cette defense, non la prochaine.

Les scenarios unitaires FFIX couvrent les restrictions, le remplacement entre
categories, les snapshots, les anciens matchs, les valeurs ATK/DEF et Gastrette.
La suite defensive existante couvre egalement les dix nouveaux objets des
deux cotes, leur consommation et trois matchs complets par objet.

Le test navigateur utilise un contexte et une base IndexedDB jetables :
18 fiches, attribution/remplacement/reload, 18 etats actifs issus d'actions du
moteur avec faces natives, ancrages, inspection, resize et Reduced Motion.
Les conditions TEAM_STATE sont mises en place dans les fixtures visuelles ;
les actions et calculs ne remplacent jamais le moteur.

Commandes :

```powershell
node V4/revisions/2026-10-09-ff9-equipment/build-assets.cjs
node --test --test-isolation=none V4/site/ff9-equipment.test.cjs V4/site/defensive-equipment.test.cjs V4/site/weapon-art.test.cjs
node V4/site/ff9-equipment.browser.test.cjs
```
