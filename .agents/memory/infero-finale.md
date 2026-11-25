---
name: Inferno desperation finale
description: Required survival finale, locked ram aim, and readable sun warnings for Inferno Champion.
---

Inferno Champion must remain alive at zero HP for a ten-second desperation finale. Repeatedly open a nearby portal, teleport into it and launch a locked-direction ram simultaneously. Start with a normally visible screen, gradually fade to full white, and only then kill the boss and show victory.

**Why:** The user repeated this requirement after the first implementation did not behave correctly. This is a timed finale, not another health-bar phase or an immediate death effect.

**How to apply:** Keep the whiteout and boss finale on the same gameplay timer, including pause behavior. Do not award defeat rewards or activate victory before the full-white frame.

Desperation rams must lock onto the player's position when each portal opens. Neither the warning nor the launched ram should track subsequent movement.

**Why:** The user specifically requested this to make the slower rams more dodgeable.

**How to apply:** Use the same captured target for both the warning and the ram.

The boss's correct displayed name is **Inferno Champion**, not Infero Champion.

**Why:** The user corrected the original typo.

**How to apply:** Use the corrected name in player-facing text; preserve existing internal identifiers to avoid breaking saved items.

The phase-two sun attack must show fully extended indicator lines throughout the warning, including rotation, then hold still for 0.2 seconds before firing.

**Why:** The user requested this reaction window to make the attack more dodgeable.

**How to apply:** Keep both the boss-centered sun and the detached sun consistent; the displayed warning must match the damaging beam path.
