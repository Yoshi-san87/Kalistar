# Atelier Kalistar V4

## Atelier interactif et jeu V4

Le lanceur `Lancer-Kalistar.cmd`, a la racine du projet, ouvre directement `/jeu/`. `Lancer-Atelier.cmd` conserve l'ouverture de `/jeu/#atelier`. Le jeu V4 dispose des onglets Collection, Decks, Arene et Atelier. Son catalogue contient uniquement les cartes V4 approuvees du verrou courant, puis les nouvelles creations validees. La V3 et ses sauvegardes restent separees et inchangees.

L'Atelier demarre sur une carte vierge, avec le logo Kalistar dans l'illustration. Il n'utilise aucun prompt ni service de generation d'images. Choisir le cristal, la race, l'arme, la faction et les positions ; chaque face ATK/DEF peut porter une valeur ou un effet propose par le moteur. Les cases de magie et de barriere s'appliquent aux valeurs numeriques. Sans cristal, elles sont desactivees. Le Reraise exige P5, et la garde P1 ou P5, conformement aux regles du jeu conservees.

Importer un PNG/JPEG/WebP (8 Mo maximum), puis ajuster son zoom et son cadrage par glissement ou avec les curseurs. Les changements actualisent l'apercu sans lancer Photoshop. Celui-ci utilise des composants raster extraits des PSD approuves et les polices installees ; le PNG final natif remplace cet apercu apres controle.

**Creer la carte** fige la fiche, attribue un nouvel identifiant, compose un PSD a objets dynamiques separes et textes natifs, puis controle le rendu reouvert et le code-barres. La publication valide aussi le profil de jeu. Un echec ne modifie pas le catalogue.

- Catalogue persistant : `../donnees/catalogue.json`.
- Nouvelle creation : `../creations/<identifiant>/card.png`, `card.psd`, `profile.json` et `verification.json` ; illustration originale conservee lorsqu'elle est importee.
- Brouillons et travaux : `data/designer/`.
- Composants valides : `designer-assets/manifest.json`, references et empreintes d'origine conservees.
- Collection du navigateur : IndexedDB `kalistar-v4-cards`, independante de la V3. Paris recoit les nouveaux originaux une seule fois ; Tokyo reste vide au depart. Les transferts existants ne sont pas annules lors d'une actualisation.

L'onglet Atelier reste monte quand on change de vue. Apres une publication, le jeu propose **Nouvelles cartes** pour actualiser sa collection sans perdre le match en cours. Les compositions sont serialisees. Une demande repetee ne cree pas de doublon ; les travaux interrompus sont repris seulement lorsque leur processus et le pont Photoshop ne sont plus actifs.

Le service reste personnel et local, sans authentification de production. Un identifiant de modele/code-barres n'est pas une preuve de propriete physique. Le verrou des sources approuvees reste actif ; aucune carte existante n'est remplacee.

Tests du nouveau parcours : `designer.test.cjs`, `designer-api.test.cjs`, `designer-publication.test.cjs`, `designer-recovery.test.cjs`, `game-catalog.test.cjs`, `designer-browser.test.cjs`, `../site/browser.test.cjs` et `../site/catalogue-evolution.test.cjs`. `designer-qa.cjs --native` effectue une composition de controle non publiable, distincte des creations utilisateur. `--element=HYDRO` couvre aussi les longs textes et une image transparente ; `--element=NONE` couvre les effets sans magie.

Les rapports natifs et les captures d'interface sont dans `data/designer/verification/`. Le controle natif exige un cadre fixe identique aux composants, une difference maximale de deux niveaux par canal sur leur composition, un PSD reouvert identique au PNG et quatre lectures du code-barres. Les petits arrondis lies a l'extraction des transparences depuis Photoshop sont documentes separement dans `designer-assets/proof/QA.md` ; les cartes originales ne sont pas recomposees ni remplacees.

## Atelier historique

La premiere interface reste accessible a `/legacy` : declinaisons de cartes validees, avec rendu Photoshop natif. Les sections suivantes documentent ce parcours conserve, pas les nouvelles creations interactives.

