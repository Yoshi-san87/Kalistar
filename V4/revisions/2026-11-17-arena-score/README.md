# Brass Fight Call - arene

Musique originale fournie par le proprietaire : `Brass Fight Call.mp3`.
Original conserve dans Downloads et sauvegarde privee verifiee hors checkout :
`sauvegardes-personnelles/audio/2026-11-17-arena/Brass Fight Call.mp3`.

- Original : 5 391 677 octets ; SHA-256
  `46f2805fa8f983b3db3f099e905042ee9bf3c26e3061b6fffde3d0876767d2d2`.
- Export : `site/assets/audio/brass-fight-call-v1.mp3`, 3 760 003 octets,
  234,97 secondes, stereo 44,1 kHz, MP3 128 kbit/s.
- SHA-256 export :
  `8da0ff138b3d603007005b1b802d4524ef45c885804fc49e008fcbe39a80c797`.

Conversion FFmpeg, sans couper ou accelerer la musique :

```text
ffmpeg -i "Brass Fight Call.mp3" -vn -af loudnorm=I=-21:TP=-2:LRA=9 -ar 44100 -c:a libmp3lame -b:a 128k -map_metadata -1 brass-fight-call-v1.mp3
```

Le lecteur des menus selectionne ce theme en arene. Deux lecteurs natifs au
maximum, crees a la demande ; un seul joue. Le lecteur inactif reste en pause
et conserve sa position, sans rechargement ou recherche de position fragile.
Pause en arriere-plan et dans le Gaming Book ; aucun chargement sous le film
ou avant Entrer. Volume et musique restent les reglages de l'appareil.

Les accents sonores sont synthetises par `arena-audio.js`, sans service payant
ni media externe : impulsion, jet, resultat, attaque, magie, blocage, soutien,
esquive et victoire. Enveloppes bornees, quatre voix maximum, deconnexion des
noeuds termines et suspension du contexte au repos. Reglages independants de
la musique. Aucun effet ne modifie le moteur, son RNG ou les sauvegardes.
