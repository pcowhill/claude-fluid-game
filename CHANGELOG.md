# Changelog

All notable changes to **Harvest the Hazard**. One entry per released version.

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
