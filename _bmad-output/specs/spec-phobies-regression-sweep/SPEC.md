---
id: SPEC-phobies-regression-sweep
companions:
  - defect-register.md
  - ../spec-phobies-card-import/SPEC.md
  - ../spec-phobies-card-import/card-roster.md
  - ../../implementation-artifacts/phobies-import-audit-2026-11-04.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Phobies Regression Sweep

## Why

A pain to solve: the Phobies import (`../spec-phobies-card-import/SPEC.md`) shipped with defects in both data and UI, and the owner finds them one at a time by playing and reporting. Earlier audits and repair specs were done by reading code, so "done" never meant "observed working". This spec makes `card-roster.md` the machine-checked source of truth and sweeps the whole import for every mismatch between intended and actual behavior, so the owner no longer has to discover and report defects by hand.

## Capabilities

- **CAP-1**
  - **intent:** Every imported card and ability's data and effect text can be checked against `card-roster.md` automatically.
  - **success:** A conformance suite derived from `card-roster.md` covers all 35 cards and 16 actives (stats, mana, movement, attack type and range, passives, Lockdown, Cooldown, icon source, ability name, effect text in the roster's Duelyst terminology) and fails on any deviation; it passes at completion.
- **CAP-2**
  - **intent:** Each active ability and passive does what its roster text says, against the targets the text allows.
  - **success:** For every active, executed tests cover legal targets, rejected targets, amounts and durations. Single-target friendly heal and Attack-boost actives (Flash Reincarnation on Healing Mystic, Emerald Rejuvenator and Letigress, and War Surge on Captain Hank Hart) cannot target their own caster, in target highlighting and in validation. Healing restores only missing Health.
- **CAP-3**
  - **intent:** The hand slot, in-match card inspect and collection each show exactly what the data says for every imported card and ability.
  - **success:** On each surface the ability icon is the source skill's animated sprite sheet, the Lockdown and Cooldown counters show the unit's real current values, the effect text is present and matches `card-roster.md`, and no stray or overlapping numbers appear. The collection shows ability cards with the same frame, icon position and counters as the card frame shown when the player hovers a hand card (the hover card, not the hand slot itself). The canvas and HTML renderers cannot share drawing code, so they share one data module: the ability frame's layout, counter values, icon frame data and effect text are computed in one place and each surface only draws that result. A parity test feeds the same ability to every surface and asserts identical values. Every displayed value is asserted equal to its SDK value, so data-correct but UI-wrong cases fail.
- **CAP-4**
  - **intent:** The board shows the same state the data holds after every action.
  - **success:** After move, attack, push, dash, spawn, death, Wall create and Wall remove, each unit node's tile and displayed stats equal the SDK entity's position and stats, in an executed test per action type.
- **CAP-5**
  - **intent:** Each imported card appears exactly once where intended and nowhere else.
  - **success:** Each of the 35 cards appears exactly once in the PB collection tab and Practice/Sandbox deck creation, and never in All Cards, crafting, shop or other modes' pools.
- **CAP-6**
  - **intent:** Defects nobody has reported are found by an unattended run.
  - **success:** One scripted run plays every card and uses every active in a Practice/Sandbox v2 match, asserting the CAP-1 to CAP-5 invariants after each step, and outputs a defect report that is empty at completion.
- **CAP-7**
  - **intent:** Each found defect is fixed once and stays fixed.
  - **success:** Every entry in `defect-register.md` has a regression test that failed before its fix and passes after; no legacy-mode card, rule or test changes behavior.

## Constraints

- `card-roster.md` is authoritative for expected values and text; where a defect's expected behavior is not in the roster, it becomes an Open Question instead of being decided by the implementer.
- A defect counts as fixed only with an executed passing test or a recorded live observation; code reading alone, an existing fix commit, or a prior "done" status does not qualify.
- Fixes stay inside Phobies import code and Practice/Sandbox v2 paths; original Duelyst cards and other modes are untouched.
- UI surfaces are verified by building the web client and observing it in the built-in browser, in addition to render-tree assertions; screenshots or captured values are the recorded live observation.
- Test and sweep paths must run with or without Redis; suites that need Redis at `127.0.0.1:6379` are marked so they are not mistaken for failures.

## Non-goals

- New cards, abilities or features, including the action-model/Rush stories.
- Rebalancing stats or abilities.
- Enabling any imported card or new rule outside Practice and Sandbox v2.
- Resolving the audit's open conflicts (Raising Hell geometry, Rage on initial summon) without a separate decision.

## Success signal

The CAP-6 sweep runs unattended over all 35 cards and 16 actives and reports no defect, every entry in `defect-register.md` has a failing-then-passing regression test, and the owner's reported symptoms no longer occur when the owner plays a Practice match.

## Assumptions

- Unit tests that need Redis run with the Docker container `duelyst-redis`.
- The five symptoms the owner reported, plus the collection-icon symptom, are the starting `defect-register.md`; commits `8d5976bb`, `9719a7c9` and `4cdf3a1b` are treated as unverified fixes, not closures.
- The missing effect text is a UI drawing defect, since the text exists in `abilities.coffee`.

## Open Questions

- None open.
