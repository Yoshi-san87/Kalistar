# Resident Evil And Metal Gear Fidelity

Scope: 25 Resident Evil fan-crossover cards, nine episode-specific banners,
one shared Resident Evil collection filter and seven artwork-only Metal Gear
revisions. No new arenas, game rules or official collaboration claim.

Sources and production:

- `../../expansions/2026-10-01-resident-evil/`: card specifications, illustration
  prompts, selected artwork provenance, native production and verification.
- `../../collaborations/resident-evil-banners-01/`: episode banner sources,
  exact alpha masks, logo-inspired artwork, provenance and component checks.
- `../../revisions/2026-10-01-metal-gear-fidelity/`: seven original backups,
  selected illustration prompts, native revisions and fixed-frame comparisons.

Artwork uses the built-in imagegen tool, separately from the card frame. Each
native PSD retains editable typography and embedded smart objects. Existing
Metal Gear profile bytes and non-illustration pixels must remain unchanged.
The personal repository origin is `https://github.com/Yoshi-san87/Kalistar.git`.

Release checks run from the personal repository root:

```powershell
node V4/releases/2026-10-01-resident-evil/audit.cjs verify
node V4/deploy/build.cjs
node V4/releases/2026-10-01-resident-evil/local-browser.cjs
node V4/releases/2026-10-01-resident-evil/public-check.cjs
```

`baseline.json` was captured before any production-card changes. Never recreate
it to hide a mismatch. Native publication precedes static building. Browser QA
checks all 32 affected cards on desktop and phone, their served PNG hashes, the
25-version / 14-character Resident Evil filter and layout overflow. Public QA
checks the deployed catalogue, release manifest and all 41 affected card/banner
downloads against the local static release. Generated QA outputs are evidence,
not production sources or user approval.
