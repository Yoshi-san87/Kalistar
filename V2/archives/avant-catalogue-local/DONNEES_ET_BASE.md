# Kalistar V2 : donnees et future base

## Aujourd'hui

Le catalogue est dans `donnees/cartes.json`, les regles dans les autres JSON de ce dossier, et leur copie chargee par le site dans `site/data.js`.

Le navigateur conserve la partie, le deck et les preferences dans `localStorage` sous `kalistar.v2.*`. Ce stockage depend du navigateur et de l'origine du site : il ne synchronise pas deux appareils et peut disparaitre quand les donnees du navigateur sont effacees. Garder les exports JSON pour les sauvegardes importantes, surtout avant de passer du fichier local a un site heberge.

La sauvegarde de partie (schema 4) contient maintenant :
- `arenaId` : `ruins`, `sanctuary` ou `forge`.
- `match.version = 1`, `match.fromRound`, `match.partial`.
- `match.events` : un evenement final par echange, avec UID attaquant / defenseur, scores, kill, arret, effets, soutien et beneficiaire, nombres de jets.

`engine.matchStats(state)` transforme ces evenements en totaux par equipe et par unite. L'export du bilan contient ces totaux ; l'export de partie conserve aussi les evenements et tout l'etat. Une version de carte (`cardId`) n'est pas une unite de match (`uid`) : deux exemplaires ont des statistiques distinctes.

Les sauvegardes anterieures sans evenements restent valides. Le nouveau suivi commence au prochain duel resolu. Le palmares indique clairement que les anciennes actions manquent.

## Priorite : cartes uniques et historique permanent

La premiere etape souhaitee est d'enregistrer les cartes elles-memes, avant les comptes et les decks en ligne. Ce modele est une proposition ; aucune base n'est encore connectee.

Il faut distinguer :
- La version (`cardId` actuel, par exemple `00000001`) : personnage, illustration, cristal, valeurs imprimees.
- L'exemplaire unique (`cardInstanceId` permanent) : une carte precise, avec un numero de serie / code-barres unique et son historique propre. Deux exemplaires du meme personnage peuvent partager la version, mais pas cet identifiant.
- L'unite de match (`uid` actuel, par exemple `0-3`) : identifiant temporaire qui recommence a chaque rencontre. Il ne suffit pas pour le suivi sur plusieurs matchs.

Modele minimal, dans cet ordre :

| Table | Contenu |
| --- | --- |
| card_versions | Les 20 profils actuels, illustrations et regles imprimees |
| card_instances | Identifiant permanent, version, numero de serie / code-barres UNIQUE, date de creation |
| matches | UUID de rencontre, resultat final, version des regles, date |
| card_match_results | Match + exemplaire, equipe, presence sur le plateau, kills, defense, soutiens, resultat |

Le jeu devrait charger les exemplaires enregistres dans le deck et conserver leur identifiant dans les unites et exports. Le code-barres serait une cle de recherche vers cet exemplaire. Les codes actuels identifient les versions : imprimer plusieurs exemplaires avec le meme code ne les rendrait pas individuellement identifiables. Une reimpression du meme exemplaire ne doit pas creer une nouvelle identite par accident.

Les victoires, defaites, nuls, kills, arrets et soutiens seraient calcules depuis les lignes de matchs enregistrees, plutot que par des compteurs sans historique. Une contrainte unique sur le couple (match, exemplaire) empecherait un rechargement ou un second envoi d'ajouter deux fois les statistiques. Un exemplaire ne pourrait pas figurer simultanement dans les deux equipes d'un meme match reel.

Convention proposee, a valider lors de l'implementation : victoire / defaite attribuee aux cartes effectivement entrees sur le plateau, pas a une carte restee en reserve tout le match. Les matchs nuls sont distincts ; une partie abandonnee ou incomplete ne doit pas etre comptee automatiquement comme une defaite.

Les anciens matchs ne permettent pas de reconstruire l'historique d'exemplaires physiques inconnus. L'identite permanente et le suivi individuel commenceraient a l'enregistrement des exemplaires, avec une migration explicite pour les cartes de demo.

## Option pour passer en ligne

Recommandation : un projet Supabase, pour regrouper PostgreSQL, les comptes joueurs et le stockage des images. Le site serait heberge en HTTPS et non plus ouvert uniquement en `file://`.

Extensions possibles apres le registre de cartes :

| Table | Contenu |
| --- | --- |
| profiles | Identifiant du compte, pseudo |
| decks | Identifiant, proprietaire, nom, liste des 10 exemplaires permanents |

La priorite est le registre `card_versions` / `card_instances`, puis les resultats par carte. Les comptes et la synchronisation des decks peuvent venir ensuite. Garder les gros PNG dans un stockage de fichiers, avec leur chemin en base, pas dans les lignes JSON.

Pour le prototype : connexion joueur, sauvegarde / reprise de partie, historique personnel et synchronisation entre appareils. L'identifiant de rencontre doit etre un UUID independant de la graine des des. Utiliser des ecritures idempotentes et un numero de revision pour eviter les doublons et l'ecrasement d'une partie par un autre appareil.

## Securite et classement

- Chaque joueur ne lit et ne modifie que ses donnees, via des politiques RLS liees a son compte.
- Seule la cle publique (publishable) va dans le navigateur. Jamais une cle secrete ou `service_role` dans les fichiers HTML / JS.
- Le moteur actuel tourne chez le joueur : les scores, les des et les sauvegardes peuvent etre modifies localement. Les bilans du prototype ne sont donc pas une preuve fiable pour un classement public.
- Pour du competitif ou du multijoueur : le serveur valide les actions, genere les jets et calcule les resultats. Les joueurs ne peuvent pas ecrire directement leurs victoires ou leurs statistiques officielles.
- Tester les regles d'acces avec deux comptes differents avant ouverture au public.

Aucune connexion a une base, creation de compte ou publication n'a ete effectuee dans cette revision. Le raccordement est une etape distincte.

## Documentation officielle consultee

- [Base PostgreSQL et services Supabase](https://supabase.com/docs/guides/database/overview)
- [Acces par joueur : Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Cles publiques et secretes](https://supabase.com/docs/guides/getting-started/api-keys)

## Verification locale

`site/engine.test.cjs` : 58 tests et 100 campagnes deterministes.
`site/match-stats.test.cjs` : 13 tests, dont 20 campagnes completes comparant les kills aux morts reelles.
`scripts/verify_match.cjs` : scores par cote, decors, palmares, export, sauvegardes anciennes, affichage 320 a 2493 pixels.
