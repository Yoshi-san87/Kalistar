# Rapport UI et BDD V3

## Perimetre livre

- `V3/site/app.js` : namespace `kalistar.v3.`, import de parties schema 6, refus explicite V2, arenes issues de `data.arenas`, choix via `E.setArena` en setup seulement, apercu/calcul des bonus via `E.arenaBonuses`, Guard humain et IA, badge ward 60, journal et regles V3, gestion NONE. Cinq decks predefinis dans Mon deck avec commande Charger et choix du deck IA pour la prochaine partie confirmee.
- `V3/site/local-db.js` : IndexedDB `kalistar-v3-cards`, exemplaires `K3-<id>-001`, index `characterId`, exports edition V3 / schema de bibliotheque 2 / schema de partie 6, imports valides avant transaction, resultats recalcules, conflits de resultat final incluant l'arene refuses, inspection des quatre tables.
- `V3/site/catalogue.js` : regroupement exclusivement par `characterId` stable (repli identifiant de carte), Momo seul en deux versions, inspection JSON de la BDD, presentation NONE sans cristal.
- `V3/site/match-report.js` : gardes et bonus d'arene visibles dans le bilan, portraits pris dans les vignettes jeu.
- `V3/site/combat-effects.js` : acquisition et attribution Guard, bouclier physique lors de la consommation ward, aucun projectile magique pour NONE.
- `V3/site/duel-focus.js` : garde-fou NONE dans le peintre de halos.
- `V3/site/duel-presentation.css` et `V3/site/v3.css` : ratio jeu `797/1388`, images en contain, fantome de drag et fiche coherents, centre sans scroll interne et dimensions de des fixes, styles Guard/NONE/BDD. Le parent garde la main sur `v3.css` et a preserve l'ornement central V2 ; aucune modification de styles pour les presets.
- `V3/site/index.html` : edition V3 et chargement du style V3.
- Nouveau `V3/scripts/verify_site_v3.cjs` : verification reproductible dans Chrome headless, profil temporaire isole, serveur de test temporaire ferme en fin de passe.
- Nouveau `V3/scripts/verify_presets_v3.cjs` : verification navigateur ciblee des cinq decks, de leurs preferences V3 et de la preservation des parties, sans QA des assets.

Aucune modification de ce chantier dans `engine.js`, `data.js`, `donnees`, les assets, les impressions ou V2. `formation-drag.js` reste inchange ; son fantome suit le nouveau ratio CSS.

## Contrat images

- Vignettes : `V3/site/assets/cards/<slug>.webp`.
- Cartes jeu haute resolution : `V3/site/assets/cards/<slug>-full.png`, 797 x 1388.
- Recadrage attendu : left 50, top 50, width 797, height 1388. Aucun recadrage destructif effectue par l'UI.
- Telechargement impression : `../cartes/<slug>.png`, natif 897 x 1497.
- Illustration : `c.art` relatif a V3, prefixe `V3/` optionnel normalise. Si absent du bundle, repli sur `../assets/illustrations/<slug>.png`.
- L'UI demande `assets/effets/guard.png` sous V3 ; en attendant cet asset, repli sur le bouclier physique existant `shield_physical.png`.

## Tests

Depuis la racine du projet :

```powershell
node V3/scripts/verify_site_v3.cjs --require-final
node V3/scripts/verify_site_v3.cjs --mock
node V3/scripts/verify_site_v3.cjs --require-final --require-assets
node V3/scripts/verify_db_engine_contract.cjs
node V3/scripts/verify_presets_v3.cjs
```

La commande `verify_site_v3.cjs --require-final --require-assets` exige aussi toutes les images et les bons recadrages. Sans `--require-assets`, les manques d'assets sont des gaps explicites, separes du resultat UI/BDD. Le mode automatique utilise des profils mockes uniquement si les donnees finales sont absentes ; le moteur V3 reel reste utilise.

