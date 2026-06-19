# Harvest the Hazard — Design

> Living design doc. Kept current with each version. Implementation lives entirely in `index.html`.

## The hook
It's like Creeper World, BUT the spreading fluid is your enemy AND your only fuel. You don't want
to wipe it out — you want to manage a controlled flood: harvest rich, dangerous pools for energy
while keeping the fluid off your base and network. You win by planting and charging a Beacon in the
most lucrative, most lethal spot on the map.

## Hard technical constraints
- A SINGLE self-contained `index.html`: all HTML, CSS, and JS inline.
- Vanilla JavaScript + Canvas API only. No frameworks, no build step, no npm, no dependencies, no
  external image/audio assets.
- Must run by cloning and opening `index.html` directly in a browser (plain inline `<script>`, not
  an ES module, so it works over `file://`).
- All tunable gameplay numbers live in one `CONFIG` object at the top of the script.

## Map & terrain
- Grid map, **48×32** cells (20px each → 960×640 board).
- **4 discrete elevation levels** (0 = basin, 3 = plateau). Layout is a readable data structure:
  a **24×16 ASCII heightmap** (`MAP24`, one char per cell, `0`–`3`) that is upscaled ×2.
- Layout: player's **Core Base** on a high plateau on the left; the **Emitter** in a low basin on
  the right (richest/deadliest area, where the Beacon must eventually go); mixed terrain with two
  vertical `2`-height **ridges** punched with gaps to form **chokepoints** between them.

## The fluid
- The Emitter continuously spawns fluid per tick into its cell (permanent pressure source; never
  destroyed).
- Each tick fluid spreads via cellular flow to orthogonal neighbours of lower **surface height**
  (`surface = elevation·levelHeight + depth`), equalizing and rising; it pools in low areas. Depth
  is tracked per cell as a float.
- High ground stays dry until fluid depth overcomes the height difference, so elevation matters.
- The flow is a mass-conserving Jacobi step (read old depths → write a delta buffer → apply), so it
  is order-independent and stable. Fluid is **not** culled at the front (only a denormal guard);
  a render-only threshold hides invisibly-shallow film. The basin is **pre-flooded** at start so the
  hazard is immediately deep and dangerous and begins spilling toward the player right away.

## Structures
- **Core Base** — network root; stores energy; small passive income. **LOSE if it becomes submerged.**
- **Extractor** *(centerpiece)* — harvests fluid into energy, yield ∝ fluid **depth** at its cell
  (dry land = zero). At/above `riskDepth` it enters a flashing **at-risk/flooding** state; at/above
  `destroyDepth` it is **destroyed**. Must be connected. *Harvesting does not drain the pool* — the
  Emitter out-pressures any single Extractor, so depth keeps rising and the risk dial stays live.
- **Relay** — produces nothing; long link range to extend the network to distant ground. Connected.
- **Blaster** — when connected, auto-fires at the deepest (tiebreak nearest) fluid in range,
  lowering its depth and consuming energy per shot; stops firing if stored energy is depleted.
- **Barrier/Levee** — cheap; blocks fluid flow at its cell (acts like an infinite wall). Used to dam
  basins into deep reservoirs and protect corridors. Permanent until removed.
- **Beacon** — the win objective. Built in the basin (lowest elevation). Draws a steady amount of
  energy to charge; charges only while that draw is met, pauses otherwise. **100% charge = WIN.** Not
  destroyed by fluid; but you must defend its supply line and keep it powered.

## Network & energy
- Global stored-energy pool + per-second income from Extractors (scaled by depth) and the Core,
  minus consumption (Blasters firing, Beacon charging). Build costs deducted instantly.
- A structure is active only if **connected**: within link range of the Core or another connected
  structure (BFS from Core; two nodes link if distance ≤ max of their two link ranges, so Relays
  act as the long-reach backbone). Connection lines are drawn; inactive structures are dimmed with a
  dashed red outline.

## Win / lose
- **WIN:** charge the Beacon to 100%.
- **LOSE:** the Core Base becomes submerged (`depth ≥ coreSubmergeDepth` on its cell).
- Win and lose screens, each with a Restart button.

