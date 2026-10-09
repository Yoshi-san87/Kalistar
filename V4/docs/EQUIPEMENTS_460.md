# Equipements 4.6.0

Decision utilisateur du 9 octobre 2026. Ce document et REGLES_JEU.md priment
sur les descriptions historiques de l'emplacement partage dans ARMES_EQUIPEES.md.
Les personnages natifs, leurs identifiants, illustrations, faces et vingt
familles d'armes ne changent pas.

## Trois Emplacements

```js
{ id: 'user-paris', version: 2, slots: {
  weapon: { balmhyr: 'fallen-king-axe' },
  shield: { balmhyr: 'durane-rampart' },
  relic: { balmhyr: 'exiled-king-seal', momo: 'little-joys-flute' }
} }
```

`shield` est la cle stable des protections, y compris manteaux, armures et
gantelets. Un personnage peut porter les trois objets simultanement, mais
jamais deux de la meme categorie. Un ID d'objet n'a qu'un porteur par loadout.
Les restrictions restent des listes OU combinees par ET : characterIds,
jobs, families, factions, races. Les armes exigent la famille imprimee.
L'edition choisie doit etre compatible, pas seulement une autre edition.

Le champ `composition.equipment` contient les trois cartes de correspondance
ci-dessus, sans l'enveloppe profil. IndexedDB conserve le store `equipment`
existant. Les importations sont validees avant transaction ; les confirmations
verifient l'ancien objet du meme emplacement et le profil complet attendu.
Remplacer une protection ne retire ni l'arme ni la relique.

## Regles Et Captures

Une arme utilise `{trigger:'RETAINED_SIX',stat:'ATK',value:30,duration:'DUEL'}` ;
une protection utilise le meme effet avec `stat:'DEF'`. Valeurs entieres de
1 a 40, valeurs actuelles conservees de 15 a 30. Seul un 6 numerique compte.
ATK attend l'acceptation Kalistel ; DEF se recalcule a chaque essai.
La condition ne remplace jamais magie, barriere ou famille imprimee.
L'interface signale et interdit une nouvelle attribution directe sur une
edition dont la face 6 correspondante n'est pas numerique. Dans l'arsenal,
une edition compatible avec un 6 numerique est privilegiee si elle existe.
Un ancien objet deja porte peut toujours etre retire ; les restrictions et
les faces natives ne sont jamais assouplies pour rendre son bonus possible.

Les reliques conservent leurs effets declaratifs et charges. Le bonus direct
de l'emplacement ATK/DEF s'ajoute au meilleur bonus de relique applicable ;
plusieurs cadeaux de reliques ne s'additionnent pas. Les origines sont
distinctes dans le recap, le journal et la formule.

Les nouveaux matchs ont `equipment.version:2`, une copie des definitions,
deux loadouts a trois emplacements et leurs etats temporaires. Le schema de
partie reste 6, l'edition V4. `duel.equipment.attack/defense` gardent les
contributions de reliques ; `weapon/protection` contiennent les contributions
directes. Les formules gardent les totaux `equipmentAttack/equipmentDefense`,
les termes `equipmentWeapon/equipmentProtection` et `equipmentDefenseDie`.
Ce dernier conserve la provenance du bonus lors d'une defense echouee puis
relancee. Un ancien essai n'emprunte pas le bonus du nouvel essai.

Les nouveaux objets ont `rulesVersion:2` et `slot` egal a leur categorie.
Les anciennes definitions sans cette revision restent valides uniquement
dans un snapshot historique version 1. `catalogue.legacyWeapons` est preserve
pour le contrat technique ancien avec loadouts plats ; l'interface lance
toujours des compositions migrees. Aucun changement retroactif des parties.

## Migration Du Catalogue

Les armes passent de leurs anciennes conditions a ATK 6, y compris celles
qui donnaient DEF ou un cadeau. Les protections passent toutes a DEF 6,
sans charge a usage unique. Valeurs, IDs, visuels et restrictions restent
conserves. La Flute de Momo devient une relique pour preserver son soutien,
sa personnalite et son bonus DEF transmissible. Ses assets/ID sont inchanges.
Les autres reliques conservent leur mecanique. Le catalogue reste a 93 objets.
Le tableau avant/apres et les controles sont dans la revision associee.

Un profil version 1 ou un deck a loadout plat est lu avec ses restrictions
historiques, puis chaque objet est range dans sa categorie actuelle.
Seules les anciennes attributions explicitement retirees par une revision
de compatibilite sont retirees ; inconnus, doublons, categories incorrectes
et porteurs invalides sont refuses. Migration pure, repetable et atomique.
Les possessions, capitaines, formations et rencontres ne sont pas reinitialises.

## Ajouter Un Objet

1. Ajouter dans `site/weapons.js` un ID unique, un nom, un visuel et les
   restrictions stables. Conserver `slot:'weapon'|'shield'|'relic'` et
   `rulesVersion:2`. Ne jamais utiliser un nom affiche comme cle.
2. Arme/protection : declarer `RETAINED_SIX` avec la statistique correspondante
   et `duration:'DUEL'`. Relique : reutiliser un effet conditionnel existant,
   avec sa duree, son evenement et son destinataire explicites.
3. Fournir les sources/exports du pipeline `weapon-cards/` et l'entree
   `weapon-art.js`. Aucun export de personnage n'est modifie. Le meme art
   sert a la fiche, au recap et a l'animation d'utilisation.
4. Tester compatibilite, profil, composition, snapshot, calcul, relance,
   expiration, reprise, ecran petit/grand et Reduced Motion. Un nouveau
   trigger demande une regle pure et des tests ; pas de branchement par ID
   dans le moteur ou l'interface.

## Presentation

Arme : cible entre ATK 6 et 5. Protection : glyphe entre DEF 6 et 5.
Relique : medaillon imprime historique en bas. Les ancres sont exprimees
dans le template natif, puis projetees avec le crop et l'image reellement
dessinee, y compris zoom, focus et popup contenue. Aucune position d'ecran
fixe. En arene, les cercles arme/protection portes restent visibles au repos,
sans rotation ni languette de bonus. Leur diametre natif est 106 au lieu de
86, centre sur les memes glyphes asymetriques ; l'inspection d'arene reprend
exactement cet etat. Seule une activation reelle lance le radar et sa rotation.
La fin du bonus arrete le mecanisme sans retirer l'objet. Les bonus chiffres
restent dans le panneau central et le journal. La relique garde son apparition
conditionnelle historique. La composition et son inspection ne changent pas.

Activation mecanique, rotation radar synchronisee au 6, impulsion d'usage,
retour inverse, et transfert doux des reliques. La protection contribue et
s'anime meme si le score DEF reste insuffisant. Seul un Block avec protection
utilisee remplace le bouclier generique. Les animations sont annulees a la
navigation, au changement de duel et a la fermeture ; aucun Canvas permanent.
