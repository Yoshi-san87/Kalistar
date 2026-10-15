# Equipements Castlevania et Kalistar - 11 octobre 2026

Lot additif de 14 objets : 5 armes, 5 protections, 4 reliques.
Chaque objet a une silhouette detouree, une peinture en situation et un anneau
creux personnalise. Le cadre collectible, les ancrages natifs et le moteur
d'equipement existants sont conserves. Aucun PNG/PSD de personnage n'est modifie.

## Castlevania

| Objet | Porteurs | Effet |
| --- | --- | --- |
| Vampire Killer | Trevor Belmont / Simon Belmont, Fouet | +25 ATK, D6 ATK numerique conserve |
| Epee d'Alucard | Alucard, Epee longue | +25 ATK, D6 ATK numerique conserve |
| Dague du Maitre-Forgeur | Isaac, Dague | +20 ATK, D6 ATK numerique conserve |
| Bouclier d'Alucard | Alucard | +25 DEF, D6 DEF numerique conserve |
| Manteau de Styrie | Carmilla | +20 DEF, D6 DEF numerique conserve |
| Robe des Orateurs | Sypha Belnades | +20 DEF, D6 DEF numerique conserve |
| Anneau de Styrie | Hector | Nouvelle garde / Reraise accorde : +25 DEF au beneficiaire, prochaine defense, une fois |
| Souvenir de Lisa | Dracula, ses deux editions | Apres une elimination alliee : +25 DEF a sa prochaine defense, une fois |

Vampire Killer et l'epee/bouclier d'Alucard reprennent leurs identites connues.
Dague, manteau, robe et anneau adaptent des elements visibles dans la serie ;
les noms descriptifs, le lore et les effets sont des adaptations pour Kalistar.
Le Souvenir de Lisa est une creation narrative pour cette collaboration, pas
un objet pretendument canonique. Le bijou evoque Lisa sans ajouter une nouvelle
regle de resurrection. Sypha conserve l'identite orale des Orateurs, sans livre
de sorts invente. L'anneau d'Hector est traite avec le contexte de sa captivite.

References consultees pour l'identite, pas sources d'images copiees :
- https://www.konami.com/games/castlevania/us/en-us/page/history_1997_ps
- https://eu-support.konami.com/hc/en-gb/articles/9649107597463-Attack-Characters
- https://media.netflix.com/en/only-on-netflix/80095241
- https://castlevania.fandom.com/wiki/Isaac_(animated_series)
- https://castlevania.fandom.com/wiki/Sypha_Belnades_(animated_series)
- https://castlevania.fandom.com/wiki/Vampire_Killer_(whip)
- https://castlevania.fandom.com/wiki/Lenore
- https://www.zerochan.net/295015

## Univers Kalistar

| Objet | Porteurs | Effet |
| --- | --- | --- |
| Coeur de Fournaise | Vulkar ET Marteau ; Maudre actuellement | +25 ATK, D6 ATK numerique conserve |
| La Lettre Inachevee | Neriska, Arc | +25 ATK, D6 ATK numerique conserve |
| Harnais des Passerelles | Chroma | +20 DEF, D6 DEF numerique conserve |
| Pelisse du Dernier Col | Grivka | +25 DEF, D6 DEF numerique conserve |
| Balise du Retour | Nestown | Autre allie entre depuis la reserve : +20 DEF au renfort, prochaine defense, une fois |
| La Lampe qui Attend | Nerval | Nouvelle garde / potion accordee : +20 DEF au beneficiaire, prochaine defense, une fois |

Les histoires partent des cartes existantes : la forge de Maudre, le courrier
de Neriska, les passerelles de Chroma, le froid de Grivka, les messagers de
Nestown et la lanterne de Nerval. Les factions partagent leurs protections ou
reliques ; le marteau exige toujours la famille imprimee correspondante.

## Garde-fous

- Schema actuel rulesVersion 2, trois emplacements independants.
- Identifiants characterId stables ; jamais les noms affiches comme cle.
- Restrictions de famille et d'identite/faction combinees par ET.
- Bonus limites a +20/+25. Les armes/protections ne modifient pas une face
  speciale : notamment, le D6 DEF Esquive de Rikka reste une Esquive sans +20.
- Le jet doit etre conserve. D5, relance ou face non numerique ne declenchent
  pas RETAINED_SIX. Le bonus ne change jamais la matrice arme imprimee.
- Reliques via ONCE_DEFENSE et les evenements existants SUPPORT, ALLY_FALL,
  ALLY_DEPLOY. Le deploiement initial n'active pas la Balise du Retour.
- L'allie cible et les charges sont sauvegardes par le moteur. La prochaine
  defense consomme la charge ; aucune recharge en boucle.
- Loadout fige au lancement ; anciens profils et matchs historiques inchanges.
- Les 93 definitions legacy sont comparees a leur fixture historique intacte.

## Production et verification

- art-plan.json : objets et intentions narratives.
- prompts.json et generation.json : prompts exacts et sorties de generation.
- sources natives versionnees dans V4/weapon-cards/sources/.
- build-assets.cjs : conversion reproductible des 42 sources en 56 WebP.
- media-provenance.json : hashes sources/exports, tailles et ancrages.
- Anneaux 488 x 488, centre (244, 242), centre transparent verifie.
- Objets detoures contenus dans le medaillon ; scenes separees du cadre.
- Le premier anneau du Souvenir de Lisa a ete rejete avant publication :
  petites gravures vegetales au lieu d'une repetition de portraits.

Commandes depuis la racine du checkout :

```text
node V4/revisions/2026-10-11-castlevania-kalistar-equipment/build-assets.cjs
node --test V4/site/castlevania-kalistar-equipment.test.cjs
node --test V4/site/weapon-art.test.cjs V4/site/equipment-categories.test.cjs V4/site/equipment-v2.test.cjs
node V4/deploy/build.cjs
node V4/site/castlevania-kalistar-equipment.browser.test.cjs
```

Le test moteur utilise les vraies cartes et faces : deux camps, activation,
consommation, formule, journal, sauvegarde/restauration et 56 parties ABBA.
Le test navigateur utilise une origine et une base IndexedDB isolees. Il couvre
les 14 objets sur PC 1440, Razr 412 et compact 320 px (animations reduites),
attribution/retrait, rechargement, deck, arene, lecteur et redimensionnement.
Captures et resultats sous qa/. Les journaux d'une tentative echouee restent
diagnostiques ; le verdict final est results.json et la validation de release.

Pour ajouter un objet : reprendre une definition declarative existante dans
weapons.js, choisir un nouvel id/numero, verifier les porteurs reels et leurs
faces, enregistrer les trois sources puis une entree weapon-art.js. Ajouter
une preuve media et des tests moteur/navigateur. Ne pas modifier une ancienne
preuve ou les images natives pour contourner un echec.
