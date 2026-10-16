# Kalistar 4.6.74 - Vulkar et iles-volcans

Publication de la map 1.39 demandee par l'auteur le 16 octobre 2026.
Les 434 cartes et les fonctionnalites deja publiees jusqu'a 4.6.73 sont
conservees. Aucun changement de gameplay, de compte ou de sauvegarde.

## Perimetre

- Hauts plateaux de Vulkar, cendres sombres, chaines volcaniques et falaises.
- Un volcan actif, panache grave et coulees de lave rouge/ocre localisees.
- Lac noir interieur agrandi, distinct du bassin marin sombre a droite.
- Six petits ilots occidentaux redessines en reliefs volcaniques varies.
- Huit villes, noms, assets et coordonnees inchanges, separes du terrain.
- Fond runtime WebP sans perte et version PC/telephone 4.6.74.

[Sources, prompts et approbation](../../map/layers-1.39/PUBLICATION.md).
Les provenances des generations 1.37/1.38/1.39 restent intactes. Les sources
natives sont sauvegardees et comparees par SHA-256 avant publication sous
`C:/Users/guill/Documents/Sauvegardes-Kalistar/2026-10-16_map-1.39_release-4.6.74/`.
Sauvegarde controlee : 70 fichiers, 121 213 569 octets, toutes les empreintes
identiques aux sources locales au moment de la copie.
Git conserve le texte et les empreintes runtime, pas les PNG/PSD.

Le registre web ajoute uniquement le fond 1.39. Les brouillons auth/Supabase
et les autres productions locales sont exclus. Aucun changement Access,
DNS, facturation, origine publique ou stockage personnel du navigateur.

## Verification

Commandes et resultats avant livraison : validation.json. Journaux et captures
repetes : work/qa/map-4.6.74/. Controle des pixels hors masque, groupes de
villes, reouverture PSD et identite du WebP avec le terrain natif. Photoshop
natif n'est pas invoque. Verification Map sur PC et deux telephones, avec
Vulkar, Durane, Cryptown et Thalassea selectionnables. Regression generale
Collection, Decks, Arene et reprise de partie en profils de test jetables.

Le commit et le seul tag annote v4.6.74 sont pousses atomiquement vers le
depot personnel Yoshi-san87/Kalistar. prepare-release.cjs extrait ce commit
exact et les seuls medias autorises. Cette sortie figee est testee et envoyee
au projet Cloudflare existant kalistar. Version, release.json et medias
publics sont verifies avant annonce de mise en ligne.
