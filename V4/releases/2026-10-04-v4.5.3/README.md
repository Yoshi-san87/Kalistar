# Kalistar 4.5.3 - Armes en situation

Publication demandee le 4 octobre 2026 sur Yoshi-san87/Kalistar uniquement.
Succede a la 4.5.2 publiee pendant la preparation de ce lot. Le roman et les
autres fonctionnalites de cette version sont conserves sans modification.

## Contenu

- 23 vraies peintures en situation, avec des fonds proches et sobres.
- 23 nouveaux cercles personnalises ; 25 armes avec des cercles distincts.
- Poupee de Lulu corrigee, sans hache ; lame de Kaine revue sur reference officielle.
- Medaillons dynamiques communs a l'arsenal, aux decks et aux combats.
- 25 exports des cartes mis a jour, sources et prompts versionnes.
- Version desktop, smartphone et assertions de release : 4.5.3.

Details, source officielle et preuves visuelles :
`../../revisions/2026-10-04-weapon-scenes/README.md`.
Schema graphique : `../../weapon-cards/README.md`.

## Controles

69 tests cibles reussis (moteur, equipement, composition, presentation et art).
37 controles de mise en page sur six formats ; 52 parcours d'arsenal et vrais
jets ; 21 gros plans PC/telephone ; parcours complet des armes historique.
Verrous des cartes natives et composants designer verifies sans modification.
Les hypotheses graphiques des tests sont actualisees de maniere explicite :
une peinture remplace le montage, Kaine utilise le corps v2 et chaque cercle
possede son propre asset. Aucun test moteur ni ancien rapport n'est affaibli.

Build Pages : 193 personnages, 25 armes, 628 fichiers, environ 494.4 Mio.
Les images HD, variantes rejetees et scripts de production restent hors du site.
Les cles d'equipement, valeurs de bonus, familles et schemas sont inchanges.

La copie isolee de l'arbre Git est verifiee avant le commit. Les resultats
du workflow et du paquet statique sont dans `qa/`. `public-check.cjs` controle
ensuite la version et les empreintes de chaque scene et cercle servi en ligne.

Sur ce paquet isole : les 127 tests du workflow, Kalistel, ambiances et build
sont reussis. Le parcours Pages Collection/Story/PNG/Deck/Arene/sauvegarde
passe sur ordinateur et telephone sans erreur HTTP/JS. Le parcours Armes
complet passe aussi sur le paquet statique (desktop, Razr, compact et Reduced
Motion). Aucun serveur Atelier n'est requis pour ces validations.

Publication : branche main et tag annote v4.5.3, pousses atomiquement.
