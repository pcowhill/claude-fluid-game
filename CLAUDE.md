# CLAUDE.md — Harvest the Hazard

Onboarding for a fresh session. Keep this file **concise and current** — overwrite stale notes, don't append a log.

## What this is
**Harvest the Hazard** — a 2D top-down economy/strategy game. The hook: **the spreading fluid is your enemy AND your only fuel.** You farm a controlled flood — harvest deep, dangerous pools for energy while keeping the fluid off your Core and network — and win by charging a **Beacon** in the deadliest spot.

## Run it
No build, no dependencies, no server. Clone the repo and open **`index.html`** directly in a browser (works over `file://`).

## Current state
- **Version: v0.3** (tagged locally `v0.3`; see "Gotchas" about pushing tags).
- Fully playable end-to-end. v0.3 is a **pacing & difficulty** pass: the old ~10s rush-win is gone; a
  careful game now runs multi-minute at a MEDIUM difficulty.
  - **Timed, sequential construction** (the anti-rush change): placing a structure drops a **blueprint**
    that builds over `CONFIG.buildTime[type]` seconds. A network blueprint only advances while within
    link range of an already-**completed** connected structure (Core counts), and while building it's
    inactive and does **not** extend the network — so a relay line builds one segment at a time. Barriers
    build off-network and only block fluid once finished. Build-progress ring (cyan `%` / grey `wait`).
  - **Slower economy:** `startEnergy` 260→200, `coreIncome` 1.5→1.0, `extractorYield` 2.3→1.8, cap 34→24.
  - **Floating Extractor yield number is now white** (was amber, too close to the Extractor's orange).
- Carries forward all **v0.2** features: depth-scaled fluid damage, per-structure HP + health bars, the
  **Repair** tool, floating yields, the cursor depth/risk hover readout. Fluid style / terrain / win-lose
  unchanged.
- No known bugs; no console errors across all self-test scenarios.

## Where to look
- **`DESIGN.md`** — full spec, design decisions, and the current `CONFIG` tuning table.
- **`CHANGELOG.md`** — one entry per version.
- **`snapshots/vX.Y.png`** — a representative screenshot per version (for the visual progress report).
- **`.dev/shot.mjs`** — optional dev-only Playwright self-test harness (see workflow below). Not part of the game.

## Code map (`index.html`, single file, all inline)
Everything is in one `<script>`. Navigate by the big banner comments; approx line numbers:
- **`CONFIG`** object (all tunables) — line ~179. **Balance changes go here only.** Includes the v0.3 `buildTime` block (per-type construction seconds), the v0.2 `damage` block (per-type `hp` / `startDepth` / `rate`, `lethalDepth`) and `repair` block (`rate`, `costPerHp`).
- **`MAP24`** terrain — line ~255. Readable 24×16 ASCII heightmap (`0`–`3` = elevation), upscaled ×2 to the 48×32 grid by `buildTerrain()` (~309).
- **State / data structures** — ~283. Typed-array grids indexed `idx(c,r)=r*C+c`:
  - `elev` (Uint8), `depth` (Float32, **per-cell fluid depth**), `delta` (Float32 flow scratch), `isWall` (Uint8 barriers), `occ` (structure-per-cell), and **`structures`** (array of `{type,c,r,active,hp,repairing,dps,yield,...}`; `core`/`beacon` are refs into it).
  - **`DAMAGEABLE`** set (~324) = `{extractor,relay,blaster}`: the types that have HP/health bars and take fluid damage.
- **Placement / network**: `placeStructure` (~351, now drops a **blueprint**: `building/buildProgress/buildTime/buildConnected`), `removeAt` (refund works mid-build), `recomputeNetwork` (BFS from Core over **completed** structures only — blueprints don't relay).
- **Construction (v0.3)**: `stepConstruction(dt)` (just after `recomputeNetwork`) advances blueprints that have a completed connected neighbour; finishing one re-links the network (so chains serialize). Barriers build off-network and set `isWall` only on completion. Called at the top of `simStep`.
- **Fluid flow update**: `fluidStep(dt)` (~415). Emitter adds pressure, then a mass-conserving Jacobi step over surface heights (`elev*levelHeight + depth`) into `delta`, then applied.
- **Economy / damage / structure logic**: `simStep(dt)`. `recomputeNetwork` → `stepConstruction` → Extractor harvest (sets `s.yield`) → **gradual damage + repair pass** over `DAMAGEABLE` structures (skips blueprints; computes `s.dps`, drains/heals `s.hp`, destroys at 0) → Blaster targeting/firing → Beacon charge/draw → win/lose. `endGame`.
- **Rendering**: `render()` draws terrain+cliffs, fluid overlay (`fluidStyle`, **unchanged** green→blue→purple), grid, network lines, emitter, shots, structures (`drawStructure` — draws the **build-progress ring** for blueprints, plus **health bars, white floating yield numbers, repair ring, at-risk flash** for completed ones), and the hover/build preview (`drawHover`).
- **HUD**: `updateHud` (~845). **Hover readout**: `riskInfo` (~868) + `updateCellTip` (~878, positions the `#celltip` tooltip). **Toolbar**: `buildToolbar` (~908, includes the **Repair** tool).
- **Input** (mouse): `cellFromEvent` (~955) + canvas `click` (place / repair / delete) / `contextmenu` (right-click sell) / `mousemove` (updates hover + tooltip); `tryRepair` (~977) toggles a structure's repair pump.
- **Init/restart**: `init()` (~1015, also pre-floods the basin). **Main loop**: `frame()` (~1042; rAF, accumulates real time × speed, runs fixed `fluidTickMs` steps).
- **`window.HTH`** — test/automation hook used by `.dev/shot.mjs` (place/step/setEnergy/`structs()`/`repairAt()`/**`finishBuilds()`**/etc.; `structs()` now reports blueprint state `bld/bp/bt/bcon`). Harmless; keep it working for the self-test loop.

## Tech constraints to preserve (do not break)
- **One self-contained `index.html`** — all HTML/CSS/JS inline.
- **Vanilla JS + Canvas only** — no frameworks, no npm, no build step, no external image/audio assets.
- **Plain inline `<script>` (NOT an ES module)** so it runs over `file://` with no CORS issues.
- **All tunable numbers stay in the single `CONFIG` object.**

## Per-version workflow (every iteration)
1. Implement the changes (balance in `CONFIG`; terrain in `MAP24`).
2. **Visually self-test before committing**: run the game headless and screenshot it — `node .dev/shot.mjs <out.png> <scenario>` (scenarios: `howto|baseline|spread|build|play|hero|beacon|win`; needs a global Playwright+Chromium). Verify terrain/fluid/structures/HUD render and a full play sequence works (build over time, harvest, blast, dam, **take damage, repair**, charge Beacon, win/lose). Iterate until it looks/plays right — don't commit blind.
3. Update **`DESIGN.md`** + **`CHANGELOG.md`**, save **`snapshots/vX.Y.png`**, and keep **this CLAUDE.md** current.
4. Commit, **tag `vX.Y`**, push.

## Gotchas / decisions / TODO
- **Branch & tag push:** the spec says commit to `main`, but this environment forces work onto the session branch (currently `claude/tender-planck-01o7qe`) and the git proxy **rejects tag pushes (HTTP 403)** + the GitHub MCP has no create-tag API. So tags are created **locally only**; recreate/push from a normal clone: `git tag -a vX.Y <sha> && git push origin vX.Y`.
- **Repo:** built into the existing `claude-fluid-game` repo (not a new `harvest-the-hazard` repo).
- **Intentional design:** extraction does **not** drain depth (keeps the risk dial live — manage depth via Blasters/Barriers/Repair); the basin is **pre-flooded** at start; Beacon must sit on an elevation-0 basin cell; the **Core sits safe on a plateau** (its submerge-loss is a backstop, hard to reach by passive flooding — the real threat is to your built structures).
- **Damage/repair decisions:** Barriers are walls (own cell forced dry) so they never take damage and show no HP bar. Repair is allowed even on disconnected structures (you're bailing water) and can run while still flooded. Repair currently out-heals shallow/moderate flooding cheaply — a likely future tuning target.
- **TODO / ideas (deferred):** WebAudio synth SFX (no assets), multiple emitters/maps, upgrades, smarter Blaster modes, save/restore, richer flow visuals, minimap. Balance is still a first/second pass — pacing/economy and the damage-vs-repair curve are the most likely tuning targets.
