# FF10 Browser Review

Prepared only. Do not run until the parent confirms local publication complete.

From the Kalistar workspace root, with the configured Node runtime:

    node V4/collaborations/ff10-set-01/browser-review.cjs

The default URL comes from V4/atelier/data/runtime.json. To review a static
deployment while comparing with the current local production files:

    $env:KALISTAR_REVIEW_URL = 'https://yoshi-san87.github.io/Kalistar/'
    node V4/collaborations/ff10-set-01/browser-review.cjs
    Remove-Item Env:KALISTAR_REVIEW_URL

The URL may be a site root or its /jeu/ route. The script delegates media URL
resolution to the site's actual KalistarSite.url adapter, so subpath hosting
works without rewriting pngUrl values. KALISTAR_NODE_MODULES may override the
bundled runtime's node_modules directory.

## Safety

- Fresh non-persistent Chromium contexts at 1600x1000 and 390x844.
- No personal Chrome profile, cookies, saved collection or storage state loaded.
- Service workers blocked. All browser network requests must be same-origin
  GET; raw media checks are explicit GET without redirects.
- No imports, publication, game creation, native work, Git or source writes.
- Normal UI actions may update the disposable context's local deck draft only.
- Files written only below this qa/browser directory: timestamped screenshots,
  report.json and a latest.json pointer.
- Local catalogue, reference registry, arena configuration and checked source/
  published assets are hashed before and after, including on browser failures.

## Coverage

- Preflight requires all 11 FF10 source cards to be locally published byte-for-
  byte. Current Kaylis PNG and illustration must match the final September 25
  proof and selected artwork hash; stale revisions are rejected.
- Catalogue: 100 unique V4 cards, 25 arenas, exactly 11 FF10 cards.
- Compare all relevant profile fields and descriptions with local production.
- For all 11 FF10 models plus latest Kaylis, at both viewports: search/open the
  real collection, verify name/title/download URL, raw PNG SHA-256 and 897x1497,
  actual displayed 797x1388 crop against source pixels (mean RGB delta below 6
  permits the site's WebP quality-95 encoding), faces/effects/magic markers,
  faction and weapon. Capture screenshot and reject viewport overflow.
- Both FF10 presets: exact card lists, engine playable-deck validation, at least
  two compatible cards for each position, complete lineup, enabled UI options,
  loaded ten slots and playable button. No match is started.
- Both arenas: catalogue and real pre-match choices, selected radio, image
  loaded, raw PNG identity; published lobby summary checked when present.
- FF10 faction registration, native flag raw hash, collection group/filter.
- Fail on page errors, HTTP errors, blocked requests or changed local inputs.

## Local Versus Published UI

Reviewed both source trees without modifying either. Stable selectors include
data-binder-field=search, .cb-card, .cb-hero-image, .cb-card-heading,
data-binder-action=back/pane/tab, #deck-preset, data-action=load-preset,
data-deck-slot, .kdb-play and input[name=arena].

Local collection has a direct ff10 scope. The personal clone currently groups
FF7/FF8 under final-fantasy, and its matchesScope predicate did not yet include
ff10 at preparation time. The test intentionally requires an FF10 faction filter
inside that group to expose 10 characters / 11 versions. If the grouped
predicate remains unchanged, it will fail with a specific message rather than
silently bypassing the missing FF10 cards.

The clone's pre-match lobby differs from the local arena picker; both share
the arena radio values, while #match-arena-summary is checked conditionally.

## Validation Status

Only static syntax checking is authorized during preparation. No browser,
HTTP call or real review run was started by this task. A successful syntax check
is not a claim that the post-publication browser review has passed.
