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
fermees, aucun administrateur joueur ni exemplaire reel attribue.

## Tests

Le test PostgreSQL utilise un moteur PGlite ephemere, jamais le projet public :

```sh
npm install --prefix work/supabase-runtime --no-audit --no-fund @electric-sql/pglite@0.5.10
node --test V4/deploy/supabase/registry.test.cjs
node --test V4/site/cloud-registry.test.cjs
node --test V4/site/cloud-session.test.cjs V4/deploy/access-worker.test.cjs
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