`report.json` : passe sur le vrai roster, 41 cartes / 40 personnages / 16 arenes, 13 groupes de controles valides, aucune exception navigateur. `mock/report.json` : mode mock valide, 12 groupes (sans le smoke test file://). Le test de contrat de la revue independante passe egalement : 9 controles, aucun echec.

Correction post-revue : `local-db.js` valide puis recopie explicitement `m.arenas` lors de l'import. Le catalogue courant ne remplace plus le snapshot historique. Les contraintes mecaniques sont verifiees par le moteur, ainsi que la presence de l'arene de la rencontre dans le snapshot. Les catalogues absents, malformes ou incoherents sont refuses avant toute transaction d'ecriture. Aucun recalcul des jets historiques : etat, formules et scores restent identiques ; les compteurs restent derives des evenements valides comme auparavant. Le test ajoute couvre les metadonnees et bonus historiques differents du catalogue courant, le round-trip exact, le detachement des objets importes et 12 variantes invalides sans mutation. Seul fichier de production modifie pour ce correctif : `V3/site/local-db.js`.

Controles : regroupement Momo et characterId, choix/verrouillage arene, Guard sur allie/auteur/IA et remplacement du trait, animation avec mouvement, ward physique consomme et magie/esquive/Mort conserves, concordance formule UI/moteur, affinite commune aux deux Momo, imports V2 sans ecriture, archivage et imports idempotents, refus de conflit d'arene finale, preservation de sentinelles V2 en localStorage et IndexedDB, NONE avec/sans metadonnees, chemin c.art, inspection BDD et ouverture directe index.html.

Captures et controles canvas aux largeurs 360, 390, 1440 et 2560 px. Le centre n'a pas de defilement interne ; le plateau garde sa navigation horizontale et la page peut defiler verticalement. Les PNG de captures sont dans ce dossier.

## Cloture presets

Derniere passe ciblee du 14 septembre 2026 : `node V3/scripts/verify_presets_v3.cjs`, code de sortie 0, **10/10 controles**, cinq decks couvrant les **41 cartes**, aucune exception navigateur et aucune source modifiee pendant le test. Empreintes SHA-256 abregees : `app.js` = `d0b192fe8141`, `data.js` = `f8381040eb2b`.

- Les decks `player`, `enemy`, `z13`, `cites` et `frontieres` passent tous `validateDeck`.
- Choisir un preset ne charge pas le deck ; la commande Charger copie ses cartes et son nom dans Mon deck. Modifier ce deck ne modifie jamais les presets sources.
- Les choix sont persistes sous `kalistar.v3.deckPreset` et `kalistar.v3.enemyDeckPreset`. Les preferences inconnues ou invalides reviennent aux decks initiaux valides.
- Le deck en preparation et le choix IA survivent au rechargement. Selectionner, charger ou annuler la nouvelle partie laisse strictement intacts le match actif et son etat en BDD.
- Chacun des cinq decks adverses est verifie dans une nouvelle partie confirmee ; ensemble, ils exposent les 41 cartes. Le mode local propose le meme choix sous le libelle Deck du joueur 2.
- Deck incomplet et preset invalide sont refuses, y compris par soumission forcee, sans remplacer la partie. Les preferences V2 restent intactes.
- Les nouveaux controles restent dans leurs dialogues a 360 et 1280 px ; les libelles IA tiennent dans le selecteur.

Le test utilise les donnees finales et le moteur reel dans des contextes Chrome temporaires isoles. Seul le scenario de refus altere volontairement un preset dans une copie des donnees. Les images sont substituees en memoire et aucune capture n'est produite : cette passe ne valide ni les rendus natifs, ni les recadrages, ni les impressions. Le bilan JSON est emis sur stdout, sans ecraser les rapports de la QA complete.

Perimetre de cette integration : `V3/site/app.js`, `V3/scripts/verify_presets_v3.cjs` et ce README. Contrat BDD/moteur relance apres integration : **9/9**, sans echec. Aucun changement de regles, de BDD, de `v3.css`, d'assets ou d'impressions pour ce lot.

## Controle final des rendus

Passe finale du 14 septembre 2026, 11:07 UTC : `verify_site_v3.cjs --require-final --require-assets` termine avec le code 0. Le rapport confirme 41 cartes, 40 personnages, 16 arenes, 13 groupes de controles, aucun asset absent, aucune geometrie incorrecte et aucune exception navigateur. Les anciens manques pendant la production sont resolus.

Les captures desktop et mobile ont ete inspectees. Le ratio recadre est applique aux cartes du jeu ; leur taille par defaut tient compte de la hauteur disponible sur desktop. Les ornements V2 du panneau central sont conserves. Les des 3D sont controles par pixels : image non vide, hauteur lisible, deux images differentes pendant le lancer et face finale attendue. Le centre reste sans defilement interne.

Les 41 PSD, TIFF CMJN 300 ppp et PNG ont passe `verify_outputs.cjs`. Les six illustrations protegees sont identiques aux sources V2 et leur cadrage imprime est identique ; aucun pixel lumineux n'est retire par le recadrage du jeu. Les codes-barres couleur, monochromes et integres aux 41 exports ont tous ete decodes, soit 123 controles. Les planches de verification des 41 cartes sont dans `../verification/cards-*.jpg`.