## Lancement

Double-cliquer sur `../../Lancer-Kalistar.cmd` pour le jeu, ou `Lancer-Atelier.cmd` pour l'Atelier. Le serveur existant est reutilise ; sinon il demarre en arriere-plan, puis le navigateur ouvre l'adresse effective. Le service ecoute uniquement sur `127.0.0.1`, port 4304 ou un port libre jusqu'a 4324. Le lanceur cherche Node dans le runtime local, puis dans le PATH. Cela ne rend pas le moteur natif portable : ses autres dependances restent a configurer sur un nouveau poste, et Photoshop 2025 est necessaire aux rendus. Aucune installation reseau ni compte externe.

Pour verifier le demarrage sans ouvrir de navigateur : `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File start.ps1 -View Game -NoBrowser`. Tests isoles du lanceur : `node --test start.test.cjs`.

Le raccourci `Kalistar.lnk`, a la racine, utilise le favicon du site converti en
icone Windows multi-resolution (`../site/assets/kalistar.ico`, source V3 inchangee).
`Lancer-Kalistar.cmd` le recree avec les chemins du poste courant. Apres transfert
sur un autre PC ou deplacement du dossier, ouvrir le `.cmd` une fois. Le `.lnk`
reste local et exclu de Git ; le lanceur et son icone sont des fichiers du projet.

Le lanceur demarre le service en arriere-plan puis ouvre le navigateur. Le script Photoshop est execute avec RemoteSigned uniquement pour son processus PowerShell, sans changer la politique Windows permanente.

## Ce qui est disponible

- Choix parmi les cartes du verrou courant et les brouillons enregistres.
- Nom, version, metier, recit, valeurs ATK/DEF, effets deja calibres pour chaque emplacement, magie/barrieres et positions P1 a P5.
- Import d'une illustration PNG, JPEG ou WebP fixe, cadrage plein dans la fenetre d'illustration existante.
- Sauvegarde des fiches, file de composition sequentielle, comparaison Reference / Brouillon et exports PNG / PSD modifiable.
- Controle technique obligatoire avant l'acces aux exports.

Le cristal, la race, l'arme, la faction et l'identifiant de modele restent ceux du modele choisi dans cette premiere etape. Les assemblages inter-familles et la creation de nouveaux identifiants sont volontairement hors perimetre. Un brouillon n'est pas une nouvelle carte publiee, un exemplaire de collection ou une preuve de propriete. Aucun raccordement au jeu V3, aux comptes, aux decks ou a la BDD.

## Verrouillage du design

`data/references.json` recense les PSD/PNG/profils approuves et les empreintes des fichiers proteges, dont les maitres et les scripts de rendu stables. Les effectifs courants viennent de `cards.length` et des cles de `protectedFiles`, pas d'un total historique fige. `freeze.cjs` refuse de remplacer une reference existante. Ne jamais supprimer/recreer ce verrou pour faire passer un test : une evolution du design exige une nouvelle validation explicite. La revision des raccords non Electro du 18 septembre 2026 conserve le verrou precedent, les originaux et les preuves dans `../revisions/2026-09-18-branches/` ; `complete.json` y consigne son controle final.

Chaque modele est son PSD V4 deja valide, pas une reconstruction a partir de la V3. `renderRegistered` remplit ses champs natifs avec les calibrages de sa version exacte. `E.setDescription` sert uniquement lorsqu'un recit change. Les banques absentes du modele ne sont pas proposees. Aucune couleur, ombre, police ou texture structurelle n'est regeneree.

Le rendu utilise la meme fonction de composition. Un index temporaire accelere la recherche des calques sans changer les objets natifs. Ses traces internes de noms sont allegees ; les preuves font l'objet de captures natives separees. En regression, les controles portent sur le PNG complet et sur les champs natifs du PSD reouvert. Pour un brouillon modifie, toutes les couches sont auditees avant/apres et le cadre fixe est compare en pixels.

