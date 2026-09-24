# Royal Training - lot A

Date : 2026-09-24. **Selection parent finale pour preparation native** :
Kaylis V3, Sapphire V2, Baptiste V1, Aelis V2 historique copiee exactement.
Aucune iteration supplementaire. Aucun accord utilisateur final revendique.
Aucun Photoshop, publication, source historique, preparation native, script
partage ou depot Git modifie par ce worker.

## Fichiers figes

- `profiles-a.json` : quatre profils inchanges pendant les revisions.
- `art-a/kaylis-entrainement.png` : copie exacte de la generation V3 retenue.
- `art-a/sapphire.png` : copie exacte de la generation V2 retenue.
- `art-a/baptiste.png` : generation initiale conservee.
- `art-a/aelis-veille.png` : copie byte-identique de
  `V2/assets/illustrations/17_luxo_aelis_veille.png`.
- Les quatre images selectionnees font **1122 x 1402**. Crop par defaut conserve.
- `art-a/selection.json` : chemins/hashes definitifs et prompts retenus.
- `art-a/provenance.json` : provenance actuelle ; `art-a/revisions/history.json` :
  les six appels builtin, requetes exactes, references et archives.
- `art-a/originals/` : les SIX resultats generes originaux, byte-identiques.
- `art-a/revisions/v1/` : premier etat et preuves conserves sans reecriture.
- `art-a/revisions/v2/` et `v3/` : apercus de composants archives pour controle.
- `art-a/art-review.json` : revue finale, selection parent distincte de validation
  utilisateur et de validation native PSD.
- `art-a/verification.json` : controles techniques de la selection.

## Retouches et controle du cadre

Trois appels initiaux, puis revisions autorisees explicitement : une Kaylis V2,
une Sapphire V2, puis une Kaylis V3 supplementaire autorisee apres echec du fit
de V2. Total : six appels a `image_gen.imagegen`, exclusivement illustrations
standalone. Aucune retouche locale peinte ni montage pour dissimuler une erreur.

**Kaylis V3** : garde baissee, longue lame droite plus verticale, pointe complete,
tete et bottes degagees. Einstein et le parent ont vu l'apercu avec les vrais
composants et rails : fit accepte. La V2 rejetee masquait encore la pointe sous
DEF ; elle reste archivee. Le prompt V3 conserve les coordonnees demandees et la
contrainte des 17 % masques de chaque cote ; le rendu final est juge sur le vrai
fit, pas sur une affirmation d'exactitude numerique de l'image generative.

**Sapphire V2** : bras projetes vers l'avant, mains devant le buste. Les SIX
pointes sont visibles dans la fenetre. Manchette droite proche du rail, mais
aucune griffe masquee. Deux bras et une queue conserves. Fit et selection parent
valides. L'ancienne scene aux mains cachees reste archivee.

**Baptiste et Aelis** : selection parent confirmee, aucune iteration. Ces apercus
de composants ne sont PAS des rendus PSD : textes editables, reouverture,
regression native et lisibilite finale restent au renderer.

Prompts retenus :
`kaylis-entrainement.revision-03.request.json`,
`sapphire.revision-02.request.json`, `baptiste.request.json`.
Aelis n'a pas ete generee ou reencodee.

## Regles et methode

Lecture : AGENTS, guide de reprise, identite visuelle V4, DA V3/V4, regles V4,
`V3/donnees/regles_demo.json`, profils precedents et sources narratives.
Momo, Valazar, Kaylis V3, Seraphina, Ruby et Aelis V2 ont ete ouverts visuellement.
Tableaux ATK/DEF en D6 -> D1 ; `magic` et `barriers` en numeros de des.

Plafonds utilises, AVANT proposition des profils :

| Role | ATK D6 -> D1 | DEF D6 -> D1 |
| --- | --- | --- |
| P1 | 210,175,140,105,70,35 | 300,250,200,150,100,50 |
| P3 | 240,200,160,120,80,40 | 240,200,160,120,80,40 |
| P5 | 180,150,120,90,60,30 | 210,175,140,105,70,35 |

