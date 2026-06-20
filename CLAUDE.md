# CLAUDE.md — Harvest the Hazard

Onboarding for a fresh session. Keep this file **concise and current** — overwrite stale notes, don't append a log.

## What this is
**Harvest the Hazard** — a 2D top-down economy/strategy game. The hook: **the spreading fluid is your enemy AND your only fuel.** You farm a controlled flood — harvest deep, dangerous pools for energy while keeping the fluid off your Core and network — and win by charging a **Beacon** in the deadliest spot.

## Run it
No build, no dependencies, no server. Clone the repo and open **`index.html`** directly in a browser (works over `file://`).

## Current state
- **Version: v0.2** (tagged locally `v0.2`; see "Gotchas" about pushing tags).
- Fully playable end-to-end. v0.2 is a **readability + threat** pass: live state now reads at a glance.
  - **Gradual, depth-scaled fluid damage** on all damageable structures (Extractor/Relay/Blaster) with **HP + health bars**; Extractors toughest, Relays most fragile; **Beacon immune**; **Core unchanged** (instant loss if submerged); Barriers stay dry.
  - **Repair** toolbar tool (toggled "repair pump": heals HP over time, costs energy).
  - **Floating Extractor yield numbers** and a **cursor hover readout** (exact depth + risk level + structure HP/yield).
  - Faster flood (`emitterRate` 7→10, `basinPrefill` 2.6→3.6) so deep fluid actually threatens structures.
- No known bugs; no console errors across all self-test scenarios.

## Where to look
- **`DESIGN.md`** — full spec, design decisions, and the current `CONFIG` tuning table.
- **`CHANGELOG.md`** — one entry per version.
- **`snapshots/vX.Y.png`** — a representative screenshot per version (for the visual progress report).
- **`.dev/shot.mjs`** — optional dev-only Playwright self-test harness (see workflow below). Not part of the game.

## Code map (`index.html`, single file, all inline)
Everything is in one `<script>`. Navigate by the big banner comments; approx line numbers:
- **`CONFIG`** object (all tunables) — line ~179. **Balance changes go here only.** Includes the v0.2 `damage` block (~208: per-type `hp` / `startDepth` / `rate`, `lethalDepth`) and `repair` block (~215: `rate`, `costPerHp`).
- **`MAP24`** terrain — line ~255. Readable 24×16 ASCII heightmap (`0`–`3` = elevation), upscaled ×2 to the 48×32 grid by `buildTerrain()` (~309).
- **State / data structures** — ~283. Typed-array grids indexed `idx(c,r)=r*C+c`:
  - `elev` (Uint8), `depth` (Float32, **per-cell fluid depth**), `delta` (Float32 flow scratch), `isWall` (Uint8 barriers), `occ` (structure-per-cell), and **`structures`** (array of `{type,c,r,active,hp,repairing,dps,yield,...}`; `core`/`beacon` are refs into it).
  - **`DAMAGEABLE`** set (~324) = `{extractor,relay,blaster}`: the types that have HP/health bars and take fluid damage.
- **Placement / network**: `placeStructure` (~351, inits `hp` for damageable types), `removeAt` (~376), `recomputeNetwork` (~393, BFS from Core; link if `dist ≤ max(rangeA,rangeB)`).
- **Fluid flow update**: `fluidStep(dt)` (~415). Emitter adds pressure, then a mass-conserving Jacobi step over surface heights (`elev*levelHeight + depth`) into `delta`, then applied.
- **Economy / damage / structure logic**: `simStep(dt)` (~456). Extractor harvest (sets `s.yield`) → **gradual damage + repair pass** over `DAMAGEABLE` structures (computes `s.dps`, drains/heals `s.hp`, destroys at 0) → Blaster targeting/firing → Beacon charge/draw → win/lose. `endGame` (~568).
- **Rendering**: `render()` (~607) draws terrain+cliffs, fluid overlay (`fluidStyle`, **unchanged** green→blue→purple), grid, network lines, emitter, shots, structures (`drawStructure` ~702 — also draws **health bars, floating yield numbers, repair ring, at-risk flash**), and the hover/build preview (`drawHover` ~800).
- **HUD**: `updateHud` (~845). **Hover readout**: `riskInfo` (~868) + `updateCellTip` (~878, positions the `#celltip` tooltip). **Toolbar**: `buildToolbar` (~908, includes the **Repair** tool).
- **Input** (mouse): `cellFromEvent` (~955) + canvas `click` (place / repair / delete) / `contextmenu` (right-click sell) / `mousemove` (updates hover + tooltip); `tryRepair` (~977) toggles a structure's repair pump.
- **Init/restart**: `init()` (~1015, also pre-floods the basin). **Main loop**: `frame()` (~1042; rAF, accumulates real time × speed, runs fixed `fluidTickMs` steps).
- **`window.HTH`** (~1064) — test/automation hook used by `.dev/shot.mjs` (place/step/setEnergy/`structs()`/`repairAt()`/etc.). Harmless; keep it working for the self-test loop.

## Tech constraints to preserve (do not break)
- **One self-contained `index.html`** — all HTML/CSS/JS inline.
- **Vanilla JS + Canvas only** — no frameworks, no npm, no build step, no external image/audio assets.
- **Plain inline `<script>` (NOT an ES module)** so it runs over `file://` with no CORS issues.
- **All tunable numbers stay in the single `CONFIG` object.**

## Per-version workflow (every iteration)
1. Implement the changes (balance in `CONFIG`; terrain in `MAP24`).
2. **Visually self-test before committing**: run the game headless and screenshot it — `node .dev/shot.mjs <out.png> <scenario>` (scenarios: `howto|baseline|spread|play|hero|beacon|win`; needs a global Playwright+Chromium). Verify terrain/fluid/structures/HUD render and a full play sequence works (harvest, blast, dam, **take damage, repair**, charge Beacon, win/lose). Iterate until it looks/plays right — don't commit blind.
3. Update **`DESIGN.md`** + **`CHANGELOG.md`**, save **`snapshots/vX.Y.png`**, and keep **this CLAUDE.md** current.
4. Commit, **tag `vX.Y`**, push.

## Gotchas / decisions / TODO
- **Branch & tag push:** the spec says commit to `main`, but this environment forces work onto the session branch (currently `claude/zen-allen-w4yb5c`) and the git proxy **rejects tag pushes (HTTP 403)** + the GitHub MCP has no create-tag API. So tags are created **locally only**; recreate/push from a normal clone: `git tag -a vX.Y <sha> && git push origin vX.Y`.
- **Repo:** built into the existing `claude-fluid-game` repo (not a new `harvest-the-hazard` repo).
- **Intentional design:** extraction does **not** drain depth (keeps the risk dial live — manage depth via Blasters/Barriers/Repair); the basin is **pre-flooded** at start; Beacon must sit on an elevation-0 basin cell; the **Core sits safe on a plateau** (its submerge-loss is a backstop, hard to reach by passive flooding — the real threat is to your built structures).
- **Damage/repair decisions:** Barriers are walls (own cell forced dry) so they never take damage and show no HP bar. Repair is allowed even on disconnected structures (you're bailing water) and can run while still flooded. Repair currently out-heals shallow/moderate flooding cheaply — a likely future tuning target.
- **TODO / ideas (deferred):** WebAudio synth SFX (no assets), multiple emitters/maps, upgrades, smarter Blaster modes, save/restore, richer flow visuals, minimap. Balance is still a first/second pass — pacing/economy and the damage-vs-repair curve are the most likely tuning targets.
