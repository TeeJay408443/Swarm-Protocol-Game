---
name: Astral Scourge phases
description: The Wave 20 boss's phases, circular attack geometry, cutscene, and theme music.
---

The Wave 20 Astral Scourge has a damaging tail and two phases: Phase 1 has 1,000,000 HP; after it is defeated, wait 3 seconds, then start a special cutscene with the exact bottom dialogue “IT'S NOT OVER YET.” Phase 2 has 2,500,000 HP and begins with a fast arena rush. During its 5-second orbital-grid setup, the 84 tail segments orbit a fixed center at a 320-unit radius; then they hold the ring while firing a thin 1.8-second grid of perpendicular random-angle lines. A separate three-line laser fan tracks and locks onto the player; orbital grids, aimed fans, laser walls, and rift lunges are selected in random order. After a grid fires, the boss retreats for 1.35 seconds before choosing another attack. Between special attacks, it aggressively rams the player. Keep phase-two shots sparse: no orb barrage, and only a small aimed volley outside laser attacks. Use orbiting starlight, astral lightning, and shockwaves for its cutscene. Play the user's selected YouTube theme, “Astral Scourge” (video ID `W70Q1R-inLc`), through the hidden audio player with no visible video. Do not use the old rotating cross-beam attack for Astral Scourge, but preserve it for other bosses.

During the ring setup, position segments from the distance traveled along the orbit so the full circle forms consistently across frame rates. When firing begins, freeze the head and every segment at their completed positions; keep the ring and grid in world space rather than following the player. Choose the grid more often than the other phase-two patterns (40% versus 20% each).

**Why:** The user specified the encounter design and later clarified that the formed ring must stay in place and the grid pattern must not follow the player.

**How to apply:** Trigger Phase 2 three seconds after Phase 1 is depleted; preserve the exact health values and dialogue. Keep the circle, random laser patterns, ramming movement, and audio exclusive to Astral Scourge. Preserve an open interior to dodge and a retreat interval before the next pattern.
