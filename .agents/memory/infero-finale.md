---
name: Inferno desperation finale
description: Required zero-health survival finale and victory timing for Inferno Champion.
---

Inferno Champion must remain alive at zero HP for a ten-second desperation finale. Repeatedly open a nearby portal, teleport into it and launch a locked-direction ram simultaneously. Start with a normally visible screen, gradually fade to full white, and only then kill the boss and show victory.

**Why:** The user repeated this requirement after the first implementation did not behave correctly. This is a timed finale, not another health-bar phase or an immediate death effect.

**How to apply:** Keep the whiteout and boss finale on the same gameplay timer, including pause behavior. Do not award defeat rewards or activate victory before the full-white frame.

The boss's correct displayed name is **Inferno Champion**, not Infero Champion.

**Why:** The user corrected the original typo.

**How to apply:** Use the corrected name in player-facing text; preserve existing internal identifiers to avoid breaking saved items.
