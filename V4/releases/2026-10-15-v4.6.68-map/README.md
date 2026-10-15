# Kalistar 4.6.68 - Mur et Thalassea

Publication de la map 1.33 autorisee par l'auteur le 15 octobre 2026.
La livraison conserve les 424 cartes de 4.6.67, sans changer le gameplay,
les sauvegardes, les profils ou le stockage du navigateur.

## Perimetre

- Mur monumental avec porte entre les montagnes du nord-ouest, et terrain
  cote terre harmonise (source locale 1.31).
- Anneau arrondi d'iles et de recifs autour d'un bassin marin profond.
- Thalassea, cite sous-marine dans une bulle : huitieme ville selectionnable,
  au point natif (897, 717), symbole 50px et nom independant.
- Sept anciennes villes, leurs coordonnees et leurs medias inchanges.
- Fond runtime WebP sans villes incrustees, export sans perte de la source 1.33.
- Icones et noms restent separes du terrain et editables dans le PSD.
- Version PC/telephone et assertions de livraison 4.6.68.

Les propositions de cratere 1.34 et 1.35, et la refonte Home d'un autre chat,
sont explicitement exclues. Seuls les fichiers termines de cette carte et de
cette livraison sont stages. Aucun changement Cloudflare Access/DNS/facturation.

## Sources et sauvegarde

[Sources et prompts](../../map/layers-1.33/README.md), generations image_gen
integrees et composition locale masquee. Les precedentes versions restent
physiquement au meme endroit ; aucun binaire n'est force-ajoute a Git.

Sauvegarde externe verifiee :
`C:/Users/guill/Documents/Sauvegardes-Kalistar/2026-10-15_map-1.33_213558/`.
59 fichiers, 105099923 octets, toutes les empreintes SHA-256 verifiees.
Le registre des medias ajoute exactement le fond 1.33 et les deux exports
Thalassea, sans reprendre les brouillons de l'accueil.

## Validation et livraison

- Sources 1.31/1.32/1.33 et masques locaux verifies, zero changement de pixels
  hors masque, villes precedentes et calques natifs preserves a la reouverture.
- Export terrain identique pixel a pixel au PNG natif ; vrais canaux alpha
  des icones, nom Thalassea editable, aucun test Photoshop natif invoque.
- Suites completes CI/local, garde-fous du depot et tests navigateur du build
  fige : details dans validation.json et captures sous work/qa/map-4.6.68/.
- Controle Map sur PC et telephones : huit villes, selection de Thalassea,
  details deplies, cadrage, libelles lisibles et carte ancree sous la liste.
- Regression navigateur generale : Collection, Decks, Arene et reprise de partie.

Le commit et le seul tag annote v4.6.68 sont envoyes atomiquement au depot
personnel Yoshi-san87/Kalistar. La sortie prepare-release.cjs utilise exactement
ce commit et les medias controles, puis est envoyee au projet Cloudflare
existant kalistar. Verification publique avant annonce de mise en ligne.
