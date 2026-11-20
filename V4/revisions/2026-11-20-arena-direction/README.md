# Direction des duels et mix

Le theme musical conserve son niveau et les preferences du joueur.
Les effets sont calibres a partir du RMS decode de chaque MP3, puis attenues
globalement de 7.5 dB environ (gain .42). Les couches secondaires restent plus
basses et les preparatifs s'arretent a l'impact.

La dissipation originale vient du compte personnel Runway : 2 credits deja
disponibles, aucun achat. Prompt, tache et SHA-256 : [sound.json](sound.json).
Source et export sauvegardes hors checkout dans
`sauvegardes-personnelles/audio/2026-11-20-arena-direction/`.
Reproduction : `node V4/revisions/2026-11-20-arena-direction/prepare-sound.cjs`.
Le MP3 est dans le registre runtime, pas dans Git.

La presentation ne change ni tirage, formule, equipement, sauvegarde ni droits.
Les morts sont les nouvelles entrees de la defausse comparees aux slots avant
la commande. Le motif de disparition depend du cristal magique ou de l'arme.
Le son joue une fois par groupe ; les cartes sauvees par Reraise restent vivantes.
Les soutiens et objets eclairent leurs cartes seulement pendant leur effet.

Controles : `arena-audio.test.cjs`, `combat-departure.test.cjs`,
`arena-living.browser.test.cjs`. Les preuves repetables restent sous
`work/qa/arena-living/` ; la livraison conserve la synthese des suites.
