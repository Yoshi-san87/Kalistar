# Chrono Trigger : six armes signatures

Lot additif du 11 octobre 2026. Aucun changement du moteur, des cartes natives,
des familles imprimees, de la matrice ou des sauvegardes historiques.

## Collection

| Numero | Arme | Porteur | Famille imprimee | Bonus |
| --- | --- | --- | --- | --- |
| ARM-051 | Rainbow | crono | Katana | +25 ATK |
| ARM-052 | Arc Valkyrie | marle | Arc | +20 ATK |
| ARM-053 | Wondershot | lucca | Gun | +25 ATK |
| ARM-054 | Masamune | frog | Epée longue | +25 ATK |
| ARM-055 | Bras Tératon | robo | Poing | +20 ATK |
| ARM-056 | Faux du Désespoir | magus | Faucille | +25 ATK |

Les restrictions combinent le characterId stable ET la famille imprimee.
Ayla reste a mains nues : Bronze Fist est une evolution de ses poings dans
Chrono Trigger, pas un gantelet physique a inventer pour cette collection.

## Regles

Les six armes utilisent le contrat V4.6 existant : `RETAINED_SIX`, ATK,
`DUEL`. Le bonus ne s'applique qu'au 6 ATK numerique conserve, apres la
decision Kalistel. Un 6 abandonne, un D5 ou une face speciale ne le donne pas.
La face Mort de Magus reste speciale. Aucun critique, multiplicateur,
degat variable, bonus de dernier survivant ou effet original de Chrono
Trigger n'est importe dans Kalistar. Les +20/+25 suivent la plage des
equipements actuels ; les simulations verifient le fonctionnement, pas une
garantie d'equilibrage competitif.

Profile, composition et rencontre conservent leurs equipements independamment.
Arme inactive en arene : objet au repos ; active : anneau tournant et bonus
nomme dans le calcul. Inspection du deck : objet equipe ; inspection de
l'arene : etat actif uniquement, selon le contrat actuel.

## Images et sources

Generation par l'outil integre `image_gen`, une image par objet, scene et
anneau. 18 sources finales independantes, aucune planche decoupee. Les scenes
reprennent uniquement leur propre objet et Momo comme reference de peinture.
La premiere scene Rainbow, trop photographique, a ete ecartee puis remplacee.
Les dessins sont des adaptations Kalistar, pas des reproductions certifiees
de modeles 3D officiels. Les noms francais descriptifs Tératon / Désespoir
servent de presentation ; les sources anglaises restent documentees.

- [Rainbow](https://www.chronowiki.org/wiki/Rainbow) : Crono, katana et origine solaire.
- [Valkyrie Bow](https://www.chronowiki.org/wiki/Valkyrie_Bow) : Marle, arc long.
- [Wondershot](https://www.chronowiki.org/wiki/Wondershot) : Lucca, Pierre du Soleil.
- [Masamune](https://www.chronowiki.org/wiki/Masamune) : Frog, Melchior et Cyrus.
- [Teraton Arm](https://www.chronowiki.org/wiki/Teraton_Arm) : bras de Robo.
- [Doom Scythe](https://www.chronowiki.org/wiki/Doom_Scythe) : faux de Magus.
- [Bronze Fist](https://www.chronowiki.org/wiki/Bronze_Fist) : poings innés d'Ayla.

Sources raster : `../../weapon-cards/sources/chrono-*-v1.png`.
Prompts exacts et references : `prompts.json`, `generation.json`.
`media-provenance.json` identifie par SHA-256 les 18 sources et 24 exports.
Les medaillons restent sur la toile native 488px, centre 244/242. Les sources
natives des personnages et les verrous approuves ne sont pas modifies.

## Validation

- `node --test V4/site/chrono-equipment.test.cjs` : six compatibilites,
  activation et calcul reel des deux cotes, journal, expiration, reload,
  profils, snapshots et 24 parties ABBA completes.
- `node --test V4/site/equipment-v2.test.cjs V4/site/equipment-categories.test.cjs V4/site/weapon-art.test.cjs` :
  regression complete des contrats, des archives et des medias.
- `node V4/site/chrono-equipment.browser.test.cjs` apres build :
  PC 1440x1000, Razr 412x1007, compact 320x740 avec Reduced Motion ;
  equipement, retrait, reload, deck, adversaire, duel, inspection, resize,
  anneaux, images chargees et absence de debordement.
- Captures dans `qa/`, toutes issues d'un navigateur isole sans donnees personnelles.

Pour ajouter une arme : definition moderne apres les archives dans
`site/weapons.js`, identite graphique dans `site/weapon-art.js`, trois sources
individuelles, generation des exports avec `build-assets.cjs`, puis les memes
tests. Le numero ARM doit etre unique et la famille correspondre a la carte.
