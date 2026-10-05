# Kalistar 4.5.21 - Varkhen

Ajout de VARKHEN, LE DERNIER AVERTISSEMENT, modele 49900501 et
characterId varkhen-kalistar. Soldat SKULLZ de Cryptown, NECRO, Epee longue,
P1/P3. Le catalogue contient desormais 212 cartes.

L'illustration approuvee conserve sa composition et son plastron violet ;
la fumee noire a ete allegee. Le cadre natif n'est pas genere par IA.
PNG 897 x 1497 a 300 ppp et PSD editables dans V4/creations/49900501/.
Les profils et mecaniques existants ne sont pas modifies.

## Controles effectues

- Photoshop 26.11.8 : calibration additive Momo/Taulio/Valazar, zero pixel
  different des references, sources et anciens verrous inchanges.
- Carte : cadre fixe identique, PSD rouvert identique, texte natif,
  recit dans la limite de quatre lignes et code-barres verifies.
- 53 tests cibles reussis, dont 24 matchs complets avec sauvegarde/reprise.
- Lecteur de collection et arene controles visuellement a 1440 x 1000
  et 412 x 915 (Razr 50), aucune image manquante ou erreur de page.
- Construction Pages locale : 212 cartes, 690 fichiers.

Les commandes et sources natives sont documentees dans
V4/expansions/2026-10-05-cryptown-sentinel/README.md.
Les captures desktop/mobile et leur rapport sont dans browser-proof/ de ce lot.
target-tests.json conserve la sortie des 53 tests cibles.

## Publication

Cette livraison avance 4.5.20 vers 4.5.21. Les badges desktop/mobile et les
assertions de version sont synchronises. La carte et ses tests sont ajoutes
au workflow Pages ; aucun autre changement local n'est inclus.

Le test historique Orven comparait le catalogue complet a son ancienne taille.
Il verifie maintenant strictement la meme cohorte d'identifiants et interdit
les doublons, sans rejeter les futurs ajouts. Ni son snapshot avant revision
ni ses preuves natives ne sont modifies. Un test supplementaire verifie le
profil reellement publie et le hash du PNG natif de Varkhen.

Le smoke test Pages utilise desormais la graine PAGES-QA-2 : le joueur humain
ouvre la rencontre pendant les controles de navigation. Son ancienne graine
aleatoire pouvait laisser l'IA avancer et rendre l'assertion choose instable.
Les assertions et le mode adversaire automatique restent inchanges.

Validation finale isolee : les 179 tests du workflow reussissent, ainsi que
la construction du site et le parcours Chrome Pages complet (collection,
lecture, export PNG, decks, arene, sauvegarde/reprise, ajout de carte et
absence d'erreurs HTTP). Les captures sont conservees dans pages-browser/.
snapshot.json identifie l'arbre Git teste ; seules les preuves et cette
documentation sont ajoutees ensuite. Le script public-check.cjs verifiera
apres deploiement la version, le catalogue et le hash du PNG effectivement servi.
