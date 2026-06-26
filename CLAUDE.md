# CLAUDE.md — Harvest the Hazard

Onboarding for a fresh session. Keep this file **concise and current** — overwrite stale notes, don't append a log.

## What this is
**Harvest the Hazard** — a 2D top-down economy/strategy game. The hook: **the spreading fluid is your enemy AND your only fuel.** You farm a controlled flood — harvest deep, dangerous pools for energy while keeping the fluid off your Core and network — and win by charging a **Beacon** in the deadliest spot.

## Run it
No build, no dependencies, no server. Clone the repo and open **`index.html`** directly in a browser (works over `file://`).

## Current state
- **Version: v0.4** (tagged locally `v0.4`; see "Gotchas" about pushing tags).
- Fully playable end-to-end. v0.4 is a **barrier rework (anti-cheese) + metal economy** pass.
  - **Barrier erosion + repair:** Barriers now have **HP + health bars** and are **eroded by the
    pressure they dam** (erosion ∝ surface-height differential across the wall via `barrierDifferential()`);
    at 0 HP they **burst** (removed; fluid flows through). Repair is a **maintenance pump** (stays armed,
    doesn't auto-stop at full) and **costs metal**.
  - **Metal economy:** second resource `game.metal`. **Deposits** = renewable overlay on existing cells
    (`deposit` array; terrain unchanged) at `CONFIG.metalDeposits`. **Miner** tool harvests metal when
    on/adjacent to a deposit + connected (flood-damageable like an Extractor; obeys build-time). Barriers
    **cost metal** (build + repair); everything else costs energy (`costType()`). Metal HUD stat added.
  - The at-risk "!" flash now keys off **net** HP loss (`s.losing`), so a maintained eroding wall doesn't
    false-alarm.
- Carries forward **v0.3** (timed blueprint construction, slower economy, white Extractor yield) and
  **v0.2** (depth-scaled fluid damage, HP/health bars, Repair tool, hover readout). Fluid style / terrain
  / win-lose unchanged.
- No known bugs; no console errors across all self-test scenarios.

## Where to look
- **`DESIGN.md`** — full spec, design decisions, and the current `CONFIG` tuning table.
- **`CHANGELOG.md`** — one entry per version.
- **`snapshots/vX.Y.png`** — a representative screenshot per version (for the visual progress report).
- **`.dev/shot.mjs`** — optional dev-only Playwright self-test harness (see workflow below). Not part of the game.

## Code map (`index.html`, single file, all inline)
Everything is in one `<script>`. Navigate by the big banner comments; approx line numbers:
- **`CONFIG`** object (all tunables) — top of the script. **Balance changes go here only.** Includes the v0.4 `metalDeposits`/`startMetal`/`metalYield` + `barrier` block (`hp`/`erodeStart`/`erosionRate`/`repairRate`/`repairCostPerHp`), the v0.3 `buildTime` block, the v0.2 `damage` block (per-type `hp`/`startDepth`/`rate` — now incl. `miner`) and `repair` block. `cost.barrier` is in **metal**, the rest in energy.
- **`MAP24`** terrain — readable 24×16 ASCII heightmap (`0`–`3` = elevation), upscaled ×2 to the 48×32 grid by `buildTerrain()`. **Do not edit elevations** (deposits are a separate overlay, not terrain).
- **State / data structures** — typed-array grids indexed `idx(c,r)=r*C+c`:
  - `elev`, `depth`, `delta`, `isWall`, **`deposit`** (Uint8 metal-deposit overlay), `occ`, and **`structures`** (`{type,c,r,active,hp,repairing,dps,yield,metalYield,diff,losing,building,...}`; `core`/`beacon` refs).
  - `game` carries energy **and** `metal`/`metalIncome`/`metalCons`.
  - **`DAMAGEABLE`** = own-cell-depth damage set `{extractor,relay,blaster,miner}`. **`HAS_HEALTH`** = HP+bar+repair set (adds `barrier`). `maxHpOf(type)` (barrier→`CONFIG.barrier.hp`), `costType(type)` (barrier→metal), `nearDeposit(c,r)` (8-neighbourhood).
- **Placement / network**: `placeStructure` (drops a **blueprint**; spends metal for barriers via `costType`), `placeValidity` (metal check for barriers; Miner must be on/adjacent a deposit), `removeAt` (in-kind refund), `recomputeNetwork` (BFS over **completed** structures only).
- **Construction (v0.3)**: `stepConstruction(dt)` advances blueprints with a completed connected neighbour; barriers build off-network and set `isWall` on completion.
- **Fluid flow update**: `fluidStep(dt)` — mass-conserving Jacobi step over surface heights into `delta`.
- **Barrier erosion**: `barrierDifferential(i,c,r)` — max−min of non-wall neighbour surface heights (the pressure a wall dams). Drives erosion in `simStep`.
- **Economy / damage / structure logic**: `simStep(dt)`: `recomputeNetwork`→`stepConstruction`→income (Extractors→energy `s.yield`, Miners→metal `s.metalYield`)→**HP snapshot**→depth-damage (DAMAGEABLE)→**barrier erosion**→**repair** (energy heals flood structures, metal heals barriers via a *maintenance* pump that doesn't auto-stop)→`s.losing` net-loss flag→destroy/burst→Blasters→Beacon→win/lose.
- **Rendering**: `render()` draws terrain, fluid (`fluidStyle`, **unchanged**), grid, **deposits (`drawDeposit`)**, network lines, emitter, shots, structures (`drawStructure` — build ring for blueprints; for completed ones: health bars via `maxHpOf`, white Extractor yields, **steel Miner metal yields**, repair ring, net-loss at-risk flash). Miner has its own steel-cog shape.
- **HUD**: `updateHud` (energy + **metal counter/net**). **Hover readout**: `riskInfo` + `updateCellTip` (HP via `maxHpOf`, miner metal/s, barrier eroding/repairing, deposit line). **Toolbar**: `buildToolbar` (Miner tool; barrier shows **metal** cost; Repair shows energy+metal rates).
- **Input** (mouse): `cellFromEvent` + canvas `click` (place / repair / delete) / `contextmenu` (right-click sell) / `mousemove` (hover + tooltip); `tryRepair` toggles a repair pump (barriers can be pre-armed at full HP; flood structures only when damaged).
- **Init/restart**: `init()` (pre-floods the basin **and** lays the `deposit` overlay from `CONFIG.metalDeposits`; resets metal). **Main loop**: `frame()` (rAF, fixed `fluidTickMs` steps × speed).
- **`window.HTH`** — test/automation hook used by `.dev/shot.mjs` (`place`/`step`/`setEnergy`/**`setMetal`**/**`metal`**/`structs()`/`repairAt()`/`finishBuilds()`/etc.; `structs()` reports `bld/bp/bt/bcon` blueprint state + `my`/`diff`/`lose`). Harmless; keep it working for the self-test loop.

## Tech constraints to preserve (do not break)
- **One self-contained `index.html`** — all HTML/CSS/JS inline.
- **Vanilla JS + Canvas only** — no frameworks, no npm, no build step, no external image/audio assets.
- **Plain inline `<script>` (NOT an ES module)** so it runs over `file://` with no CORS issues.
- **All tunable numbers stay in the single `CONFIG` object.**

## Per-version workflow (every iteration)
1. Implement the changes (balance in `CONFIG`; terrain in `MAP24`).
2. **Visually self-test before committing**: run the game headless and screenshot it — `node .dev/shot.mjs <out.png> <scenario>` (scenarios: `howto|baseline|spread|build|play|hero|beacon|win|metal|erode`; needs a global Playwright+Chromium). Verify terrain/fluid/structures/HUD render and a full play sequence works (build over time, harvest energy **+ mine metal**, blast, dam, **erode/burst + repair barriers**, take damage, charge Beacon, win/lose). Iterate until it looks/plays right — don't commit blind.
3. Update **`DESIGN.md`** + **`CHANGELOG.md`**, save **`snapshots/vX.Y.png`**, and keep **this CLAUDE.md** current.
4. Commit, **tag `vX.Y`**, push.

## Gotchas / decisions / TODO
- **Branch & tag push:** the spec says commit to `main`, but this environment forces work onto the session branch (currently `claude/tender-planck-01o7qe`) and the git proxy **rejects tag pushes (HTTP 403)** + the GitHub MCP has no create-tag API. So tags are created **locally only**; recreate/push from a normal clone: `git tag -a vX.Y <sha> && git push origin vX.Y`.
- **Repo:** built into the existing `claude-fluid-game` repo (not a new `harvest-the-hazard` repo).
- **Intentional design:** extraction does **not** drain depth (keeps the risk dial live — manage depth via Blasters/Barriers/Repair); the basin is **pre-flooded** at start; Beacon must sit on an elevation-0 basin cell; the **Core sits safe on a plateau** (its submerge-loss is a backstop, hard to reach by passive flooding — the real threat is to your built structures).
- **Damage/repair decisions:** flood structures (Extractor/Miner/Relay/Blaster) take own-cell-depth damage; their repair is a one-time heal (auto-stops at full) and costs energy; allowed even while disconnected/flooded. Repair still out-heals shallow flooding cheaply on flood structures — a likely future tuning target.
- **v0.4 barrier/metal decisions:** Barriers now have HP and **erode by pressure** (differential across the wall), not own-cell depth (their cell is forced dry). Barrier repair is a **maintenance pump** (stays armed, doesn't auto-stop) and costs **metal**; this is deliberate so a deep dam is an ongoing metal sink (anti-cheese). Deposits are an **overlay** (`deposit` array), never a terrain edit. Miners cost energy, barriers cost metal (bootstrap: energy→miners→metal→walls). Tuning lives in `CONFIG.barrier` + `metalDeposits`/`metalYield`/`startMetal`.
- **TODO / ideas (deferred):** WebAudio synth SFX (no assets), multiple emitters/maps, upgrades, smarter Blaster modes, save/restore, richer flow visuals, minimap. Likely next tuning: flood-structure repair-vs-damage curve and the late-game energy snowball (v0.3 note); erosion-vs-repair and deposit placement (v0.4).
