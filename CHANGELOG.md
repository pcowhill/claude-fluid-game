# Changelog

All notable changes to **Harvest the Hazard**. One entry per released version.

## v0.4 — 2026-06-20
Barrier rework (anti-cheese) + a second resource. Previously you could cheese a win by spamming
cheap Barriers to wall the fluid off entirely. v0.4 makes walling a **defended, ongoing investment**.

- **Barrier erosion + repair.** Barriers now have **HP and a health bar** and are **eroded by the
  pressure they hold back**: erosion scales with the surface-height differential across the wall (deep
  reservoir on one side vs the lower/dry side), so the deeper the reservoir a barrier dams, the faster
  it wears down — a barrier with little differential barely erodes. At **0 HP a barrier BURSTS** (it's
  removed and fluid floods through). Repair them with the existing Repair tool, but **barrier repair
  costs METAL**; a barrier's pump is a *maintenance* pump (stays on, continuously topping up against
  erosion) rather than a one-time heal. All erosion/repair numbers live in `CONFIG.barrier`.
- **Metal economy (second resource).** Barriers now **cost metal** to build (not energy).
  - **Metal deposits** are a renewable overlay on the existing map (steel-hexagon markers on existing
    cells — terrain elevations/layout are unchanged). A small number (3), placed in the contested
    mid-ground so reaching and defending them matters.
  - **Miner** (new toolbar tool): built on/adjacent to a deposit and connected, it harvests metal/s
    into a global pool. It's flood-damageable like an Extractor (HP + health bar) and obeys the v0.3
    build-time system. Miners cost energy (you bootstrap: energy → miners → metal → walls).
  - **HUD:** a metal counter + net metal/s, mirroring the energy stat. The Barrier toolbar entry shows
    its **metal** cost; the Repair entry shows both energy and metal (wall) rates.
- **Why it stops the cheese:** walling a big basin is now self-limiting — a deep dam erodes fast and
  costs a lot of metal/s to maintain (the 23-barrier showcase dam costs ~47 metal/s ≈ 16 miners), so
  you wall *strategically* and keep miners alive to fund it, instead of spamming a one-time wall.
- **Readability:** the at-risk "!" flash now triggers on **net** HP loss (a fully-maintained eroding
  wall no longer false-alarms); Miners show a steel floating metal-yield number; deposits and barrier
  HP/erosion appear in the hover readout.
- **Kept intact:** the green→blue→purple fluid style, terrain elevations/layout, the win (charge Beacon
  100%) and lose (Core submerged) conditions, the mouse-only scheme, and all v0.2/v0.3 features.
- Updated the how-to panel, refreshed `DESIGN.md`, added `snapshots/v0.4.png`, and extended the
  self-test (`.dev/shot.mjs`): new `metal` (miners + eroding dam) and `erode` (unrepaired dam bursts)
  scenarios, `setMetal()`/`metal()` hooks, and metal/erosion fields in the state dump.

## v0.3 — 2026-06-20
Pacing & difficulty pass. The old game could be won in ~10 seconds (instant relay line → drop
Beacon → fast-forward). v0.3 makes it a deliberate, multi-minute game at a MEDIUM difficulty.

