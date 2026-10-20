# Registre Supabase

Service personnel Kalistar, reference projet `fkskjhlaaagqlfcsojjp`.
Le compte administrateur du tableau de bord est distinct des comptes joueurs Auth.
Aucun compte professionnel ni fichier Drive n'est utilise.

Le schema, les contrats et les limites sont dans le
[guide actif](../../docs/REGISTRE_EN_LIGNE.md). Les migrations sont ordonnees,
additives et conservees telles qu'appliquees ; ne pas les reexecuter aveuglement.
Le premier schema a ete applique dans une base vide avec accord explicite.
La migration `202610160003_private_access.sql` ferme le registre aux utilisateurs
hors liste privee. Elle ne contient ni adresse personnelle ni identite Auth reelle.
Les deux comptes Auth ont ete crees manuellement par leur titulaire, puis relies
aux profils Paris/Tokyo par une operation privee verifiee. Inscriptions publiques
fermees ; cette etape initiale n'avait attribue ni administrateur joueur ni carte.

Les migrations 004/005 ajoutent la progression par compte, ses revisions et le
bail d'ecriture, sans ouvrir les tables privees. La migration 006 evite de
renvoyer tout l'historique lorsque sa revision n'a pas change ou apres une
ecriture deja acquittee. Le client reconstruit ces reponses uniquement depuis
la revision locale verifiee. `starter-grants.cjs` produit
uniquement sous `work/` la distribution initiale explicitement autorisee :
catalogue approuve complet pour Paris, dix cartes legales dont Kaylis pour Tokyo.
Le script est rejouable sans reemission ; aucune adresse/AuthUUID de production
n'est inscrite dans les sources. Ne pas l'utiliser pour offrir automatiquement
les prochaines cartes. Les droits et limites actuels sont dans le guide actif.

Les migrations 007/008/009 imposent un exemplaire par modele/version et ajoutent
les livres a quatre combats. La cle de preuve et le role Paris sont installes
par une operation privee autorisee, pas dans les migrations versionnees.
Voir [Bibliotheque](../../docs/PARCOURS_BIBLIOTHEQUE.md) pour le contrat serveur,
les limites et la procedure d'ajout. La migration 007 refuse une base contenant
deja des doublons ; elle ne supprime ni ne reaffecte aucun exemplaire.

## Tests

Le test PostgreSQL utilise un moteur PGlite ephemere, jamais le projet public :

```sh
npm install --prefix work/supabase-runtime --no-audit --no-fund @electric-sql/pglite@0.5.10
node --test V4/deploy/supabase/registry.test.cjs
node --test V4/site/cloud-registry.test.cjs
node --test V4/site/cloud-session.test.cjs V4/deploy/access-worker.test.cjs
node --test V4/deploy/supabase/player-sync.test.cjs V4/site/cloud-sync.test.cjs V4/site/cloud-ownership.test.cjs
node --test V4/deploy/supabase/unique-models.test.cjs V4/deploy/supabase/journeys.test.cjs
```

`KALISTAR_CLOUD_MODULES` permet de fournir un autre dossier `node_modules`.
Les tests locaux verifient RLS, refus anonymes, activation consommee, compteur
de tentatives persistant, isolation des joueurs et acceptation des transferts.
PGlite serialise ses requetes : ces tests ne constituent pas un test de charge
ou de concurrence multiconnexion du service heberge.

Les parcours navigateur simulent Auth et les reponses privees dans des profils
jetables ; les controles heberges sont limites a la lecture. Un essai distant
d'emission anonyme a ete bloque par le controle de securite avant execution.
Aucune emission distante n'est necessaire pour verifier le droit EXECUTE.
La distribution des lots, demandee par l'auteur, est une operation de production
distincte des tests. `browser-fixture.cjs` utilise le vrai schema PostgreSQL et
des comptes fictifs pour les tests multi-appareils, jamais le service reel.

## Sauvegarde du registre

Avant toute migration de production, exporter puis verifier une sauvegarde
logique privee. `backup.cjs query` produit un SELECT unique : toutes les tables
Kalistar, Auth users/identities, colonnes, dependances et sequences sont lues
dans une photographie PostgreSQL coherente. Aucun droit ou donnee n'est modifie.
Executer ce SELECT dans le projet personnel puis Export > Download CSV. Les
morceaux numerotes et SHA-256 permettent de refuser un export tronque.

```sh
node V4/deploy/supabase/backup.cjs query
node V4/deploy/supabase/backup-local.cjs seal <export.csv> <hors-checkout/registre-date.dpapi>
node V4/deploy/supabase/backup-local.cjs verify <hors-checkout/registre-date.dpapi>
```

