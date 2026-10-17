# Kalistar 4.6.83

## Perimetre

Les livres Fragment portent en pleine couverture la peinture de la version a
gagner : Momo 30000001, Balmhyr 49900802 et Kaylis 49055457. La miniature de
carte sur une couverture Kalistel est remplacee par une reliure originale,
cuir sombre, cuivre et argent, avec cristal prismatique discret.

La reliure est generee une fois avec l'outil image integre. Les peintures ne
sont pas regenerees : exports WebP des sources approuvees, texte HTML separe,
chargement paresseux, fenetre transparente. Le mapping depend du modele
recompense et une version non preparee conserve le recadrage de sa propre
carte. Aucun canvas permanent, nouvelle dependance ou requete serveur ajoutee.

Story, illustrations natives, quatre combats, recompenses, rencontres deja
commencees, schemas et sauvegardes ne changent pas. Les travaux des autres
chats ne sont pas inclus.

## Sources

Prompt exact, preparation et empreintes dans
`V4/revisions/2026-10-17-fragment-covers/`. Medias runtime dans
`V4/site/assets/journeys/` : quatre WebP totalisant 1 250 116 octets.
Les originaux et exports ont ete copies hors checkout dans
`Documents/Sauvegardes-Kalistar/2026-10-17-fragment-covers/`, avec comparaison
SHA-256 des dix fichiers. Aucun binaire n'est ajoute a Git.

## Validation

Preuves et captures : `work/qa/fragment-covers/`, hors Git. Tous les comptes
et profils utilises sont jetables ; aucun acces a une progression personnelle.

- CI complete : 91 groupes, 1 439 tests passes et un skip historique.
- Suite locale complete : 13 groupes, 127 tests passes, medias et PostgreSQL.
- Nouveau `journey-covers.test.cjs` : correspondance des trois versions,
  empreintes des peintures non modifiees, publication et alpha de la reliure.
- `journey-view.browser.test.cjs` : PC, Razr, 320 px, paysage, sept tailles ;
  cadrage et titres, filtres, swipe/clavier, fallback d'une autre version,
  quatre etapes, recompense, Reduced Motion et nettoyage.
- `V4/deploy/browser.test.cjs` : 434 cartes, Collection, Decks, Arène,
  lecture, sauvegarde/reload et intro, sans erreur de media ou de JavaScript.
- `journeys.browser.test.cjs` : quatre combats complets signes, recompense
  Tokyo, reprise et apercu Paris sur PC/Razr. Un premier essai a expire sur
  un bouton d'arene detache pendant une transition ; la relance du meme test,
  sans modification, passe. Les deux journaux sont conserves.

Un premier controle de version a signale deux assertions regex encore en
4.6.82 ; elles ont ete alignees sur 4.6.83 avant la relance CI complete.
Le test navigateur general a demande l'autorisation du serveur local apres
un refus reseau du sandbox. Aucun test ni verrou n'a ete desactive.

## Publication

Version PC/mobile et assertions alignees. Preparation du commit exact avec
`prepare-release.cjs`, verification de cette sortie puis publication sur le
projet personnel Cloudflare `kalistar`. Rapports et captures figes sous
`work/publication/` et `work/qa/fragment-covers/`.