## Controls & UI (mouse only)
- Build toolbar to select a structure; click a valid cell to place; auto-connect if in range.
- Right-click (or the Sell/Delete tool) removes a structure for a partial refund.
- Top bar: stored-energy meter, income vs. consumption, net/s, and the selected structure's cost.
- Beacon charge meter appears once the Beacon is placed. Flashing `!` warnings on flooding Extractors.
  Invalid placements show a red cell outline and a reason hint.
- Pause button and a fast-forward toggle (1x / 2x / 3x); default 1x.
- A dismissible "How to play" panel on first load explaining the core twist.

## Visual style
- Minimalist vector/geometric on a dark background. Flat distinct colors per elevation with subtle
  cliff shading. Fluid is a translucent glowing overlay whose opacity/hue track **depth**: toxic
  green (shallow) → blue → lethal purple (deep). Bright friendly shapes for structures, thin cyan
  lines for the network. No external assets.

---

## Implementation notes & decisions (v0.1)
These are reasonable calls made during the one-shot build where the spec left room:

- **Repo:** built into the existing `claude-fluid-game` repo (the brief suggested a new
  `harvest-the-hazard` repo, but a repo was already provisioned for this work).
- **Branch:** committed/tagged on the working branch `claude/trusting-ritchie-opo4ta` rather than
  `main`, per the session's branch policy.
- **Terrain authoring:** a 24×16 ASCII map upscaled ×2 to 48×32. This keeps the source small and
  genuinely editable (the upscale makes terrain pleasantly blocky/geometric); a length assertion
  guards against typos.
- **Fluid is mass-conserving** (no front culling) so a permanent source produces a genuinely rising
  flood; visibility is a render-only threshold. The basin is **pre-flooded** at start for an
  immediately tense board.
- **Extraction does not lower depth.** This is deliberate: it keeps the risk/reward dial live (you
  can't passively make your own Extractors safe — you must Blast/dam/relocate). Depth is controlled
  by Blasters and Barriers.
- **Beacon placement** requires a basin (elevation-0) cell, which is the "in/adjacent to the Emitter
  basin" requirement made concrete.
- **Connectivity rule:** link if distance ≤ max(rangeA, rangeB). Makes Relays the long-reach
  backbone while keeping Extractors/Blasters short-range.
- **UI chrome** (top bar, toolbar, overlays) is HTML/CSS; the game world is drawn on Canvas.
- A small `window.HTH` automation hook is exposed for the visual self-test harness (`.dev/shot.mjs`).
  It's harmless and aids the iterative playtest loop.

## Tuning quick-reference (current `CONFIG`)
| Knob | Value | Notes |
|------|-------|-------|
| grid | 48×32 @ 20px | board 960×640 |
| levelHeight | 1.6 | depth needed to climb one elevation step |
| emitterRate | 7.0 /s | flood pressure / escalation speed |
| basinPrefill | 2.6 | starting basin depth (instant hazard) |
| flowRate | 0.25 | per-tick share of surface diff (≤0.25 = stable) |
| extractorYield | 2.3 /depth/s | cap 34/s |
| riskDepth / destroyDepth | 4.5 / 7.5 | natural basin equilibrium ≈ 4.2; damming → ≈ 6+ |
| coreSubmergeDepth | 0.8 | lose threshold on the Core cell |
| blaster | range 5, 0.85 depth/shot, 4/s, 1.1 e/shot | |
| beacon | draw 9/s, charge 3.5%/s | ≈ 29s of uptime to win |
| costs | extractor 55 / relay 25 / blaster 80 / barrier 10 / beacon 300 | refund 50% |
| startEnergy | 260 | |

## Backlog / ideas for future versions
- Sound (WebAudio synth, no assets) for shots/flooding/win.
- Multiple Emitters / maps; a map-select or seed.
- Upgrades (Extractor capacity, Blaster range), tougher fluid variants.
- Smarter blaster targeting modes; Beacon under explicit threat events.
- Save/restore; richer particle/flow visuals; minimap.
