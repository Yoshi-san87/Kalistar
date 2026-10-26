# Profils Des Athletes

[Astraball](README.md) | [Origine des mensurations](research/athlete-sources.md)

Les profils sont propres a Astraball : aucun changement des cartes Kalistar,
de leur puissance, de la collection ou de Supabase. Le vestiaire est une
exhibition locale ; ses personnages disponibles suivent les sprites publies.

## Un Poste Par Personnage

Chaque identite dispose d'un seul poste dans `profil.position`, sans poste
principal ou secondaire. `canPlayPosition(profil, poste)` exige l'egalite
exacte avec ce poste. Les regles du poste s'appliquent : double point du Scoreur,
zone limitee du Pilier, engagement du Meneur. Une seule occurrence de la meme
identite par equipe, meme si plusieurs illustrations sont disponibles.

La selection filtre les personnages du poste choisi ; aucun echange entre
deux postes differents n'est possible. Le hasard compose cinq identites et
cinq postes distincts, avec un personnage affecte a chacun de ces postes.

Les nouvelles equipes initiales sont resolues par `roster.defaults()` depuis
le catalogue complet `data/sprite-library.json` :

| Poste | Chroma | Obsidienne |
| --- | --- | --- |
| Meneur | `momo` | `ombrine-kalistar` |
| Scoreur | `lanio` | `nereth-kalistar` |
| Middle | `bex-kalistar` | `varkhen-kalistar` |
| Sentry | `kaylis` | `voloden` |
| Pilier | `taulio` | `lok` |

`TEAMS` conserve ses compositions historiques pour les tests legacy, pas pour
definir ces nouvelles equipes. `createRoster(null)` ne dispose pas du catalogue
necessaire pour composer une nouvelle equipe complete. Ces changements ne
deplacent aucun personnage d'une rencontre deja enregistree.

## Choix Confirmes

Les 269 choix de `Astraball-mes-choix-2026-10-26.json`, fourni depuis le dossier
Downloads de l'auteur, ont recu sa confirmation explicite finale. L'export porte
encore `status: draft` et aucune case `reviewed` n'est cochee : ces indicateurs
ne sont pas une validation individuelle, et ne remplacent pas cette confirmation.
Les 269 entrees confirment postes et statistiques, y compris les valeurs non
modifiees dans le formulaire.

`data/athlete-choices.mjs` exporte `ATHLETE_CHOICES`, une table gelee de ces 269
choix `{position, stats}`, ainsi que `ATHLETE_CHOICE_SOURCE`, les metadonnees et
empreintes de provenance. Les choix auteur priment sur les styles historiques.
Les 99 autres profils, sans sprite, gardent leur ancien principal comme poste
unique provisoire et leurs statistiques inchangees. Ils ne sont ni modifies ni
presentes comme confirmes par le fichier auteur, et ne deviennent pas jouables
du seul fait de ce changement de contrat.

## Statistiques

`data/athlete-definitions.mjs` conserve les definitions historiques des 368
identites du catalogue examine. `data/athletes.mjs` construit les profils
`ATHLETE_VERSION = 2`, en appliquant les choix confirmes de
`data/athlete-choices.mjs`. Les profils restent independants des sprites et
des mensurations documentaires.

- VIT : ordre d'initiative, apres penalites.
- MOB : nombre maximum de cases de deplacement, entre 2 et 4.
- FOR : probabilite d'une charge reussie.
- PAS : portee des passes.
- TIR : portee des tirs. A portee et sans adversaire sur la trajectoire, le tir est certain.
- DEF : resistance aux charges ; pas une zone d'interception invisible.