Un poste secondaire ne remplace pas le role principal et ne donne pas de bonus
automatique. Aucune face speciale n'a de mode magique/barriere. Aucun Reraise
hors P5. Ces bornes sont respectees, mais ne prouvent pas un equilibrage empirique
en parties. Le renderer doit conserver les polices et geometries natives.

## Choix des quatre profils

**Kaylis** : meme `characterId: kaylis`, HUMAIN, Z13, Rainbow, P1/P2/P3, role 3.
Les valeurs sont reduites sous les plafonds Middle pour compenser la polyvalence
et Rainbow. Deux faces magiques, une barriere, une esquive ; aucun soutien P5.
L'arme de jeu Katana et le fleuret/rapiere dessine suivent explicitement la
demande utilisateur. L'entrainement de pierre vient du chapitre 8 de
`V3/sources/histoire.txt` ; Balmhyr est absent de l'image. Identite issue de
`V3/assets/illustrations/12_RAINBOW_KAYLIS.png`, pas d'un personnage remplace.

**Baptiste** : nouveau VAMP, Instrument, HEMATO, P3/role 3. Orthographe de faction
existante `Draevenheim`, reprise de Seraphina. Les soutiens mana et trefle
remplacent deux attaques, trois faces numeriques magiques, deux barrieres.
Le lore du concert est une proposition, pas une citation historique inventee.

**Sapphire** : nouvelle SIRENA, Thalassea, Poing, HYDRO, P1/role 1. Attaques
entierement physiques proches des plafonds P1, sans emprunter les valeurs P2 ;
DEF en retrait des plafonds, deux barrieres, aucun dodge/soutien additionnel.
Fille du roi et soeur de Ruby sont les nouveaux faits fournis par l'utilisateur.
Peau bleue, deux bras, une queue unique, sans jambes humaines. Reference Ruby
retouchee rouge utilisee uniquement pour l'anatomie et la DA, pas sa couleur.

**Aelis** : accord utilisateur explicite du 24 septembre : **adapter aux regles
V4**, role 5, positions 3/5, Reraise et toutes valeurs numeriques sous plafonds
P5. Titre historique exact `LA PRIERE SANS REPONSE`, description et illustration
V2 conserves. Meme `characterId: aelis`. Aelis deja publiee reste intacte.

Historique V2 `00000017`, pour tracabilite seulement :

```text
ATK : 213,176,142,107,71,revive
DEF : 230,191,154,114,77,37
magic : 6,5,4,3,2 ; barriers : 6,2
```

Ces valeurs depassaient les bornes P5. Nouvelle proposition approuvee dans son
principe : ATK 175,145,115,85,55,revive ; DEF 200,166,132,98,64,30.
Modes historiques conserves. Ne pas importer l'ID V2 comme ID de creation.

## Reference Ruby preservee

Apres la premiere generation de Sapphire, le parent a remplace
`retouches/ruby.png`. La reference reellement utilisee est conservee dans
`art-a/references/ruby-red-used-for-sapphire.png`, hash
`7fb4770ab8c2f6eba56fbd8852f44213d0b73d319933ed798841bc212c244605`.
La requete initiale garde son chemin reellement envoye et son empreinte originelle.
Sapphire V2 utilise directement sa V1 archivee pour conserver son identite.

## Verification reproductible

Depuis la racine Kalistar, avec Node et les dependances existantes :

```sh
node V4/expansions/2026-09-24-royal-training/art-a/verify.cjs
```

Lecture seule par defaut. `--preview` recree seulement la planche QA dans
`art-a/qa/`. Verifie quatre profils, quatre PNG entierement decodes/opaques,
crops, copies selectionnees, requetes et references ordonnees, Aelis exacte,
six originaux et leurs six requetes historiques. Le profil conserve son SHA256
initial. La selection autorise seulement la preparation native par Einstein ;
ce worker n'a publie aucune carte.
