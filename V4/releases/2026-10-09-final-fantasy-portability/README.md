# Final Fantasy: portable publication checks

The v4.5.58 Pages build failed because the trilogy integration suite loaded
the local Photoshop designer to reconstruct profiles. Its media dependency
uses a Windows workstation path, unavailable on the Linux runner.

The suite now reads the delivered `creations/<id>/profile.json` files, as the
existing FFIX integration suite does. The set, printed values, identities,
role limits, native verification records and artwork hashes are still checked.
All 174 attack faces, 174 defense faces and 87 complete matches remain covered.

No artwork, native document, frozen manifest, previous report or gameplay rule
was changed for this correction. The actual production profiles, rather than
newly reconstructed profiles, now drive the integration matches.

`verify.cjs` reruns the committed Pages mechanics commands and static build.
Its separate fresh-process check rejects workstation-only designer imports.
Results are written to a new verification directory, preserving earlier proof.
