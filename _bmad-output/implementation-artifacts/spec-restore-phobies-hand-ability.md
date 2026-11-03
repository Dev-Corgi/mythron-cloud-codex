---
title: 'Restore imported active ability art in fixed hand slots'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="User authorized automatic approval and continuation">

## Intent

**Problem:** Imported Phobies active ability cards can resolve their live hand slot but fail to display because their runtime 510xx identifiers have no generated resource packages.

**Approach:** Preserve the source spell identifier on imported ability effects, verify that a summoned imported unit exposes its effect in the same fixed hand slot, and rebuild the client so the resource lookup fix is available at runtime. Preserve live Lockdown/Cooldown, zero mana cost, and existing ability use interactions.

</frozen-after-approval>

## Implementation Notes

- User explicitly authorized automatic approval and asked to proceed without further approval pauses.
- Existing commit 40baa0db8aa3306deaa66f45e37582ce240e02c9 supplies the source resource identifier. The hand node passes the SDK card to generated package lookup, which honors originalCardId.
- Investigated BottomDeckCardNode.setAbilitySlot, Player.getActiveAbilityForHandSlot, Unit.onApplyToBoard, and package generator. Add a regression covering imported units rather than only the older Planar Scout fixture; build the client after verification.
- Found another invalid source: PlaySmashface used nonexistent Cards.Spell.CryonicPotential. Corrected it to Cards.Spell.KoanOfHorns, matching its name and icon.
- Corrected the earlier collection atlas change to apply the narrow 128x256 geometry only to Phoenix Fire; square atlases retain 256x256 geometry.
- Added a validated imported-unit summon regression and coverage that all 16 abilities have real source spells and animation resources. Focused suites: 42 passing. Actual generated inspect package lookup: all 16 packages exist.
- The broader pre-existing active_abilities suite has 14 failures involving old Planar Scout/General fixtures and current card eligibility. These were not introduced by this patch.
- Fresh-worktree build prerequisites: generated app/data/packages.js and compiled packages/chroma-js/dist were absent. Generated packages and compiled the local TypeScript package. Loaded only FIREBASE_URL from the existing .env into the build process.
- Final build:app completed successfully, and rsx:copy plus rsx:copy:web completed. Windows desktop notifier failure was nonfatal. Targeted ESLint and git diff --check passed. Independent re-review found no additional correctness problems.

## Review Triage Log

- medium / patched: prior atlas correction compressed every square atlas; now only Phoenix Fire uses the narrow dimensions.
- medium / patched: test did not verify real package lookup; separately loaded generated PKGS and verified every imported effect resolves an existing inspect package. This found and fixed the undefined source ID on 51014.
- medium / verification limitation: pure slot coverage cannot prove Cocos runtime display. Improved the regression to execute a validated summon; actual running-client visual verification remains outstanding.
