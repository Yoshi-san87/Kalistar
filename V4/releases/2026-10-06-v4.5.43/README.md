# Kalistar 4.5.43 - Protections et reliques

Publication additive de vingt protections et vingt reliques. Le catalogue
compte maintenant 75 equipements (33 armes, 21 protections, 21 reliques).
Un seul objet par personnage reste autorise, toutes categories confondues.

## Contenu

- Protections : boucliers, armures, gantelets, bottes, manteaux et tenues.
- Reliques liees aux personnages : Materia blanche, Griever, Pod 153,
  Mk.II d'Otacon, Log Pose, Chapeau de paille, Boite des Petits Bonheurs, etc.
- Quarante scenes peintes, quarante objets detoures et quarante anneaux
  personnalises. Cadres existants, cartes natives et references protegees intacts.
- Bonus de 20 a 30 DEF, une fois par match pour une defense, conditionnels et
  non cumulables. Nouvelle selection d'allie directement sur les cartes.
- Sur les telephones tres courts, seule l'equipe beneficiaire reste affichee
  pendant ce choix. Le tableau complet revient ensuite.
- Restrictions de personnage/edition/faction/race, sauvegardes et snapshots.
  Aucun emplacement supplementaire, aucune modification des faces imprimees.

## Validation avant publication

Instantane isole de l'index : `eb371cc76e2c0c5c154f6f5474bf45c83b9c2349`.
Le navigateur de validation et cette documentation sont completes apres ce
preflight ; les fichiers distribues testes restent ceux de cet instantane.

- 426 tests comptes par le workflow Pages, plus les suites autonomes Kalistel
  et ambiance, puis construction du site : succes.
- Dans ces tests, 126 controles du nouveau module, dont 120 parties completes
  avec les cartes de production inchangees et restauration a chaque action.
- Tests de formule, consommation, dons, relances, non-cumul, compatibilite,
  ancienne sauvegarde et invariance des armes precedentes.
- Verification navigateur des 40 fiches en 1440, 412 et 320 px, equipement et
  reload, combats des deux camps, ancrage natif et redimensionnement,
  inspection agrandie, choix de destinataire humain/IA et Reduced Motion.

Rapport du workflow : [workflow-results.json](workflow-results.json).
Sources, prompts, schema et captures :
[revision des equipements](../../revisions/2026-10-06-protections-relics/README.md).

Ces controles verifient le fonctionnement ; ils ne prouvent pas un equilibrage
competitif des taux de victoire. Les valeurs sont volontairement modestes et
sans multiplicateur, elimination garantie ou recharge permanente.

Controle historique hors workflow : `catalogue-evolution.test.cjs` a ete
lance, mais sa fixture du 18 septembre suppose que Voloden est l'unique
reference ajoutee depuis cette date. Le catalogue courant en contient treize ;
le test s'arrete sur cette assertion avant ses scenarios navigateur. L'ajout
du module defensif a sa liste de scripts est prepare, mais le test n'est PAS
declare passant. Aucun registre ni rapport historique n'a ete modifie pour
contourner cette assertion. Les reprises de parties/equipements sont couvertes
separement par les suites de cette publication.

## Perimetre Git

Depot personnel `Yoshi-san87/Kalistar`, branche `main`, tag annote `v4.5.43`.
Le travail concurrent deja publie en 4.5.42 est preserve. La modification
locale du workflow concernant performance.test.cjs n'appartient pas a cette
publication. Aucun verrou, rapport historique ni sauvegarde utilisateur n'est
reecrit pour valider la livraison.

Le workflow GitHub Pages et la version publique sont controles apres le push.
