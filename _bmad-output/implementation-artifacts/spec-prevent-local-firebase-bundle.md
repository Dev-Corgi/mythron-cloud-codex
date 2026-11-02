---
title: 'Prevent local Firebase placeholder URLs in client bundles'
type: 'bugfix'
created: '2026-11-02'
status: 'in-progress'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The local client bundle contains `https://localhost.firebaseio.com/`, causing Firebase authentication and subsequent client requests to fail. This value was introduced by an explicit build-time environment override that took precedence over the valid local `.env` configuration.

**Approach:** Reject the known invalid localhost Firebase placeholder during the build validation that runs before cleaning or bundling. Rebuild the local client using the configured Firebase URL without exposing the URL value.

</frozen-after-approval>

## Implementation Notes

- `duelyst/gulpfile.babel.js` validates `process.env.FIREBASE_URL` for app, register, and release bundles; reject the known localhost placeholder before cleanup or bundling on every path.
- `duelyst/config/config.js` maps `FIREBASE_URL` into the browser bundle configuration. `duelyst/.env` contains the intended local project URL and is ignored; do not print or modify its value.
- The local app bundle rebuilt successfully from the existing `.env` value with Babel's user-profile cache disabled. Verify the built `duelyst/dist/src/duelyst.js` no longer contains the placeholder and uses the configured local Firebase host. Do not run authentication or expose credentials.

## Review Triage Log

- medium — Fixed main and release build task ordering so Firebase validation happens before cleanup; invalid localhost configuration leaves the existing bundle unchanged.
- medium — Fixed register source/build paths with the same guard; invalid localhost configuration is rejected before bundle generation.
- low — Rebuilt by reading the ignored local `.env` value into the build process without printing it; confirmed the expected host is present in the bundle and the placeholder is absent.
- low — Corrected implementation notes to cover the actual guarded build paths and validation timing.
