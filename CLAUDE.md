# CLAUDE.md — Harvest the Hazard

Onboarding for a fresh session. Keep this file **concise and current** — overwrite stale notes, don't append a log.

## What this is
**Harvest the Hazard** — a 2D top-down economy/strategy game. The hook: **the spreading fluid is your enemy AND your only fuel.** You farm a controlled flood — harvest deep, dangerous pools for energy while keeping the fluid off your Core and network — and win by charging a **Beacon** in the deadliest spot.

## Run it
No build, no dependencies, no server. Clone the repo and open **`index.html`** directly in a browser (works over `file://`).

## Current state
- **Version: v0.1** (tagged locally `v0.1`; see "Gotchas" about pushing tags).
- Fully playable end-to-end: mass-conserving fluid sim, depth-scaled Extractors with at-risk/destroy states, Relays/Blasters/Barriers, Beacon win + Core-submerge lose, full mouse UI, pause + 1x/2x/3x, how-to panel. No known bugs; no console errors.

## Where to look
- **`DESIGN.md`** — full spec, design decisions, and the current `CONFIG` tuning table.
- **`CHANGELOG.md`** — one entry per version.
- **`snapshots/vX.Y.png`** — a representative screenshot per version (for the visual progress report).
- **`.dev/shot.mjs`** — optional dev-only Playwright self-test harness (see workflow below). Not part of the game.

## Code map (`index.html`, single file, all inline)
Everything is in one `<script>`. Navigate by the big banner comments; approx line numbers:
- **`CONFIG`** object (all tunables) — line ~168. **Balance changes go here only.**
- **`MAP24`** terrain — line ~231. Readable 24×16 ASCII heightmap (`0`–`3` = elevation), upscaled ×2 to the 48×32 grid by `buildTerrain()` (~285).
- **State / data structures** — ~251. Typed-array grids indexed `idx(c,r)=r*C+c`:
  - `elev` (Uint8, elevation 0–3), `depth` (Float32, **per-cell fluid depth**), `delta` (Float32 flow scratch), `isWall` (Uint8, barriers), `occ` (structure-per-cell), and **`structures`** (array of `{type,c,r,active,...}`; `core` and `beacon` are refs into it).
- **Placement / network**: `placeValidity` (~309), `placeStructure` (~326), `removeAt` (~347), `recomputeNetwork` (~366, BFS from Core; link if `dist ≤ max(rangeA,rangeB)`).
- **Fluid flow update**: `fluidStep(dt)` (~388). Emitter adds pressure, then a mass-conserving Jacobi step over surface heights (`elev*levelHeight + depth`) into `delta`, then applied. No front culling (only a denormal guard).
- **Economy / structure logic**: `simStep(dt)` (~429). Extractor harvest (`yield = min(extractorYield*depth, cap)`, connected only) + at-risk/destroy checks; **Blaster** targeting/firing; **Beacon** charge/draw; win/lose checks. `endGame` (~516).
- **Rendering**: `render()` (~554) draws terrain+cliffs, fluid overlay (`fluidStyle`, opacity/hue by depth), grid, network lines, emitter, shots, structures (`drawStructure` ~649), and the hover/build preview (`drawHover` ~721).
- **HUD**: `updateHud` (~759). **Toolbar**: `buildToolbar` (~784).
- **Input** (mouse): `cellFromEvent` (~823) + canvas `click` / `contextmenu` (right-click sell) / `mousemove`; pause/speed/start buttons just below.
- **Init/restart**: `init()` (~874, also pre-floods the basin). **Main loop**: `frame()` (~901, rAF; accumulates real time × speed, runs fixed `fluidTickMs` steps).
- **`window.HTH`** (~923) — test/automation hook used by `.dev/shot.mjs` (place/step/setEnergy/etc.). Harmless; keep it working for the self-test loop.

## Tech constraints to preserve (do not break)
- **One self-contained `index.html`** — all HTML/CSS/JS inline.
- **Vanilla JS + Canvas only** — no frameworks, no npm, no build step, no external image/audio assets.
- **Plain inline `<script>` (NOT an ES module)** so it runs over `file://` with no CORS issues.
- **All tunable numbers stay in the single `CONFIG` object.**

## Per-version workflow (every iteration)
1. Implement the changes (balance in `CONFIG`; terrain in `MAP24`).
2. **Visually self-test before committing**: run the game headless and screenshot it — `node .dev/shot.mjs <out.png> <scenario>` (scenarios: `howto|baseline|spread|play|hero|beacon|win`; needs a global Playwright+Chromium). Verify terrain/fluid/structures/HUD render and a full play sequence works (harvest, blast, dam, charge Beacon, win/lose). Iterate until it looks/plays right — don't commit blind.
3. Update **`DESIGN.md`** + **`CHANGELOG.md`**, save **`snapshots/vX.Y.png`**, and keep **this CLAUDE.md** current.
4. Commit, **tag `vX.Y`**, push.

## Gotchas / decisions / TODO
- **Branch & tag push:** the spec says commit to `main`, but this environment forces work onto the session branch `claude/trusting-ritchie-opo4ta` and the git proxy **rejects tag pushes (HTTP 403)** + the GitHub MCP has no create-tag API. So tags are created **locally only**; recreate/push from a normal clone: `git tag -a vX.Y <sha> && git push origin vX.Y`.
- **Repo:** built into the existing `claude-fluid-game` repo (not a new `harvest-the-hazard` repo).
- **Intentional design:** extraction does **not** drain depth (keeps the risk dial live — manage depth via Blasters/Barriers); the basin is **pre-flooded** at start; Beacon must sit on an elevation-0 basin cell.
- **TODO / ideas (deferred):** WebAudio synth SFX (no assets), multiple emitters/maps, upgrades, smarter Blaster modes, save/restore, richer flow visuals, minimap. v0.1 balance is a first pass — pacing/economy are the most likely tuning targets.
