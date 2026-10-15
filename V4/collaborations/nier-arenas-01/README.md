# NieR - Ruines de la cite et fete foraine

Integration additive de deux arenes, sans modification du moteur de jeu.
Aucune image n'est generee par ces scripts.

## Statut final - 23 septembre 2026

Les deux arenes sont publiees dans le jeu, apres Simone `45862715`.
La QA reelle desktop 1600 x 1000 et mobile 390 x 844 a reussi, avec revue des
captures sans nouveau chevauchement. Le rapport confirme `passed: true` et
`sourcePreservation: true` : zero erreur JS/HTTP/reseau, sources protegees
inchangees, aucun stockage personnel utilise. Le parent confirme egalement
45 tests post-publication reussis avec la fixture Simone corrigee. Aucun push.

Voir [resultat detaille](RESULTAT.md), [rapport navigateur](browser-review/report.json)
et [preuve de publication](publication/fd52e855-b060-43a9-b68b-5be4350b6ece/published.json).
`browser-review/failure-1600.png` est uniquement l'historique non bloquant d'un
premier essai du script, remplace par le rapport reussi. Les etapes ci-dessous
decrivent le protocole ; elles ne sont pas des travaux restant a effectuer.

| Arene | Cristal | Affinite de personnage |
| --- | --- | --- |
| Ruines de la cite | HERBO | `2b-nier`, `9s-nier`, `anemone-nier` |
| Fete foraine | HEMATO | `simone-nier` |

L'affinite utilise `characterId`, pas l'ID numerique d'un modele. Le producteur
de Simone doit donc conserver `characterId: "simone-nier"`. Aucun faux ID
numerique n'est ajoute. Une nouvelle version du personnage garde l'affinite.

Les bonus existants restent +15 ATK pour le cristal et +10 ATK/+10 DEF a
domicile, soit au maximum +25 ATK/+10 DEF. Les autres personnages de la faction
NieR n'obtiennent pas automatiquement le bonus domicile.

## Preparation et validation

1. Placer les deux PNG paysages selectionnes dans `art/city-ruins.png` et
   `art/amusement-park.png`. Garder prompt, references et provenance a cote.
   Format paysage, minimum 1024 x 576, maximum 8192 px par cote et 32 Mio.
2. Publier les personnages d'affinite, dont Simone, par leur propre pipeline.
3. Lancer le preflight ci-dessous. Il decode les PNG, verifie chemins, profils,
   identites, bonus et conflits. Il n'ecrit ni media ni registre ni preuve.
4. Apres revue visuelle, creer `art-review.json` avec `reviewed: true` et
   `assets.<key>.sha256` pour chaque image. Les empreintes figurent dans le
   resultat du preflight. Cette revue de production ne pretend pas constituer
   une approbation artistique de l'utilisateur.
5. Seulement apres accord du parent de la tache, executer `--publish`.

Depuis la racine Kalistar, avec le Node du poste :

```powershell
node --test --test-isolation=none V4/collaborations/nier-arenas-01/pipeline.test.cjs V4/atelier/collaboration-arenas.test.cjs V4/atelier/game-catalog.test.cjs V4/deploy/build.test.cjs
node V4/collaborations/nier-arenas-01/publish.cjs
node V4/collaborations/nier-arenas-01/publish.cjs --publish
```

Structure de la revue (remplacer les empreintes, ne pas valider cet exemple) :

```json
{
  "reviewed": true,
  "assets": {
    "city-ruins": { "sha256": "empreinte du PNG retenu" },
    "amusement-park": { "sha256": "empreinte du PNG retenu" }
  }
}
```

## Publication et preuves

Le verrou `V4/atelier/data/render.lock` serialise la publication avec les cartes.
Les fichiers observes sont verifies de nouveau avant ecriture. Les deux images
sont installees sans ecrasement dans `V4/site/assets/arenes/nier-*.png`, puis les
deux entrees sont ajoutees atomiquement a `V4/donnees/arenes-collaborations.json`.
Le catalogue des cartes, les PSD et les preuves historiques restent inchanges.

`publication/<transaction>/` contient le registre avant/apres, les empreintes
des sources et des medias, les metadonnees attendues et le resultat publie.
Une relance identique ne duplique rien ; une arene ou une image existante
differente bloque. Si un echec intervient apres copie des images mais avant
validation du registre, les copies identiques peuvent etre reutilisees apres
nouveau preflight. Ne pas restaurer aveuglement un ancien registre.

Le jeu masque automatiquement les arenes lorsqu'aucun personnage `*-nier`
n'est publie et filtre les affinites absentes. L'export statique et sa liste LFS
prennent automatiquement les nouvelles images dans le dossier existant.
Le script de publication ne lance ni serveur, navigateur, Photoshop, ni Git.

## Tests isoles

`pipeline.test.cjs` redirige uniquement le registre supplementaire en memoire
et utilise des dossiers temporaires pour tester la publication. Les PNG de
fixture sont des donnees factices avec decodeur injecte ; aucune creation de
test n'entre dans le vrai catalogue. Les tests couvrent activation, affinites,
plafonds, matchs/restauration, preservation des anciennes donnees, publication,
preuves, idempotence, conflits, verrous, concurrence, revue et export statique.

## Controle navigateur reel apres publication

`browser-review.cjs` est a executer seulement apres publication de Simone
`45862715` et des deux arenes, avec le serveur local actif :

```powershell
node V4/collaborations/nier-arenas-01/browser-review.cjs
```

Il lit l'URL dans `V4/atelier/data/runtime.json` (`KALISTAR_URL` peut la
remplacer, uniquement en HTTP sur `127.0.0.1`). Il lance Chrome headless avec
un contexte neuf par format : 1600 x 1000 et 390 x 844, tactile sur mobile.
Il n'utilise ni le profil navigateur personnel, ni une sauvegarde partagee.
Seules les requetes GET vers cette meme origine sont autorisees ; aucune
publication, import ou requete d'ecriture serveur n'est possible.

Parcours : lecture de Simone dans la collection, empreintes et dimensions des
trois PNG servis, selection des deux arenes dans le vrai formulaire, formation
et debut de match en mode deux joueurs locaux. Sur mobile, l'ouverture d'une
nouvelle partie passe par le menu du match. Les sauvegardes de test restent
dans les stockages ephemeres du contexte et disparaissent a sa fermeture.

Les captures du lecteur, des choix et des matchs ainsi que `report.json` sont
ecrits dans `browser-review/`. Le controle couvre chargement, pixels non
uniformes, absence de debordement horizontal, bon fond CSS, dix cartes en
formation, phase `choose` et restauration apres rechargement. Il releve les
erreurs JS/HTTP/reseau et verifie que les sources protegees n'ont pas change.
Les captures doivent encore etre examinees : ces controles ne remplacent pas
une revue artistique. Une premiere execution complete est documentee dans
`RESULTAT.md` ; les captures de cette execution ont ete examinees.
