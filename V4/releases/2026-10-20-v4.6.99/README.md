# Kalistar 4.6.99 - Enregistrement d'un exemplaire

## Perimetre

- Enregistrement du compte : grand dos scelle a droite sur PC, scene compacte
  au-dessus du formulaire sur telephone et paysage tactile.
- Sceau de cristal, ouverture de la carte et confirmation de son attribution
  uniquement apres reponse serveur et actualisation du compte.
- Exemplaire, numero individuel et lien vers Collection ; commande pour
  enregistrer une autre carte. Pas de galerie dupliquee.
- Secret masque puis efface des la soumission. L'identifiant public reste
  disponible en cas d'erreur ; aucune revelation pour un refus ou une reponse
  tardive apres navigation/deconnexion.
- Effets transform/opacity finis (ouverture 1,15 s), sans boucle permanente,
  desactives si les mouvements reduits sont demandes.
- Aucun changement SQL, de droits, de propriete, de gameplay ou de sauvegarde.
  La contrainte serveur d'un exemplaire par modele/version reste intacte.
  Aucun nouveau media ; dos et cristal approuves reutilises.

## Verification

Tests navigateur avec comptes fictifs et migrations PostgreSQL locales :
PC 1440, grand ecran 2532, Razr 412, compact 320 et paysage tactile.
Codes refuses, doublons, suppression du secret, confirmation serveur retardee,
navigation/deconnexion en cours, retour historique et echec d'actualisation.
Integration avec le SDK Auth, les images recadrees et les routes reelles du jeu.
Controle des animations finies, du mouvement reduit et des debordements.

Les preuves repetables et captures restent hors Git dans
`work/qa/account-activation/`. La livraison utilise le commit exact prepare par
`prepare-release.cjs`, jamais une reconstruction depuis les travaux en cours.
