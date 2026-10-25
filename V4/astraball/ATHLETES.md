# Profils Des Athletes

[Astraball](README.md) | [Origine des mensurations](research/athlete-sources.md)

Les profils sont propres a Astraball : aucun changement des cartes Kalistar,
de leur puissance, de la collection ou de Supabase. Le vestiaire est une
exhibition locale ; ses personnages disponibles suivent les sprites publies.

## Deux Postes

Chaque identite dispose d'un poste principal et d'un secondaire. Les valeurs
restent identiques aux deux postes, sans penalite cachee. Les regles du poste
s'appliquent : double point du Scoreur, zone limitee du Pilier, engagement du
Meneur. Une seule occurrence de la meme identite par equipe, meme si plusieurs
illustrations sont disponibles.

La selection filtre les personnages compatibles avec le poste choisi. Un
echange entre coequipiers n'est autorise que si chacun peut occuper l'autre
poste. Sinon, il faut remplacer d'abord le joueur de l'autre poste. Le hasard
cherche une affectation complete de cinq identites et cinq postes compatibles.

Dans la nouvelle equipe Obsidienne initiale, Darnako devient Pilier et Valazar
Middle. Cela ne deplace pas les personnages d'une rencontre deja enregistree.

## Statistiques

`data/athlete-definitions.mjs` contient les affectations explicites des 368
identites du catalogue examine. `data/athletes.mjs` construit les profils
versionnes, independants des sprites et des mensurations documentaires.

- VIT : ordre d'initiative, apres penalites.
- MOB : nombre maximum de cases de deplacement, entre 2 et 4.
- FOR : probabilite d'une charge reussie.
- PAS : portee des passes.
- TIR : portee et precision des tirs.
- DEF : resistance aux charges ; pas une zone d'interception invisible.

Les 16 styles sportifs proposent des forces et des limites, puis les profils
Kalistar peuvent echanger un point entre deux caracteristiques. Une specialite
deja au plafond reste au profil de base, sans enlever de point ailleurs.
Les notes sont bornees a 1-9 ; MOB est bornee a 2-4. Le budget commun est
`VIT + FOR + PAS + TIR + DEF + 2 * MOB = 38`. Il limite l'inflation, mais
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
et s'affiche Non renseigne. Une source secondaire est signalee comme telle.
Ces chiffres ne changent ni FOR, ni MOB, ni la taille des sprites, ni les
collisions. Ne pas deduire une puissance automatique d'une masse canonique.

## Sauvegardes Et Maintenance

Le snapshot de match conserve les notes et `{id, version, primary, secondary}`.
La restauration valide ce snapshot sans le recalculer depuis le catalogue
courant. Pas de reset, de migration Supabase ou de changement de cle locale.
Une ancienne composition incompatible est corrigee uniquement dans le brouillon
du prochain match ; Reprendre conserve integralement la rencontre existante.

Une nouvelle identite doit recevoir un profil explicite avant d'etre jouable.
Le vestiaire ignore une entree de sprite sans profil et les tests de couverture
signalent l'ecart. Ne pas attribuer automatiquement des valeurs par hash, race
ou masse. Lors d'un changement de notes/postes, incrementer `ATHLETE_VERSION`.

Verification specifique :

```sh
node --test V4/astraball/tests/locker.test.mjs
node V4/astraball/tools/audit-athletes.mjs
node V4/astraball/tests/interface.browser.test.cjs
```

L'audit couvre chaque identite a ses deux postes, en inversant les camps,
les equipes initiales sur 100 graines dans chaque sens, et 50 relectures
deterministes. Les resultats vont dans `work/astraball/profiles/simulation.json`.
C'est un diagnostic moteur/IA, pas une certification d'equilibre competitif.
