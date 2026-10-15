# Balmhyr - Le poids du retour

Revision approuvee le 6 octobre 2026, modele `49900802`, identite `balmhyr`.
La seconde edition est corrigee, pas dupliquee. La premiere edition Hache
`30000007` et 2B `49900801` restent strictement conservees.

## Perimetre

- Illustration validee : marche dans les couloirs de Durane, tenue gris charbon,
  Poing de Fer, drapeaux verts aux marteaux croises et montagnes dorees.
- Nouveau titre : **LE POIDS DU RETOUR**.
- Description adaptee au retour dans la Tour et au gant preserve par Madania.
  Sources narratives : Story, chapitres XIII-XV.
- Aucun changement des chiffres, faces, positions P2/P3, famille Poing, race,
  cristal, pouvoirs, equipements, moteur ou identifiant de sauvegarde.

L'illustration seule vient de la generation integree; la carte est composee
dans Photoshop 26.11.8 au format natif 897 x 1497 px, 300 ppp.
Textes editables, composants incorpores et effets separes.
Voir `art-prompts.json` et les provenances de la proposition 05 puis 06.

## Conservation et controles

`before/` preserve les six fichiers publies precedents et le catalogue.
`before.json` conserve leurs empreintes et celles des autres cartes.
Ni les anciens lots, ni les verrous, ni leurs preuves n'ont ete refiges.
`publication.json` journalise la transaction locale.

`native-checks.json` confirme :
- zero difference des composants fixes;
- zero difference apres reouverture PSD;
- lecture du vrai code-barres 49900802;
- zero pixel modifie hors illustration, titre et description.

`revision.test.cjs` compare tous les champs non narratifs, les autres entrees
du catalogue, les originaux archives, l'art approuve et les fichiers de 2B.
Le test du lot initial consulte explicitement cette revision pour les deux
champs narratifs et la nouvelle illustration; son `set.json` reste inchange.
Ses tests de faces, equipements, sauvegardes et douze matchs complets restent
actifs. `browser.test.cjs` controle les lecteurs des deux editions sur PC,
Razr 50 (412 px) et 320 px, puis les deux camps de l'arene et le rechargement.

## Reprise

Cette transaction est terminee une fois `publication.json.state` a `published`.
Ne pas relancer `freeze` ou `publish` sur des sorties deja publiees.
Une correction ulterieure doit utiliser une nouvelle revision et des sauvegardes
propres. Les etapes initiales sont conservees ici comme historique reproductible,
pas comme instructions pour ecraser de nouveau la carte.
