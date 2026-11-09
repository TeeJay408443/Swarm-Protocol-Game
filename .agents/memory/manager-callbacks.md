---
name: Manager callback naming
description: Avoid runtime shadowing in game-system callback registration.
---

Use distinct names for stored callbacks and public registration methods in game managers. For example, keep `onWaveStart(callback)` as the public method and store its callback in `onWaveStartCallback`.

**Why:** A class instance field with the same name as a prototype method shadows that method at runtime; calling the registration method then throws and can leave the React app blank.

**How to apply:** When adding callback APIs to game managers, check both the field declaration and all invocation sites, and smoke-test the method on a constructed instance.