- **Timed, sequential construction (the main anti-rush change).** Placing a structure now drops a
  **blueprint** that constructs over time. A network blueprint only *starts* building once it's within
  link range of an already-**completed**, connected structure (the Core counts) — and while building it
  is inactive and does **not** extend the network. So a relay line builds **one segment at a time**
  (relay #1 finishes before #2 can start), which is what stops you spanning the map in seconds. Barriers
  (off-network walls) build on their own and only start blocking fluid once finished.
  - Clear build readout: a **radial progress ring** over a dimmed "under construction" ghost — cyan with
    a live `%` while building, grey `wait` while a blueprint is still waiting for the network to reach it.
  - Per-type build time lives in `CONFIG.buildTime` (scales with cost: Barrier ~2s … Beacon ~28s). The
    Beacon builds too and only begins charging once complete. The Core starts pre-built.
  - Cost is charged when placed; selling/cancelling a blueprint (even mid-build) gives the normal refund.
- **Slower energy economy.** `startEnergy` 260→200, `coreIncome` 1.5→1.0, `extractorYield` 2.3→1.8,
  cap 34→24 — so you can't buy a whole board-spanning build-out up front; the opening is deliberate.
- **Readability fix:** the floating Extractor yield number is now **white** (was amber `#ffd982`, too
  close to the Extractor's own orange) — still with its dark outline so it stays legible over the fluid.
- **Kept intact:** all v0.2 features (depth-scaled fluid damage, per-structure HP + health bars, the
  Repair tool, floating yields, the hover depth/risk readout), the green→blue→purple fluid style, the
  terrain/elevations, and the win/lose conditions.
- Updated the how-to panel (construction), refreshed `DESIGN.md`, added `snapshots/v0.3.png`, and
  extended the self-test (`.dev/shot.mjs`): a new **`build`** scenario showcasing segment-by-segment
  construction, a `finishBuilds()` test hook, and blueprint state in the dump.

## v0.2 — 2026-06-20
Readability pass, anchored by a real flood-damage threat. The headline: live state — fluid depth,
Extractor yield, and especially **building health** — now reads at a glance.

- **Gradual, depth-scaled fluid damage on all structures.** Replaced v0.1's instant, Extractor-only
  destroy threshold (which the basin rarely reached) with continuous damage: when fluid on a
  structure's own cell passes a per-type threshold it loses HP over time, faster the deeper it gets,
  and is destroyed at 0 HP. Toughness order **Extractor > Blaster > Relay**. The **Beacon is immune**;
  the **Core is unchanged** (still an instant loss if submerged); Barriers stay dry (walls).
- **Health bars** on every damageable structure (green → amber → red), so accumulating damage is
  obvious well before destruction. Structures actively taking damage flash a red outline + `!`.
- **Repair mechanic.** New **Repair** toolbar tool toggles a "repair pump" on a damaged structure —
  heals HP over time and spends energy per HP, auto-stopping at full. Damage isn't permanent loss.
- **Floating Extractor yield numbers** drawn on the map (live energy/s per Extractor).
- **Hover readout.** A cursor tooltip shows the exact fluid **depth**, the **risk level**
  (Dry → Shallow → Deep → Hazardous → Lethal), and, over a structure, its type / HP% / yield.
- **Flood escalation.** `emitterRate` 7→10 and `basinPrefill` 2.6→3.6 so deep fluid genuinely reaches
  and threatens the structures you build, sooner.
- **Kept intact:** the green→blue→purple depth fluid style, the map/terrain & elevations, the win
  (charge Beacon 100%) and lose (Core submerged) conditions, and the mouse-only build toolbar.
- Updated the how-to panel (health/damage/repair), refreshed `DESIGN.md`, added `snapshots/v0.2.png`,
  and extended the dev self-test (`.dev/shot.mjs`): structure-HP state dump + a damage/repair `hero`
  showcase.

## v0.1 — 2026-06-19
First playable build. Minimal but complete core loop.

- Single self-contained `index.html` (inline HTML/CSS/JS, vanilla + Canvas, no dependencies, runs over `file://`).
- 48×32 grid with 4 elevation levels from a readable 24×16 ASCII heightmap (Core plateau ↔ Emitter basin, with ridge chokepoints between).
- Mass-conserving cellular fluid: a permanent Emitter floods the basin (pre-flooded at start), spreads by surface height, pools in lows, and rises over high ground only when deep enough. Depth tracked per cell.
- Structures: **Core** (lose if submerged), **Extractor** (depth-scaled yield, at-risk + destroy thresholds), **Relay** (extends network reach), **Blaster** (auto-fires to suppress fluid, costs energy), **Barrier** (dam basins / block flow), **Beacon** (win objective — charge to 100%).
- Network connectivity via BFS from the Core with drawn connection lines; inactive structures shown distinctly.
- Energy economy: stored pool, income (Core + Extractors) vs. consumption (Blasters + Beacon), instant build costs, 50% sell refund.
- Win screen (Beacon charged) and lose screen (Core submerged), each with Restart.
- Mouse-only UI: build toolbar with costs, top-bar meters (energy / income / consumption / net / beacon charge), placement validity + reason hints, flashing at-risk warnings, hover link-range and would-connect previews.
- Pause and 1x/2x/3x fast-forward. Dismissible "How to play" panel on first load.
- Minimalist geometric dark visual style; fluid renders as a translucent glow whose opacity/hue track depth (green → blue → lethal purple).
- Added `snapshots/v0.1.png` and a dev-only Playwright self-test harness (`.dev/shot.mjs`) used to visually verify rendering and a full play sequence (harvest, blast, dam, charge Beacon, win/lose).
