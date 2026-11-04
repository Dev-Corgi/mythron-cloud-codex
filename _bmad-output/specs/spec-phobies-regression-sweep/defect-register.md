# Defect Register

Starting set from the owner's reports on 2026-11-04 and the 2026-11-04 audit. Status is as of branch `cardimplement` HEAD `8d5976bb`; nothing here has been verified in a live client. New defects found by the CAP-6 sweep are appended.

| ID | Surface | Symptom | Expected | Prior fix, not yet verified | Status |
|---|---|---|---|---|---|
| D-1 | Data + UI | Hand-slot active ability frame shows stray yellow and red numbers over the Lockdown and Cooldown icons | Counters show the unit's real Lockdown and Cooldown values only | `8d5976bb` | Unverified |
| D-2 | UI | After a move, data position changes but the unit does not move on screen | Node tile equals entity position after every move | `9719a7c9` | Unverified |
| D-3 | UI | Active ability shows no effect text | Roster "Active ability text" shown on the ability card, in all surfaces | none | Reproduces (owner) |
| D-4 | Data | Healing Mystic's Flash Reincarnation can target its own caster | Single-target friendly heal and Attack-boost actives exclude the caster | none | Open; applies to all four single-target friendly actives (owner decision): Healing Mystic, Emerald Rejuvenator, Letigress, Captain Hank Hart |
| D-5 | UI | Each PB card appears twice in the collection | One card, once | `4cdf3a1b` | Unverified; audit item 12 says crafting All Cards still admits PB |
| D-6 | UI | Collection ability icons are cropped still images, not sprite-sheet animation | Animated source skill icon from its real atlas | none | Open |
| D-7 | UI | Collection ability icons miss Lockdown and Cooldown and sit in the wrong position | Same frame, counters and placement as the hover card shown over a hand card (owner decision), fed by the shared ability-frame data module | none | Open |
| D-8 | Data + UI | Healing seems to do nothing | Restores only missing Health; full-Health target shows 0 | none | Likely not a defect (target was at full Health); confirm with a test |

## Audit findings carried in

All numbered findings in `../../implementation-artifacts/phobies-import-audit-2026-11-04.md` (Raising Hell self-kill, Gotcha and Generals, last-point embedded attacks, card 50032 Lockdown, Caw Claw and Knucklestorm art, push replay, FX lookup, AI and tile-highlight legality, General signature pairs and scaling, test isolation, retired fixtures) are inputs here. The repair commit `e5dfc329` addressed many; each is re-checked by the sweep and stays in this register until its regression test is shown passing.
