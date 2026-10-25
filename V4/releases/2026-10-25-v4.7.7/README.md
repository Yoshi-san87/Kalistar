# Kalistar 4.7.7 - Profils Astraball

## Perimetre

- Statistiques personnelles VIT, MOB, FOR, PAS, TIR et DEF. Les nouveaux matchs
  recopient les profils versionnes dans leur etat, au lieu du profil du poste.
- Un poste principal et un secondaire par personnage, sans malus cache.
  Selection filtree, echanges compatibles et composition aleatoire legale.
- 368 identites definies explicitement ; seuls les sprites publies sont
  selectionnables. Aucun deblocage de collection ou d'equipement Kalistar.
- Fiches PC/phone dans le vestiaire et mensurations dans la fiche de terrain.
  Les notes utilisees en match restent celles du snapshot sauvegarde.
- Mensurations proposees pour 130 originaux, d'apres leurs illustrations
  approuvees. Elles sont marquees approximatives, pas canoniques. Les 238
  collaborations ont un registre distinct : 61 tailles et 23 masses sourcees,
  177 identites entierement non renseignees faute de verification suffisante.
- Aucun avantage automatique lie au poids ou a la taille. Pas de changement
  des collisions, des sprites, des cartes, de Supabase ou des droits d'acces.
- Anciennes rencontres conservees sans recalcul des valeurs ni reset.
  Darnako Pilier et Valazar Middle uniquement dans les nouvelles compositions.
- Aucun media ajoute par ce lot, aucune boucle d'animation supplementaire.

Contrat de maintenance : [ATHLETES.md](../../astraball/ATHLETES.md).
Sources et limites documentaires :
[athlete-sources.md](../../astraball/research/athlete-sources.md).

## Verification

Preuves locales : `work/astraball/profiles/`.

- Douze tests de vestiaire : profils, postes, valeurs bornees, conservation des
  anciennes sauvegardes et snapshots futurs, 300 melanges legaux, 20 matchs IA.
- Tests directs prouvant l'effet des six notes sur deplacement, initiative,
  portee de passe/tir, precision, impact et resistance aux charges.
- Audit reproductible `tools/audit-athletes.mjs` : 1 772 matchs termines,
  387 593 commandes valides, 5 951 buts. Chaque identite joue a ses deux postes
  et dans les deux camps. Cinquante relectures strictement deterministes.
  Les empreintes du moteur et des profils sont conservees dans le rapport.
- Playwright sur source : 1440x900, 1920x1080, 412x915, 360x800 et 915x412,
  sans erreur JavaScript ni debordement. Les 170 personnages disponibles ont
  chacun ete lances en match. Choix de postes, sauvegarde/reload, annulation,
  fallback de medias, deux vues, deux arenes et six ballons verifies.
- Interception, charge, but, replacement, tactile, Reduced Motion et idle
  partage verifies. Aucun rendu idle en Reduced Motion ; trois rendus sur
  800 ms en mode normal, suspension derriere le vestiaire et en onglet masque.
- Suite locale complete : 14 invocations, 154 tests reussis, aucun echec.
  Le premier lancement sandboxe refusait une connexion localhost (EACCES) ;
  la suite entiere a ensuite ete relancee avec les autorisations necessaires.
- Suite CI complete : 104 invocations, 1 991 tests reussis, deux ignores,
  aucun echec. Le wrapper Astraball execute aussi ses sept groupes internes.
  Suite terminee avec le catalogue 170 et les fichiers de version 4.7.6 ;
  les assertions de version et tous les groupes Astraball ont ensuite ete
  rejoues en 4.7.7 : 129 tests reussis, aucun echec.
- Controle d'organisation apres staging explicite : conforme. Aucun binaire
  ni fichier de production de sprites en cours dans ce lot.

Une premiere invocation CI a croise le changement de version concurrent
4.7.5 vers 4.7.6 : assertion deja chargee et HTML modifie pendant son execution.
Ce resultat n'est pas compte comme une validation ; la suite complete doit
etre relancee apres stabilisation des versions. Les essais initiaux precedant
l'enregistrement des nouveaux medias et modules avaient aussi deux controles
d'integration en echec ; la verification finale couvre ces fichiers inscrits.

## Equilibre Et Limites

Le budget pondere commun de 38 borne les profils, pas leur efficacite reelle.
Sur 200 matchs des equipes initiales avec camps inverses : Obsidienne gagne
115 fois, Chroma 52, avec 33 nuls. Cela signale un avantage de composition/IA
a examiner, pas un effet du premier camp etabli ni un equilibrage valide.
Les quatre matchs de couverture par athlete ne permettent aucun classement
statistique individuel. Des essais humains restent necessaires.

Les mensurations originales sont des propositions artistiques. Les donnees
de collaborations distinguent continuite, source officielle et secondaire.
Plusieurs sources ont ete verifiees via les extraits indexes plutot que leur
page directe indisponible ; ce constat est conserve dans le rapport de recherche.
Aucune donnee incertaine n'a ete remplacee par une masse inventee.

## Publication

Lot coordonne apres les sprites 4.7.6, vers le depot personnel et le projet
Cloudflare existants. Le build fige du commit sera reteste avant envoi.
Les travaux non termines des autres taches restent hors de ce commit.
