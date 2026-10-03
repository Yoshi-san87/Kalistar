# Kalistar - Socle d'interface

Demande utilisateur des 3-4 octobre 2026 : prolonger les emblemes du menu dans
toute l'interface. Fantasy peinte, cuivre grave, matieres sombres, energie cyan
contenue et Kalistel rainbow. Pas de HUD neon ni de nouvelles regles de jeu.

## Sources

- ui-system.css : tokens, commandes, champs, onglets, fenetres, palmares.
- ui-system.js : adaptation des composants existants, infobulles, ouverture
  des dialogs. Aucun acces au moteur, au stockage ou aux profils.
- Les emblemes de navigation et les vrais trophees deja valides sont reutilises.
  Aucun PNG de personnage, medaillon, arme ou cadre natif n'est modifie.
- Cinzel reste la signature des titres. Les textes courants, chiffres et
  manuscrits conservent leurs familles respectives.

## Tokens et composants

Les variables --kui-* definissent l'encre, les surfaces, le cuivre, l'energie,
les textes, les bordures et les durees. La variante .cb-reading / .story-reader-book
emploie une encre sombre et un laiton adapte au parchemin.

| Attribut | Usage |
| --- | --- |
| data-kui="command" | Commande encadree, icone ou icone + libelle |
| data-kui-tone="primary" | Action principale ou sauvegarde |
| data-kui="quiet" | Petite action proche d'une carte ; aucun nouveau cadre |
| data-kui="tab" | Vue ou choix persistant ; soulignement et etat ARIA |
| data-kui="field" | Input, select, textarea sans wrapper supplementaire |
| data-kui="check" / "range" | Controles natifs, accent energetique |
| data-kui="dialog" | Fenetre native, profondeur, titre et apparition courte |
| data-kui-native | Sous-arbre volontairement exclu de l'adaptation |

Les ecrans historiques sont adaptes par une liste explicite de selecteurs.
Pour un nouvel ecran, reutiliser ces attributs et des controles semantiques.
Garder aria-label sur les actions sans texte et aria-pressed / aria-selected
sur les choix persistants. Ne jamais faire d'une carte une commande encadree.

## Interactions

- Survol : filet cyan, reflet cuivre et relief tres court, sans deplacer la
  cible. Pression : enfoncement lumineux discret, aucune secousse.
- Focus clavier : contour visible distinct. Selection : trait + texte/ARIA,
  jamais une couleur seule. Etats desactives conserves et non interactifs.
- Selects : semantique native, clavier et change inchanges. Picker metallique
  progressif quand base-select est disponible avec souris ; selecteur systeme
  sur tactile ou navigateur non compatible. Aucune copie cachee du select.
- Dialogs : ouverture 200 ms, 70 ms par fondu en Reduced Motion. Le close natif,
  Escape, la restitution du focus et le piege de focus restent ceux du navigateur.
- Infobulle unique dans le top layer, position bornee a l'ecran, pointeur ou
  clavier. Aucun affichage au toucher. Elle conserve les descriptions ARIA
  precedentes et disparait au clic, scroll, Escape, resize ou retrait du bouton.
- Les ecouteurs partages utilisent AbortController. L'observer ne suit que les
  ajouts DOM et l'attribut open. Travail groupe par frame, nettoyage des noeuds
  retires, destruction pagehide et reinitialisation pageshow.

## Limites de responsabilite

Le socle ne change ni tailles de cartes, ni disposition des slots, ni animation
de combat, ni nav principale. Le palmares conserve les recadrages, le trophee MVP
a 25 %, les ex aequo et le flux continu telephone. Les illustrations ne sont
pas remplacees par des icones.

Tests : ui-system.test.cjs (contrats/contrastes) et ui-system.browser.test.cjs
(vrais parcours, persistance equipe, select, dialogues, clavier, infobulles,
manuscrit, statistiques, palmares, desktop, Razr, compact, paysage, Reduced Motion).
Les profils de navigateur QA sont isoles des donnees personnelles.