Les [competences Sentry](README.md#competences-du-sentry) ajoutent des effets
temporaires au match, jamais aux profils : Relais +1 case de passe, Couverture
+2 DEF, Brouillage -1 case de MOB (minimum 1), balle chargee +1 case de tir.
Le Sentry garde sa charge normale ; une competence remplace son action.

Les 16 styles sportifs et les specialisations Kalistar constituent la base
historique des profils sans choix auteur. Une specialite deja au plafond reste
au profil de base, sans enlever de point ailleurs. Les statistiques confirmees
sont utilisees telles quelles, sans leur reappliquer une specialisation.
Les notes sont bornees a 1-9 ; MOB est bornee a 2-4. Le budget commun reste
`VIT + FOR + PAS + TIR + DEF + 2 * MOB = 38`, y compris pour les 269 choix
confirmes. Il limite l'inflation, mais
ne prouve pas l'equilibre : les seuils de portee, le terrain, le poste et l'IA
ont des effets non lineaires. Plusieurs personnages peuvent partager un style.

Les nouvelles rencontres issues du vestiaire fournissent `athleteId` au moteur.
Le moteur verifie le poste et copie les valeurs de son catalogue, jamais des
`stats` arbitraires du formulaire. L'API historique sans `athleteId` conserve
ses profils symetriques pour les anciens scenarios et les fixtures de regles.
L'interface ne cree plus de nouvelles rencontres avec ce mode historique.

## Mensurations

Les 130 personnages originaux ont des **propositions artistiques**, pas des
mesures objectives : les peintures n'ont pas d'echelle physique. Elles sont
affichees avec le symbole approximatif et la mention Estimations visuelles.
Les references approuvees examinees et leurs empreintes sont conservees dans
`research/kalistar-measurements.json`. Les sources graphiques restent intactes.
La taille exclut accessoires, coiffures, cornes et bois. La masse inclut le
corps mecanique des robots. Pour Ruby, Sapphire et Nereis a queue, le champ
est explicitement une longueur totale, non une taille debout.

Les collaborations ont un registre documentaire distinct, avec continuite,
source et champs effectivement couverts. Une valeur non verifiee reste `null`
dans ce registre historique ; une source secondaire est signalee comme telle.
`data/athlete-measurements.mjs` resout les mensurations pour la fiche et le
sprite : les valeurs documentees priment, puis 177 tailles d'adaptation Kalistar
completent les manques. Ce sont des choix artistiques explicites et non des
mesures canoniques : symbole approximatif et mention Taille d'adaptation Kalistar.
La masse reste inconnue si elle n'est pas documentee. Les 368 identites ont
ainsi une taille ou longueur renseignee, sans modifier la recherche initiale.
Lanio mesure desormais 182 cm et Gen 159 cm, suivant l'echange demande par
l'auteur ; leurs masses et notes ne changent pas. Les nouveaux choix ne
remplacent pas retroactivement les anciens rapports de recherche.
Les tailles alimentent maintenant l'[echelle visuelle des sprites](SPRITES.md).
Elles ne changent ni FOR, ni MOB, ni les collisions ou les cases occupees.
Ne pas deduire une puissance automatique d'une masse canonique.

## Sauvegardes Et Maintenance

Le snapshot d'athlete v2 est `{id, version, position}` ; le match conserve aussi
les notes. La restauration accepte egalement les anciens snapshots v1
`{id, version, primary, secondary}`, y compris un personnage a son ancien
secondaire. Elle valide les donnees sauvegardees sans recalcul des notes ou des
postes depuis le catalogue courant, et sans conversion retroactive en v2.
`ATHLETE_VERSION` ne change ni le schema global du match ni sa cle locale.
Pas de reset ou de migration Supabase.
Une ancienne composition incompatible est corrigee uniquement dans le brouillon
du prochain match ; Reprendre conserve integralement la rencontre existante.

Une nouvelle identite doit recevoir un profil explicite et un choix auteur
dans `ATHLETE_CHOICES` avant d'etre jouable. Le vestiaire ignore une entree de
sprite sans profil confirme et les tests de couverture
signalent l'ecart. Ne pas attribuer automatiquement des valeurs par hash, race
ou masse. Lors d'un changement de notes/postes, incrementer `ATHLETE_VERSION`.

Verification specifique :

```sh
node --test V4/astraball/tests/locker.test.mjs
node V4/astraball/tools/audit-athletes.mjs
node V4/astraball/tests/interface.browser.test.cjs
```

L'audit couvre chaque identite a son unique poste dans chacun des deux camps,
y compris les 99 profils provisoires dans des equipes de test sans sprites.
Il charge le catalogue de sprites pour les equipes initiales, joue les memes
100 graines dans chaque sens, puis 50 rencontres aleatoires et leurs relectures
deterministes. Pour 368 profils, cela represente 1 036 matchs. Le rapport inclut
les empreintes des sources, dont `data/athlete-choices.mjs` et
`data/sprite-library.json`, et va dans `work/astraball/profiles/simulation.json`.
C'est un diagnostic moteur/IA, pas une certification d'equilibre competitif ;
deux matchs forces par athlete ne permettent pas de classer leurs performances.
