# Geralt et Ssilas

Demande utilisateur du 2 octobre 2026 : nouvelle approche pour l'illustration
de Geralt et creation libre d'un Serpes de faction Arborium.

- Geralt 49900101 : profil P2 prepare conserve, Terre, Humain, Epee longue.
  Scene calme a l'auberge, reparation d'un gant. Description adaptee a la scene,
  titre et toutes les valeurs/capacites prepares inchanges. L'illustration est
  acceptee par le service avec l'identite explicite ; aucun masquage de nom.
- Ssilas 49900201 : personnage original propose, pas retrouve dans le manuscrit.
  Eclaireur Serpes d'Arborium, Plante, Arc, role Middle, P2/P3. Buff physique
  ATK D1, esquive DEF D2, magie ATK D4 et barriere DEF D4. Valeurs personnelles
  dans les intervalles du role P3 ; pas de Mort, Garde ni Reraise.
- La seconde version Geralt en chemise reste en attente, sans image ni carte.
- Illustration seule generee ; cadre, banniere Arborium et race SERPES reutilises
  depuis les composants natifs valides. Prompts et sources dans art-prompts.json.
- Pas d'arene, preset, nouvelle race, nouveau drapeau ou changement du moteur.

Le snapshot courant est additif et n'est jamais refige. Les preuves natives,
typographie, code-barres et reouverture sont obligatoires avant publication.
La validation technique ne remplace pas l'approbation artistique utilisateur.

## Livraison Locale

Les deux cartes sont ajoutees au catalogue local : 192 cartes, 28 arenes.
Les PSD natifs sont editables, les codes-barres reellement lus et leur
reouverture donne zero pixel different des PNG. Le cadre fixe est identique.
Les 152 creations precedentes et leurs 914 fichiers restent inchanges, ainsi
que les references protegees et les composants partages (audit.json).
Quatorze tests (profils et catalogue) et quatre vues navigateur (ordinateur/mobile) passent,
sans erreur ni debordement ; captures et comparaison native dans qa/local/.
Le build de verification emploie en lecture seule l'interface Git validee,
sans modifier les travaux locaux d'histoire et d'interface en cours.

Aucun commit ou push de ce lot a ce stade. Le site public reste en V4.3.1
avec 190 cartes ; la publication du petit lot a ete soumise a l'utilisateur.
Ne pas confondre cette integration locale avec une mise a jour GitHub Pages.

Serveur local verifie : http://127.0.0.1:4304/jeu/#collection ; les deux IDs
sont exposes par /api/game/catalogue. Aucun changement de sauvegarde utilisateur.

Publication ulterieure autorisee le 2 octobre 2026 :
voir ../../releases/2026-10-02-serpes-publication/README.md (V4.3.2).
Les constats locaux ci-dessus restent la preuve datee de ce lot.
