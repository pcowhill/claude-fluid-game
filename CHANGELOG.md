# Changelog

All notable changes to **Harvest the Hazard**. One entry per released version.

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
