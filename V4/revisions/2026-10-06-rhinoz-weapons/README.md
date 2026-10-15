# La Corne des Anciens

Demande : une hache identitaire pour les Rhinoz, dont la lame evoque une corne.
La silhouette retenue est une large corne forgee en acier gris ivoire,
avec embase rappelant un front cuirasse, cuivre patine et manche droit.
Le detourage v1 en croissant a ete remplace par le v2 a une pointe dominante.

## Integration

- ARM-033 ; rhinoz-ancestral-horn ; Hache ; art rhinoz-ancestral-horn-v2.
- Restriction declarative races: ['RHINOZ'], sans restriction de faction/job.
- Porteurs actuels : Belrog, Gilmarr, Nazar.
- +20 ATK numerique tant que les allies actifs sont moins nombreux que les ennemis.
- Une seule arme ; aucune modification des familles imprimees ou de la Garde D2.
- Aucun changement des cartes natives, des cadres ou de la base de sauvegarde.

Le nouveau critere races est valide par equipment.js et lu par les fiches.
Les anciennes restrictions et snapshots ne changent pas de sens.
L'effet reutilise TEAM_STATE / WHILE_TRUE sans nouveau comportement de combat.
Le +20 est conditionnel, pas une garantie d'equilibrage competitif.

## Art

Quatre generations via image_gen integre : deux detourages (v2 retenu),
une scene de montagne et un anneau cuivre/pierre avec motifs de corne.
Sources selectionnees : ../../weapon-cards/sources/rhinoz-ancestral-horn-*.png.
Prompts complets : ../../weapon-cards/rhinoz-prompts-2026-10-06.json.
Derives et empreintes dans ../../weapon-cards/media-provenance.json.

## Verification

Six tests specifiques : restriction exacte, tableaux invalides, combinaison
race/job/faction/famille, remplacement, transfert, sauvegardes, snapshots,
anciens matchs sans equipement, 12 duels physiques/magiques dans les deux camps
et Garde D2 des trois Rhinoz. L'arsenal teste egalement les matchs complets.

Trois parcours navigateur : desktop, Razr 50 et compact Reduced Motion.
Remplacement de la lance de Nazar, desequipement, reload, deck/inspection,
arme inactive/active, adversaire, resize, ancrage et vrais bonus moteur.
Les 45 controles du layout couvrent 33 cartes et six tailles d'interface.
Captures dans browser/ et layout/ ; stockage QA jetable uniquement.
