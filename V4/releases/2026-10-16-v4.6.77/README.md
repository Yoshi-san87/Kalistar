# Kalistar 4.6.77 - Bibliotheque de parcours

## Livraison

- Menu Plus : Bibliotheque distincte de Library, qui conserve les regles joueur.
- Trois livres, Momo/Balmhyr/Kaylis, avec **quatre combats chacun**, couverture
  collectible, filtres, ouverture, stations, textes et lecture apres victoire.
- Rencontre avec sa composition et ses exemplaires. Le moteur commun est
  execute dans le Worker ; seul son etat signe peut faire avancer une etape.
- Defaite, nul et abandon conservent les victoires acquises. Reprise canonique,
  bail d'appareil, sequence CAS et recuperation sans relancer un de.
- Carte finale attribuee une seule fois, ceremonie d'acquisition, livre acheve
  toujours consultable. Aucun pack, paiement, ajout de puissance ou reset.
- Une seule possession de chaque modele/version, imposee par index serveur,
  y compris en activation, transfert et recompense. Messages joueur adaptes.
- Paris administrateur explicitement autorise ; Tokyo joueur normal. Apercus
  admin sans progression, attribution ou archive de rencontre.

## Production Preparee

Les migrations additives 007/008/009 ont ete appliquees sur le projet personnel
Kalistar seulement, apres verification des tests PostgreSQL. Schema version 8,
trois livres de quatre etapes, cle de preuve dediee configuree. Les 444
exemplaires preexistants sont conserves : Paris 434, Tokyo 10. Aucun parcours
reel n'a ete complete par les tests et aucune recompense reelle n'a ete simulee.

La cle technique n'est pas dans Git, le build ou les preuves publiques. Sa copie
privee est sauvegardee hors checkout. Aucun forfait ni compte professionnel
n'est modifie. Les migrations 001-006 restent byte-identiques ; aucun verrou
natif, PNG/PSD ou ancien rapport n'est ajuste pour valider cette livraison.

## Verification

- Suite CI et suite locale du registre commun, controles d'organisation et diff.
- PostgreSQL ephemere : doublons, activation, transferts, RLS, droits, refus des
  faux resultats et signatures, quatre victoires par livre, defaite, reprise,
  attribution unique, carte deja possedee et maintien apres transfert.
- Moteur pur : douze rencontres completes par commandes autorisees, des et
  choix IA non substituables, reliques, supports et restauration.
- Chrome jetable : PC, Razr 412x1007 et vue a 320px ; menu, filtres, quatre
  stations, lecture, boutons de combat, reprise, ceremonie et reduced-motion.
- Quatre combats complets traversent le Worker et PostgreSQL dans le test
  navigateur, sans sauter les commandes ni fabriquer un gagnant. Les tests
  rapides SQL utilisent aussi des fins de combat legitimes signees ; ils ne
  sont pas presentes comme des transcriptions HTTP completes.
- Le bundle ESM compile par esbuild, dependance du Wrangler officiel, est
  egalement teste. Le point d'entree CommonJS evite les require UMD non resolus
  par le premier assemblage et ne duplique aucune regle moteur.
- La relecture a aussi ferme la surcharge RPC directe et le contournement du
  garde de transfert par code-barres. L'entropie est renouvelee par Web Crypto
  pour que la graine ou une requete refusee ne prevoient pas le prochain de.
- Les snapshots ne renvoient plus tous les equipements non engages. Les
  reponses de bibliotheque obsoletes sont ignorees ; une panne de rafraichissement
  ne fait pas perdre l'etat canonique d'une victoire deja enregistree. Un lancement
  differe ne force pas le retour en Arene apres une autre navigation.
- Non-regression : Collection, Decks, Story, equipements D6, parties normales,
  archives et synchronisation entre deux appareils, sur PC et Razr.

Preuves regenerables dans `work/qa/journeys*`, ignorees par Git. Les captures
de comptes fictifs n'utilisent aucune session personnelle. Le test visuel de
vue pure est distinct du test d'integration serveur. Les tests PGlite ne sont
pas un benchmark multiconnexion ni une certification anti-bot d'un classement.

## Publication

Publier le commit et son tag annote `v4.6.77`, puis le build fige de ce commit
avec Wrangler dans le projet Pages personnel existant. Verifier ensuite le
login ferme, la version et la Bibliotheque du compte personnel, en lecture,
sans attribuer une victoire pour obtenir une capture. Le deployment precedent
reste disponible. Aucun historique LFS ni travaux d'illustration inacheves ne
font partie de cette publication.

[Contrat et ajout d'un livre](../../docs/PARCOURS_BIBLIOTHEQUE.md) |
[Registre](../../docs/REGISTRE_EN_LIGNE.md) |
[Migrations](../../deploy/supabase/README.md)
