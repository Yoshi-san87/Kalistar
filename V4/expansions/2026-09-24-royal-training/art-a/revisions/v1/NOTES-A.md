# Royal Training - lot A

Date : 2026-09-24. Livraison de propositions, PAS validation utilisateur des
illustrations et PAS publication. Aucun Photoshop, cadre complet genere, fichier
partage, source historique, preparation native ou depot Git modifie.

## Livrables

- `profiles-a.json` : quatre profils plats, sans ID final invente.
- `art-a/kaylis-entrainement.png` : nouvelle illustration, 1060 x 1484.
- `art-a/baptiste.png` et `art-a/sapphire.png` : nouvelles illustrations,
  chacune 1122 x 1402.
- `art-a/aelis-veille.png` : copie byte-identique de
  `V2/assets/illustrations/17_luxo_aelis_veille.png`, 1122 x 1402.
- `art-a/*.request.json` : les trois requetes EXACTES envoyees au builtin
  `image_gen.imagegen`, references absolues comprises. Un appel par nouvelle
  illustration, trois au total. Aucun appel supplementaire, aucun patch peint.
- `art-a/originals/` : copies byte-identiques des trois resultats generes.
  Les originaux Codex sont conserves ; leurs chemins figurent dans la provenance.
- `art-a/provenance.json` : chemins relatifs portables, SHA256 des images,
  prompts, references et profils, historique des decisions.
- `art-a/art-review.json` : observations et reserves visuelles explicites.
- `art-a/verification.json` : controles techniques executes avec succes.
- `art-a/qa/native-window-contact.png` : apercu des quatre fenetres 737 x 921
  avec crop par defaut, reduites pour inspection. Ordre : Kaylis, Baptiste,
  Sapphire, Aelis. Ce n'est pas une preuve de rendu dans le cadre natif.

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

## Reserves avant validation native

- **Kaylis** : lame droite et coherentement tenue, mais pointe hors image. Le
  ratio genere est plus haut que demande ; le crop natif par defaut rogne un
  peu le haut de la coiffure attachee. Les deux bottes restent visibles. Besoin
  d'acceptation de cadrage ou d'une nouvelle generation, pas d'un cache peint.
- **Sapphire** : anatomie et expression conformes, mais les griffes arrivent
  trop pres des bords malgre le prompt demandant la zone centrale de 65 %.
  Verifier leur occultation par les colonnes du cadre. Ne pas valider le fit
  sans ce controle ; nouvelle composition generative si necessaire.
- **Baptiste** : violon/archet/mains lisibles et peinture coherente ; controle
  du petit format natif encore a faire.
- **Aelis** : copie strictement identique ; controle du nouveau texte/statistiques
  dans le cadre natif a faire par le renderer, sans modifier l'art.

Les limites sont declarees ; aucune deuxieme generation hors budget d'un appel
par illustration, aucun montage local pour les dissimuler. La selection d'agent
ne vaut ni accord utilisateur, ni regression PSD/native, ni publication.

## Reference Ruby preservee

Apres la generation, le parent a remplace `retouches/ruby.png` par une nouvelle
retouche. L'ancienne reference existe dans `retouches/ruby-red-v1.png` avec le
SHA256 original `7fb4770ab8c2f6eba56fbd8852f44213d0b73d319933ed798841bc212c244605`.
Copie exacte archivee dans `art-a/references/ruby-red-used-for-sapphire.png`.
La requete conserve le chemin effectivement envoye ; la preuve conserve son
empreinte originelle, sans la reecrire pour correspondre a la nouvelle Ruby.

## Verification reproductible

Depuis la racine Kalistar, avec Node et les dependances existantes :

```sh
node V4/expansions/2026-09-24-royal-training/art-a/verify.cjs
```

Lecture seule par defaut. `--preview` recree uniquement la planche QA dans
`art-a/qa/`. Le controle utilise le normaliseur et le crop du lot en lecture
seule : quatre profils, quatre PNG entierement decodes/opaques/non vides,
quatre crops, trois requetes, neuf references ordonnees, trois copies originales
et copie exacte Aelis. Aucune publication, aucun appel Photoshop.
