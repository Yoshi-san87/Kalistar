# Kalistar V4.3.2 - Geralt et les Serpes

Publication autorisee par l'utilisateur le 2 octobre 2026.
Version visible 4.3.2 sur ordinateur et telephone ; edition et sauvegardes V4
inchangees. Le push sur main declenche le workflow GitHub Pages habituel.

## Contenu

- Geralt de Riv 49900101 : Terre, Epee longue, P2, illustration de l'auberge.
- Ssilas 49900201 : Serpes Arborium, Plante, Arc, P2/P3.
- Mirelle 49900202 : Serpes Arborium, Plante, Sceptre, Support P3/P5.
- Catalogue : 193 cartes, 28 arenes. Aucun changement du moteur ni du schema
  de possession ; les nouvelles cartes suivent l'ajout local idempotent.
- Geralt en chemise blanche 49900102 reste en attente, non publie.

Les PSD editables, illustrations, profils, prompts et preuves natives sont
conserves dans les lots expansions/2026-10-02-serpes-geralt/ et
expansions/2026-10-02-serpes-mirelle/. Les sources actives sont dans creations/.

## Verification

75 tests passes avec le runtime d'interface deja valide dans Git. Les deux
nouveaux lots sont aussi ajoutes a la verification du workflow Pages.
Les controles natifs conservent le cadre, le rendu PSD rouvert et les anciens
fichiers ; codes-barres reellement lus et champs de texte editables.

Six vues navigateur passent : trois cartes en 1440 x 1000 et 390 x 844,
version 4.3.2, empreintes et pixels compares aux PNG natifs, sans erreur ni
debordement. Rapport : qa/local/report.json.

La compilation locale donne 480 fichiers jouables, environ 473.5 Mio.
Le build reprend l'interface committee en lecture seule ; les changements
locaux independants du classeur et du roman ne sont ni ecrases ni publies.

## Controle Public

Apres le push, verifier le workflow du commit et executer public-check.cjs
avec une compilation du meme commit. Ce controle compare les 480 empreintes,
le catalogue, la version visible et les trois PNG ajoutes. Le controle
navigateur peut egalement viser le site public via KALISTAR_REVIEW_URL.
Une integration locale ou un push seul ne prouve pas la fin du deploiement.

Le premier workflow 36997789496 a detecte que deux tests natifs chargeaient
sharp depuis le chemin Windows du poste. La verification Linux utilise
maintenant portable.test.cjs : profils publies, limites, preuves natives et
projection dans le vrai moteur, sans dependance Photoshop ou graphique.
Les tests natifs locaux et leurs snapshots sont preserves sans modification.
La livraison est reprise en V4.3.4 dans ../2026-10-02-pages-portability/.
Elle preserve la publication concurrente des filtres en 4.3.3 et termine
la livraison des cartes, sans changement de leurs fichiers natifs.
