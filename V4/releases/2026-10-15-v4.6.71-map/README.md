# Kalistar 4.6.71 - Cratere, barrage et brume

Publication de la map 1.36 autorisee par l'auteur le 15 octobre 2026.
Les 424 cartes et les changements Home/Collection deja livres en 4.6.69/70
sont conserves. Aucun changement de gameplay, de profil ou de sauvegarde.

## Perimetre

- Trainee d'impact approfondie et raccord ouvert avec le bassin.
- Cratere redessine : levre rocheuse au pied de Durane, tour non deplacee.
- Barrage nord plus court, petite porte et davantage de montagnes.
- Brouillard marin epais autour de Cryptown et au large, abime encore lisible.
- Huit villes, noms, medias et positions inchanges ; terrain et villes separes.
- WebP runtime sans perte, selection/cadrage PC et telephone preserves.
- Version PC/telephone et assertions de livraison 4.6.71.

## Sources et sauvegarde

[Sources, prompts et approbation](../../map/layers-1.36/PUBLICATION.md).
Les generations image_gen et les compositions natives restent aux chemins
existants. Les provenances initiales ne sont pas reecrites apres approbation.
Les sources 1.34/1.35/1.36 sont sauvegardees et verifiees par SHA-256 sous
`C:/Users/guill/Documents/Sauvegardes-Kalistar/2026-10-15_map-1.36_release-4.6.71/`.
73 fichiers, 125604392 octets, toutes les empreintes verifiees.
Git conserve le texte et le registre du media, pas les PNG/PSD.

Le registre web ajoute uniquement le fond 1.36. Les travaux locaux d'autres
chats ne sont pas inclus. Aucun changement Access, DNS, facturation ou origine.

## Validation et livraison

Les controles de publication sont consignes dans validation.json : suite
complete locale, sources et masques, WebP identique au terrain natif, groupes
de villes preserves, reouverture PSD et parcours PC/telephone.
Photoshop natif n'est pas invoque ; le PSD est controle avec ag-psd.
Les captures et journaux repetes restent sous work/qa/map-4.6.71/.

Le commit et son seul tag annote v4.6.71 sont envoyes atomiquement au depot
personnel Yoshi-san87/Kalistar. prepare-release.cjs extrait ce commit exact
et les medias verifies. La sortie figee est testee puis envoyee au projet
Cloudflare existant kalistar. La version publique et ses empreintes sont
verifiees avant annonce de mise en ligne.
