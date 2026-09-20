# Kalistar V2 : base locale et historique

## Fonctionnement actuel

Le site reste autonome : ouvrir `site/index.html`. Aucun compte, serveur, abonnement ou service en ligne n'est utilise.

La mini-base IndexedDB `kalistar-v2-cards` est creee dans le navigateur a la premiere ouverture de cette revision. Elle contient les 20 profils actuels, les exemplaires uniques de demonstration, les rencontres et leurs performances. Les images restent dans V2 : la base ne duplique pas les gros PNG.

L'icone de base dans la barre de la collection ouvre **Archives personnelles** : bilan du registre, rencontres enregistrees, export JSON et import. L'import fusionne les donnees ; il n'efface pas la base existante.

Important : ce n'est pas un fichier SQLite dans V2. La base appartient au profil du navigateur et a l'origine de la page. Changer de navigateur, de chemin local ou passer a un site heberge peut ouvrir un autre stockage. Effacer les donnees du navigateur peut la supprimer. Le mode prive n'est pas un stockage durable. Conserver regulierement un export JSON, ainsi que le dossier V2 pour les images.

## Identites

- Personnage : regroupement des versions par nom, par exemple MOMO.
- Version : `cardId`, par exemple `00000001`, avec illustration, texte, cristal et statistiques imprimes.
- Exemplaire : `instanceId`, par exemple `K2-00000001-001`, conserve entre les matchs.
- Unite temporaire : `uid`, par exemple `0-3`, utilise uniquement dans une rencontre.
- Rencontre : `matchId`, UUID independant de la graine des des. Deux matchs avec la meme graine restent distincts.

Le prototype enregistre un premier exemplaire de chaque version. Les exemplaires supplementaires sont crees automatiquement quand les decks en ont besoin. L'attribution suit l'ordre des cartes du joueur 1, puis du joueur 2 : le premier exemplaire utilise `001`, puis `002`, etc. Chaque exemplaire n'apparait qu'une fois par match, meme si les deux camps choisissent la meme version. Le registre peut contenir jusqu'a quatre exemplaires d'une version (deux par deck).

Pour la demonstration, le numero de serie du premier exemplaire reprend le barcode existant : `00000001`. Une copie supplementaire utilise `00000001-002`, etc. Les barcodes dans les images imprimees ne sont PAS regeneres : avant de commercialiser plusieurs copies physiques de la meme version, il faudra leur imprimer ces numeros individuels. Une photocopie du barcode actuel n'est pas un nouvel exemplaire identifiable.

Les anciennes sauvegardes migrent vers le schema 5 sur une copie, sans modification du fichier importe. Leur identifiant de rencontre est une empreinte deterministe de la sauvegarde complete ; reimporter exactement le meme fichier ne cree donc pas un nouveau match. Deux anciens fichiers differents ne peuvent pas etre reconnus avec certitude comme la meme rencontre, puisqu'ils ne portaient pas d'UUID.

## Tables

| Magasin IndexedDB | Cle | Contenu |
| --- | --- | --- |
| versions | id | Profils actuels et chemins des illustrations |
| instances | id | Version, numero de copie, serie unique, date d'enregistrement |
| matches | id | Etat complet, bilan, regles et profils au moment de l'enregistrement, dates |
| results | matchId + instanceId | Participation et performances individuelles d'un match termine |

`localStorage` continue de conserver la partie courante, le deck et les preferences sous `kalistar.v2.*`. Cela preserve la reprise existante. IndexedDB ajoute le registre et l'historique ; la sauvegarde de collection exporte cette base. Le deck et les favoris restent des preferences separees (le deck garde son export dedie).

Les sources editoriales restent `donnees/cartes.json` et les autres JSON, recopies dans `site/data.js` pour le chargement sans serveur. Les profils courants de la base sont actualises depuis ces sources au lancement. Changer une illustration ou corriger un texte en conservant le meme ID ne remet pas la carriere a zero. Pour une nouvelle version de jeu du personnage, creer un nouvel ID. Les profils historiques sont preserves dans les exports ; l'affichage du catalogue utilise les visuels actuels.

## Decompte

Seuls les matchs termines avec un historique complet alimentent la carriere. Une carte doit etre entree sur le plateau au moins une fois. Une reserve jamais deployee ne recoit ni victoire ni defaite. Une partie abandonnee ou en cours n'est pas une defaite ; un nul est distinct.

La fiche affiche les chiffres d'une version, puis permet de choisir un exemplaire particulier. La vue agregee additionne les participations des exemplaires, y compris ceux joues par le Veilleur. Ce n'est pas uniquement le taux de victoire du joueur humain.

- Kills : eliminations effectives ; un Reraise consomme n'est pas un kill.
- Stop : defense suffisante, esquive ou bouclier approprie.
- Buffer : nouveau trait accorde, a soi ou a un allie. Renouveler exactement le meme trait est exclu.
- Debuffer : modificateurs ATK negatifs d'armes et de cristaux, plus barrieres, credites au defenseur dans les duels numeriques.
- MVP : indice = 5 x kills + 3 x stops + 2 x soutiens + vies sauvees + partie entiere(debuff / 30).
- ATK / DEF cumulees : scores finaux, sans addition des relances intermediaires. Le jeu n'utilise pas de blessures persistantes.

Les ex aequo sont conserves. Les sauvegardes anciennes sans evenements affichent un bilan partiel et n'alimentent pas la carriere. Pour les anciens evenements disposant deja de statistiques mais pas du champ debuff, seule la barriere connue est comptee : les autres reductions passees ne sont pas inventees.

## Protection des sauvegardes

Une ligne unique par rencontre et exemplaire empeche les doublons au rechargement. Une rencontre terminee est figee. Un ancien etat en cours ne l'ecrase pas ; deux resultats differents portant le meme identifiant sont refuses.

Les imports sont controles avant ecriture. Les resultats individuels sont recalcules depuis les sauvegardes de matchs validees, jamais recopies depuis des compteurs fournis par le fichier. La fusion est transactionnelle : un conflit annule tout l'import. Un ancien instantane en cours n'ecrase pas une version locale plus recente.

Cette protection vise les erreurs d'utilisation du prototype personnel. Ce n'est pas un systeme anti-triche : le code et les sauvegardes restent modifiables localement. Aucun multijoueur ni classement public n'est raccorde.

## Sources et verification

Implementation : `site/local-db.js`, `site/catalogue.js`, `site/catalogue.css`, integration dans `site/app.js` et schema 5 dans `site/engine.js`.

- `site/engine.test.cjs` : 61 tests et 100 campagnes deterministes.
- `site/match-stats.test.cjs` : 14 tests, dont 20 campagnes completes.
- `scripts/verify_catalogue.cjs` : vraie IndexedDB dans Edge, import/export, anti-doublons, conflits atomiques, exemplaires, carriere, 15 personnages et 20 versions, 320 a 2493 px.
- `scripts/verify_heart.cjs` : jet reel, beneficiaire, animation, IA, rechargement, double clic, interruption.
- `scripts/verify_console_fit.cjs` : 16 scenarios reels sur 6 largeurs, sans defilement interne ni deplacement des des.
- `scripts/verify_site.cjs` : partie complete via l'interface, reprise, imports, puis 12 echanges contre l'IA.
- `scripts/verify_match.cjs` : palmares, export, filtres et trois arenes.

Archive avant cette revision : `archives/avant-catalogue-local/`. Aucun changement des 20 cartes imprimees, PSD, TIFF, PNG, PDF ou ZIP.

Documentation technique consultee : [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [bordures par image](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-image).
