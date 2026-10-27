# Kalistar 4.7.25 - Une carte, une histoire

Le demarrage montre une carte aleatoire du catalogue et le recit deja publie
sur cette carte. La carte arrive, se retourne puis laisse passer un reflet.
Le cristal et Entrer s'eveillent quand catalogue, modules et donnees joueur
sont prets. Aucune duree de lecture imposee, aucun defilement automatique.

La frontiere startup conserve les vues, actions, notifications et l'arene
inactives jusqu'au clic Entrer. Le film de connexion reste inchange : sa fin
ou Passer conduit a la lecture. Une erreur de chargement garde Reessayer sans
attendre Entrer. Une image manquante conserve le dos de carte et le recit.

PC : carte et texte cote a cote. Telephone : carte au-dessus, lecture puis
commande accessible en bas ; le texte long defile dans son espace. Tous les
effets sont finis, en transform/opacity, pauses en arriere-plan et neutralises
avec Reduced Motion. Aucun nouveau media, aucune migration, aucune modification
de carte ou de sauvegarde. Les PNG et textes viennent du catalogue approuve.

Verification ciblee : startup.test.cjs et startup-reading.test.cjs ;
startup.browser.test.cjs pour le film, les erreurs, les notifications et la
reprise de combat ; startup-reading.browser.test.cjs pour huit formats PC/mobile,
chargement lent, image absente, entree clavier et absence de boucle permanente.
Les captures et rapports repetables sont sous work/qa/startup-reading/ et
work/qa/startup-reading-lifecycle/. La livraison figee est testee avant envoi.

Les parcours deploy, home et login cliquent desormais Entrer avant d'attendre
KALISTAR_READY, sans drapeau de contournement dans le code de production.

## Validation de livraison

- 29 tests unitaires startup, lecture et introduction : passes.
- Suite complete de publication : 107 invocations passees, avec reprise au
  point d'echec apres adaptation des fixtures de boot/version.
- Suite locale complete (sources originales et PostgreSQL ephemere) : passee.
- Navigateur lecture : huit formats, clavier, Reduced Motion, reseau lent et
  image absente ; aucune animation permanente apres l'apparition.
- Cycle de demarrage : film, conflit de synchronisation, reprise de combat,
  retour au premier plan et erreurs ; aucun lancement avant Entrer.
- Parcours deploy : 462 cartes, PC/telephone, telechargement PNG, decks, arene,
  sauvegarde/reload et publication additive ; aucune erreur HTTP inattendue.
- Accueil : PC, Razr et petit ecran, navigation, tactile, dialogues et reload.
- Connexion : six formats avec Worker et PostgreSQL ephemeres, refus d'acces,
  cookies, mapping Paris/Tokyo et deconnexion ; aucun compte reel modifie.

Preuves : work/qa/startup-reading-final/, startup-reading-lifecycle/,
startup-reading-deploy/, startup-reading-home/ et startup-reading-login/.
Le controle complet est relance apres adaptation des fixtures de boot et
des assertions de version au nouveau contrat, sans affaiblir les controles.
Les autres anciens tests navigateur ne sont pas revendiques comme executes.
