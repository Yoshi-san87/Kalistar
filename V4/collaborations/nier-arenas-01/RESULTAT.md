# Arenes NieR publiees le 23 septembre 2026

Statut final : les deux arenes sont publiees, apres Simone 45862715. La QA
navigateur reelle a reussi en 1600 x 1000 et 390 x 844 : `passed: true` et
`sourcePreservation: true`. Le parent a confirme la revue des captures, sans
nouveau chevauchement, et les 45 tests post-publication reussis apres correction
de la fixture Simone. Aucun push effectue pour cette livraison.

Preuve de publication :
`publication/fd52e855-b060-43a9-b68b-5be4350b6ece/published.json`.
Les entrees precedentes du registre sont preservees ; seuls les deux ajouts
prevus et leurs nouveaux medias ont ete publies. Les sources protegees,
cartes existantes et preuves historiques n'ont pas ete alterees par cette QA.

## Preparation historique avant publication

Le code et les tests ci-dessous ont ete prepares sans publication de production.
Aucun navigateur, Photoshop ou Git n'avait ete lance a ce stade.

- Ruines de la cite, HERBO ; domicile 2B, 9S et Anemone.
- Fete foraine, HEMATO ; domicile Simone (`simone-nier`, sans faux ID modele).
- Aucun changement des regles, cartes, PSD, anciennes preuves ou bonus.
- Avant publication, le registre actif des arenes etait identique octet pour
  octet a son etat precedent. Les ajouts attendaient la revue du parent.
- Seule modification partagee : export de la fonction de validation deja
  existante `collaborationArenas` dans `V4/atelier/game-catalog.cjs`. Le reste
  du fichier est identique, fins de lignes incluses.
- Pas de modification du build : celui-ci inclut deja tout media sous
  `V4/site/assets/arenes/`, ainsi que ses chemins LFS.

Verification executee :

```text
node --test --test-isolation=none
  V4/collaborations/nier-arenas-01/pipeline.test.cjs
  V4/atelier/collaboration-arenas.test.cjs
  V4/atelier/game-catalog.test.cjs
  V4/deploy/build.test.cjs
```

Resultat : 33 tests reussis, aucun echec. Les tests de publication utilisent
exclusivement des dossiers temporaires et un catalogue injecte en memoire.
Ce premier resultat ne couvrait pas encore la production ni le navigateur.
La publication et les controles suivants sont consignes ci-dessous.

## Controle reel apres publication par le parent

Le 23 septembre 2026, de 06:35:38 a 06:35:48 UTC, execution reussie de
`browser-review.cjs` sur `http://127.0.0.1:4304`, apres publication de Simone
45862715 et des deux arenes par le parent de la tache.

- Deux contextes Chrome headless ephemeres : 1600 x 1000 et 390 x 844 tactile.
- Uniquement 478 requetes GET locales ; zero erreur JS, HTTP ou reseau.
- Simone ouverte dans la collection ; PNG servi identique au PNG publie,
  dimensions 897 x 1497, empreinte
  `ec6b4d0bbd353bef05d4bc8b89451d0f6a628fb2ce691b9088c7e2b3481a5a7c`.
- Deux decors 1672 x 941, empreintes servies identiques aux publications,
  selectionnes avec les vrais controles. Quatre matchs demarres en mode local,
  dix cartes deployees, phase `choose`, restauration identique apres reload.
- Fond CSS correspondant a chaque lieu, 16 captures non uniformes. Captures de
  collection et de matchs examinees, sans image manquante ou cadre vide.
- Aucun debordement horizontal. La collection et le plateau mobile tiennent
  dans le viewport. Le plateau desktop mesure 1062 px pour un viewport haut de
  1000 px, soit 62 px de defilement vertical ; constate sans modification UI.
- Empreintes des sources protegees inchangees ; aucun stockage personnel ni
  profil navigateur utilisateur ouvert. Tous les contextes de test fermes.

Le premier essai a revele une omission du script : la confirmation native de
remplacement de la partie ephemere etait automatiquement refusee. Le script
accepte maintenant uniquement cette confirmation precise. Aucune modification
de l'application n'a ete necessaire. Une capture `failure-1600.png` conserve le
diagnostic de cet essai et ne fait pas partie des 16 captures du rapport reussi.
Cette ancienne capture d'echec est uniquement historique et non bloquante.

Rapport : `browser-review/report.json`.
Captures principales : `simone-collection-{1600,390}.png`,
`nier-city-ruins-match-{1600,390}.png` et
`nier-amusement-park-match-{1600,390}.png` sous `browser-review/`.
