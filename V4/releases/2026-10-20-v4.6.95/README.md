# Kalistar 4.6.95 - Mon compte

## Perimetre

Mon compte devient une page `#account`, et non une fenetre modale.
Navigation laterale sur PC, grille compacte sur smartphone, cristal rainbow,
typographie et filets Kalistar. Aucun nouveau media ni animation permanente.

- Compte : identite publique, email de connexion en lecture seule, deconnexion
  par le parcours existant de sauvegarde et de liberation de session.
- Transferer une carte : choix d'un exemplaire, destinataire, confirmation,
  reception/refus/annulation et historique. Pas de seconde galerie Collection.
- Parametres : consentement de visibilite du pseudo, etat de synchronisation,
  acces aux archives et formulaire de changement du mot de passe.
- Contact : `contact@Kalistar.com`, affichee comme non active a la demande du
  proprietaire. Pas de lien mail tant que la boite n'est pas creee.
- Facturation / paiements : etat explicite d'indisponibilite, sans formulaire
  bancaire, faux historique, nouveau prestataire ou abonnement.

Certificats publics et activation restent accessibles depuis Transferts.
Emission reservee au role admin serveur, jamais deduit d'un email.
Les liens `?registry=1&specimen=...` ouvrent le certificat puis sont consommes
pour ne pas ecraser une rubrique lors du prochain rechargement.
Les sous-routes supportent le retour navigateur. Les secrets sont effaces au
depart de la rubrique ; une requete tardive ne peut pas les faire reapparaitre.

## Verification

`account-page.browser.test.cjs` : cinq formats (1440, 2532, Razr 412, compact
320 et paysage tactile 1007), migration PostgreSQL reelle en memoire, identites
fictives uniquement. Profil et nom long, consentement, formulaire de mot de
passe, synchronisation sans ecrasement du formulaire, transfert confirme,
doublon de version refuse, annulation et acceptation, droits Tokyo, certificat,
secret a usage unique, retour navigateur et reponse tardive.

`login.browser.test.cjs` : integration du vrai jeu et du SDK officiel sur cinq
formats, acces obligatoire, sauvegarde du profil, navigation/rechargement de
Mon compte, acces aux controles sous la navigation mobile, deconnexion et
conservation des donnees. Aucune connexion ou mutation de compte reel.

`cloud-registry.browser.test.cjs` conserve les tests du SDK reel sur cinq
formats : code de modele refuse, activation refusee puis acceptee, confirmation
requise, bon JSON telecharge, secret efface au reload et deconnexion entre
onglets. `cloud-sync.browser.test.cjs` verifie PC/Razr, separation des comptes,
reprise de session, progression et combat Tokyo.

Preflight valide : CI (96 groupes, 1498 tests passes, un ancien test ignore),
local (13 groupes, 129 tests), build (8 tests) et jeu PC/mobile (444 cartes).
La suite repository et les navigateurs sont aussi verifies sur le commit fige
avant son envoi Cloudflare. Preuves locales dans
`work/qa/account-4.6.95/`. Pas de changement de schema SQL, de Worker, de droits
des comptes ni de gameplay.