Les sorties restent dans `data/jobs/<UUID>/`. Aucun chemin de sortie n'est fourni par le navigateur. Les PSD de reference sont seulement ouverts, dupliques et refermes s'ils ont ete ouverts par l'Atelier. Une source ouverte avec des changements non enregistres provoque un arret. Les documents preexistants de l'utilisateur restent ouverts.

## Preuves avant composition

La reproduction de toutes les cartes du verrou courant ouvre les references PSD, applique leurs donnees, sauvegarde puis reouvre un PSD temporaire et compare les PNG aux originaux : zero pixel different attendu. Les textes natifs, les positions, les modes et quatre lectures du code-barres sont controles. Les sources sont rehachees avant/apres. Le resultat n'est valable que pour l'empreinte courante du moteur Atelier. Toute modification du moteur exige de refaire le controle complet.

Le PSD temporaire de regression est reutilise puis retire ; les PSD de reference ne sont pas dupliques durablement. Les brouillons exportables conservent leur PSD. La lecture du code-barres sur papier et la preparation CMJN ne font pas partie de ce test.

Une generation modifiee compare aussi le cadre fixe, les proprietes des calques proteges et tous les pixels hors des composants modifiables. Un texte trop long ou un effet non calibre bloque le rendu au lieu de deformer le design. Le PNG d'une fiche modifiee reste marque comme rendu precedent tant que Photoshop n'a pas termine la nouvelle composition.

## Securite locale

- Ecoute sur l'interface loopback uniquement, Host exact et refus des requetes cross-site.
- Requetes d'ecriture avec origine exacte et jeton de session aleatoire ; aucune politique CORS permissive.
- Pas de commande, JSX, chemin, identifiant de modele ou calque fourni librement par le client.
- Imports images limites et decodes avant stockage, fichiers servis via une liste fermee.
- Une composition Photoshop a la fois, verrou de processus et mutex local.
- Controle de revision des brouillons pour eviter les ecrasements entre fenetres.

Cette protection vise un atelier personnel sur un poste de confiance. Ce n'est pas une authentification multiutilisateur et il ne faut pas exposer le service sur Internet. Ne pas lancer d'autres scripts Photoshop de production en parallele.

## Maintenance et tests

- `node test.cjs` : schema, confinement des chemins, origine/jeton HTTP, originaux en lecture seule et conflits de brouillons.
- `node runner.cjs` : reproduction native de toutes les references courantes ; duree dependante de Photoshop.
- `node smoke.cjs` : apres la reproduction conforme, cree un brouillon Momo de test avec import d'image, textes, chiffres, effets et cinq positions ; aucun original n'est remplace.
- `data/regression.json` : dernier bilan, valide uniquement pour le moteur courant.
- `data/jobs/<UUID>/verification.json` : preuve de chaque travail.
- `data/server-error.log` : erreurs du service.

## Reception du 18 septembre 2026

`data/acceptance.json` conserve le controle initial, anterieur a la revision des raccords : 26 references reproduites avec zero pixel different, 162 fichiers proteges intacts, 6 tests automatises reussis. Le brouillon **MOMO ATELIER / ESSAI ATELIER** a ete compose depuis l'interface avec import de l'illustration existante, nouveaux textes, valeurs, effets, barriere et cinq positions. Son cadre fixe reste identique, aucun pixel ne change hors des composants autorises, et le PSD reouvert restitue exactement le PNG. Les exports HTTP PNG et PSD ont ete verifies par empreinte. Le verrou courant et `data/regression.json` font autorite pour les modeles actuellement servis.

L'interface a ete controlee sur ordinateur et mobile. Les brouillons exportes restent accessibles par l'historique des compositions, y compris apres rechargement. Ce Momo est un essai technique, pas une nouvelle version canonique ni une modification du Momo approuve.

Si le poste ou le service est interrompu pendant une composition, ne pas relancer automatiquement le travail : verifier d'abord l'etat de Photoshop. Le verrou `data/render.lock` bloque les rendus concurrents. Les controles techniques ne remplacent pas la validation artistique d'un nouveau contenu.
