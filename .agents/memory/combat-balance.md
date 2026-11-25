---
name: Enemy damage survivability
description: Shared damage reduction across normal enemies and boss encounters.
---

Regular enemies deal about 80% of their original hit damage, capped at 40% of player maximum health per hit. Bosses and mini-bosses retain the existing 70% hit-damage factor. Regular enemy wave growth is slightly stronger than boss scaling; boss health and damage curves remain on the gentler existing settings.

**Why:** The user most recently asked for regular enemies to ramp up somewhat faster and hit harder, while explicitly keeping boss health and damage unchanged.

**How to apply:** Apply stronger wave growth only to regular enemies. Preserve main boss/mini-boss health and damage. Keep environmental hazards separate.

Wave-by-wave health, damage, and speed growth should remain gradual. Main cinematic bosses—including Astral Scourge—must ignore player knockback, pulls, and enemy collision displacement.

**Why:** The user reported enemies ramping up too quickly and specifically asked that cutscene bosses not be affected by knockback.

**How to apply:** Keep the growth curves gentle across waves and survival time. Apply knockback immunity consistently to all cutscene bosses and preserve their scripted movement.
