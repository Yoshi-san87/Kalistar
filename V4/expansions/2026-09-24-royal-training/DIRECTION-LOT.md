# Lot Royal Training

Demande utilisateur du 24 septembre 2026, avec publication sur le site apres
verification. Travail delegue autorise explicitement. Ce document conserve les
intentions et les choix de production ; les rapports natifs attestent les tests,
pas une approbation artistique de l'utilisateur.

## Retouches Demandees

- Kaine et Capitaine Skully : rapprochement de 12 % dans leur objet dynamique,
  sans regeneration de l'illustration ou du visage.
- Darnako : epee entierement sortie, garde/poignee/lame coherentes, fourreau vide.
- Xiaomi : katana droit et coherent, gravure lumineuse, tenue shinobi noire plus
  ajustee et elegante. Derniere orientation choisie pour voir la pointe entre
  les colonnes. Le cristal NONE et toutes ses caracteristiques restent intacts.
- Ruby : peau et queue rubis, cheveux noirs (derniere precision utilisateur),
  joie, dauphins, equipement et identite conserves.
- Solaria : fragment parasite sous la pointe supprime dans les composants V4
  et les cartes concernees. Source V3 conservee. La petite ombre de suspension
  et le tissu principal ne doivent pas changer.

## Neuf Modeles

| Modele | Identite / scene | Profil |
| --- | --- | --- |
| Kaylis - L'Elan des couleurs | Meme heroine, cheveux tresses, entrainement au fleuret, bras Rainbow, noir et blanc, terrain de pierre de Balmhyr sans le montrer | Katana, RAINBOW, P1/P2/P3, role principal P3 |
| Aelis - La Priere sans reponse | Illustration V2 exacte reutilisee, pas Iliane V3 ; personnage Aelis commun aux deux versions | Baton, LUXO, P3/P5, Support avec Reraise reequilibre selon accord utilisateur |
| Baptiste - Le Dernier Accord | Vampire violoniste elegant et inquietant en concert a Draevenheim | Instrument, HEMATO, P3 |
| Sapphire - L'Heritiere des abysses | Princesse Sirena bleue, tres musclee, sous l'eau, sourire agressif et griffes | Poing, HYDRO, P1 |
| Keryn | Korbow passeur acheminant des remedes a Nestown | Baton, AERO, P5 |
| Brindor | Carnivert protegeant les semences d'Arborium pendant une tempete | Marteau, HERBO, P1 |
| Asteran | Aurelion brisant une chaine qui ferme le passage aux bannis de Solaria | Epee longue, LUXO, P2 |
| Ornelle | Cerelf femelle reconnectant un pont de racines a Woodland | Sceptre, HERBO, P4 |
| Tazrik | Felineus saltimbanque jonglant avec le cuivre et l'electricite a Chroma | Projectile, ELECTRO, P3 |

Les cinq derniers sont des creations proposees pour cette demande, et non des
personnages retrouves dans les manuscrits. `NOTES-B.md` detaille leur ancrage.
Les deux filles Sirenas suivent une decision narrative de l'utilisateur : les
princesses portent le nom et la couleur de peau d'une pierre precieuse.

## Fabrication

Illustrations seules generees/retouchees via **imagegen integre**, sans CLI ni
generation du cadre complet. Momo et Valazar ancrent la peinture narrative,
les matieres usees, la lumiere motivee et les visages non manga.

- `art-a/*.request.json`, `art-b/*.request.json`, `retouches/*.request.json` :
  prompts exacts et references de chaque appel.
- `art-a/provenance.json`, `art-b/provenance.json`, `retouches/provenance.json` :
  sources generees, selections et empreintes. Les iterations sont conservees.
- `art-a/*.png`, `art-b/*.png`, `retouches/{ruby,darnako,xiaomi}.png` : illustrations
  selectionnees. Les suffixes v1/v2/v3 sont des etapes, pas des cartes publiees.
- `audit/` et `art-b/qa/` : apercus de cadrage, jamais des exports a publier.
- `cards/` et `revisions/` : rendus natifs et leurs preuves, lorsqu'ils sont produits.

Le cadre reste 897 x 1497 px, 300 ppp. Textes, valeurs et composants demeurent
editables/separes ; une retouche d'illustration n'autorise aucune modification
du gameplay existant. Le PSD rouvert, les pixels hors zone et le vrai code-barres
doivent passer avant publication. Aelis V2 est le seul ancien profil dont le
reequilibrage a ete explicitement demande et approuve pour sa nouvelle edition.

## Portee De Publication

Avant ce lot : 80 cartes, 38 references, 42 creations, 23 arenes.
Cible : 89 cartes, 38 references, 51 creations, 23 arenes.
Les deux versions d'Aelis et Kaylis partagent leur `characterId` ; elles ne
peuvent pas se cumuler dans un deck. Les 80 profils existants sont conserves.

`gameplay-review.json` documente les neuf matchs simules, la double couverture
de positions et la restauration d'une partie anterieure. `browser-review/`
contient les controles ordinateur/telephone apres la publication locale.
La presence d'un fichier dans ce dossier ne suffit pas a prouver une publication :
consulter le recu transactionnel et le catalogue actif.

## Verification Finale Locale

Publication locale terminee le 25 septembre 2026 JST : transaction
`818833c1-8a64-4db0-9848-90521be8b291`, 89 cartes et 23 arenes.

- 9 creations et 7 revisions natives : PSD editables, PNG 897 x 1497,
  reouverture identique, codes-barres verifies.
- 38 references rendues et reouvertes : comparaison pixel sans ecart,
  valeurs/champs natifs et codes-barres conformes. Voir
  `evidence/native-regression/report.json`.
- Double revue visuelle : neuf cartes en taille native et petite taille ;
  description Ornelle raccourcie sur quatre lignes apres detection d'un
  chevauchement. L'ancienne version et la revision explicite restent archivees.
  Voir `visual-review/creations-curie/REVIEW.md`.
- 137 tests Node reussis apres publication : Atelier, catalogue, composants,
  transaction/rollback, provenance et Solaria. Aucun test ignore.
- Neuf matchs simules, anciennes 80 caracteristiques de jeu inchangees,
  restauration d'une partie et exclusion des versions d'un meme personnage
  dans un deck verifiees.
- Chrome isole : 16 cartes controlees a 1600 x 1000 et 390 x 844, octets des
  images servis identiques aux sorties natives, aucun debordement de document,
  aucune erreur HTTP/JavaScript, ajout des possessions idempotent. Aucune
  donnee du navigateur personnel n'a ete utilisee.
- Integrite du serveur local : 901 fichiers proteges conformes apres relance.

Le transfert Git est cible : fichiers actifs du journal, sources/preuves de ce
lot, route Solaria et documentation visuelle. Les changements d'interface
concurrents sont conserves. Le PSD temporaire `roundtrip.psd` de regression
reste local ; les preuves PNG/native.json correspondantes sont conservees.
Cette section atteste la verification locale, pas a elle seule le deploiement.