`seal` joint les migrations correspondant au schema exporte, restaure les
donnees dans un PostgreSQL PGlite neuf, compare chaque ligne typee et controle
RLS. Il compresse puis chiffre avec Windows DPAPI CurrentUser, rouvre le fichier
pour verifier son integrite et produit un manifeste sans donnees personnelles.
`verify` refait la restauration depuis le fichier chiffre. Aucun outil de cette
procedure n'accepte une adresse de restauration : les essais sont uniquement
locaux, en memoire, sans pouvoir remplacer une base distante.

L'export CSV transitoire contient des donnees sensibles, dont des empreintes
d'authentification et la cle Fragment. Ne pas l'afficher, le publier, le mettre
dans Git ou le conserver en clair apres verification du fichier chiffre.
Le programme refuse de creer la sauvegarde dans le checkout. Le manifeste
seul peut servir de preuve ; les fichiers prives restent hors des rapports Git.

Limites explicites : ce n'est pas un dump complet des services Supabase. Les
sessions Auth, les parametres SMTP/OAuth, les medias et la configuration
Cloudflare restent distincts. L'essai prouve la restauration des lignes et
du schema applicatif, pas le redemarrage d'un serveur Auth complet. Un retour
en production demande un projet de restauration separe et la procedure
officielle Supabase/pg_dump, jamais une suppression de la base courante.

DPAPI depend de ce compte Windows et de ses cles : copier seulement le fichier
chiffre ne constitue pas une sauvegarde portable. Avant ouverture publique,
prevoir un export chiffre portable avec cle de recuperation separee et un
support independant. Aucun disque/cloud supplementaire ni tache planifiee
n'est configure automatiquement. Le rythme recommande est hebdomadaire et
avant migration, avec sept copies recentes, quatre hebdomadaires et six
mensuelles. La rotation est manuelle : aucun fichier prive n'est efface par
les scripts. Le forfait gratuit n'est pas change.

## Archives de progression

La migration 010 separe les snapshots historiques du document courant, sans
effacer ni convertir automatiquement les lignes existantes. Le client utilise
le protocole v2 apres son installation. Appliquer la migration avant le nouveau
site. Un rollback vers un client schema 1 ne peut pas ecrire un payload deja
migre ; conserver le client v2 ou publier un correctif en avant.

Tests supplementaires : `progress-archives.test.cjs`, `backup.test.cjs`,
`V4/site/cloud-archives.test.cjs` et `local-db-performance.browser.test.cjs`.
Le parcours multi-appareils comprend 120 archives derivees de cinq combats
reels simules ; ce test de volume n'est pas une preuve d'equilibrage.

## Possession des equipements

La migration 011 ajoute les droits prives `equipment_grants` et leur lecture
dans `kalistar_player().equipment`. Joueur normal : aucun objet par defaut.
Administrateur serveur : catalogue complet pour les essais. Aucun ajout de
role, d'utilisateur, de secret ou de forfait dans cette migration.

Appliquer apres export chiffre et verification de restauration. Le nettoyage
vise uniquement `user-tokyo` et conserve une copie privee reversible dans
`equipment_reset_backups`; Paris et les snapshots de matchs restent intacts.
Les anciennes ecritures contenant un equipement non possede sont refusees,
jamais silencieusement acquittees avec un contenu different. Le client publie
filtre ses brouillons et imports ; un conflit garde le parcours de recuperation
normal de la synchronisation. Tester avec `equipment-ownership.test.cjs` et
`cloud-sync.browser.test.cjs` (base locale, comptes fictifs).

## Client officiel

`@supabase/supabase-js` 2.118.0, distribution npm officielle, licence MIT.
Le bundle UMD original est copie sans modification dans
`V4/site/assets/supabase/supabase-2.118.0.js`, avec sa licence.
Ces fichiers distribues sont sauvegardes hors Git et inscrits au registre des
medias. Le login et le jeu partagent un seul client Auth ; aucun CDN tiers
n'est sollicite par le navigateur.

- Bundle SHA-256 : `ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3`.
- Licence SHA-256 : `334dd6820e2eaeab2064e7c59001b810566728a28a41a7c1dbf69bbee17d0936`.
- Integrite npm : `sha512-FxI8UXMVC2UG7IkeiI8fuQZqq2oI3JeSuN8MPIC2RLVaoEAxKS0nqE6kii9Ewpq8f9gNPM6git1Y8f0vN/QLFw==`.

Le navigateur n'utilise que la cle publishable du projet. Aucune cle secret,
service_role, mot de passe de base ou jeton d'administration n'est necessaire
au site. Ne jamais ajouter ces secrets a Git, aux captures ou aux sauvegardes joueur.
