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
Every damageable structure has **HP** and takes **gradual, depth-scaled fluid damage** when the fluid
on its own cell is deep enough (see *Fluid damage & repair*). All of them show a **health bar**, so
accumulating damage is obvious well before destruction.

- **Core Base** — network root; stores energy; small passive income. No HP / not damaged by fluid —
  but **LOSE if it becomes submerged** (`coreSubmergeDepth` on its cell). Sits safe on a plateau.
- **Extractor** *(centerpiece)* — harvests fluid into energy, yield ∝ fluid **depth** at its cell
  (dry land = zero); the live yield floats as a number on the map. **Toughest** structure (highest HP,
  deepest damage threshold) — but deep enough fluid still kills it. Must be connected. *Harvesting
  does not drain the pool* — the Emitter out-pressures any single Extractor, so depth keeps rising and
  the risk dial stays live.
- **Relay** — produces nothing; long link range to extend the network to distant ground. **Fragile**
  (lowest HP, lowest damage threshold) — route it over dry/high ground. Connected.
- **Blaster** — when connected, auto-fires at the deepest (tiebreak nearest) fluid in range, lowering
  its depth and consuming energy per shot; stops firing if stored energy is depleted. Middle toughness,
  and can self-protect by suppressing nearby depth.
- **Miner** *(v0.4)* — harvests **metal** (the second resource) when built **on or adjacent to a metal
  deposit** and connected to the network; the live metal yield floats as a steel number on the map.
  Flood-damageable like an Extractor (HP + health bar), and obeys the build-time system. Costs energy.
- **Barrier/Levee** — blocks fluid flow at its cell (an infinite wall; its own cell is forced dry).
  Used to dam basins into deep reservoirs and protect corridors. *(v0.4)* It now **costs metal**, has
  **HP + a health bar**, and is **eroded by the pressure it dams** — the bigger the surface-height
  differential across it, the faster it wears down; at **0 HP it bursts** (removed; fluid floods
  through). Repair it (maintenance pump, costs metal) to hold it. See *Metal economy & barrier erosion*.
- **Beacon** — the win objective. Built in the basin (lowest elevation). **Immune to fluid** (no HP
  bar). Draws a steady amount of energy to charge; charges only while that draw is met, pauses
  otherwise. **100% charge = WIN.** You must defend its supply line and keep it powered.

## Fluid damage & repair (v0.2)
- **Damage:** each tick, a damageable structure whose own-cell depth exceeds `damage.startDepth[type]`
  loses HP at `damage.rate[type] × (depth − startDepth)` per second — the deeper the fluid, the faster
  it dies. At 0 HP it is destroyed and removed (network recomputes). Tolerance ranking
  **Extractor > Blaster > Relay**. The Beacon is exempt; the Core keeps its own instant-submerge loss.
- **Health bars + at-risk flash:** every damageable structure draws a compact health bar
  (green → amber → red); one actively losing HP also flashes a red outline + `!`.
- **Repair:** the **Repair** tool toggles a "repair pump" on a damaged structure. While running it
  restores `repair.rate` HP/s for `repair.costPerHp` energy per HP, auto-stopping at full HP (or when
  energy runs out). A structure can be damaged and repaired at once — repair wins at shallow/moderate
  depth, the flood wins if it's too deep. A green ring marks a running pump.

## Construction (v0.3)
Structures are **not** built instantly. Placing one drops a **blueprint** that constructs over
`buildTime[type]` seconds (scales with cost — a Barrier is quick, a Beacon slow). This is the main
anti-rush mechanic.
- **Network gating / serialization.** A network blueprint only *advances* while it is within link
  range of an already-**completed**, connected structure (the Core counts as completed). While
  building it is **inactive** — it produces/blasts/charges nothing **and does not relay the network
  onward**. So a line of relays serializes: relay #1 (next to the Core) builds first; only when it
  *finishes* does relay #2 become network-connected and start, then #3… You may pre-place a whole
  line (paying up front) and it fills in segment-by-segment as the network reaches each one.
- **Parallel on the network.** Every blueprint that *does* have a completed, connected neighbour
  builds simultaneously — only true dependency chains serialize.
- **Barriers** are off-network walls: they build on their own timer (no network needed) and only
  start **blocking fluid** once complete (a building barrier is just a marked-out, passable site).
- **Beacon** builds like everything else and only begins charging once complete. **Core** is pre-built.
- **Readout:** a radial progress ring over a dim "ghost" of the structure — cyan with a live `%`
  while building, grey `wait` while still waiting for the network to arrive.
- **Cost/refund:** the build cost is charged when the blueprint is placed; selling/cancelling a
  blueprint (even mid-build) returns the normal partial refund.

## Metal economy & barrier erosion (v0.4)
A second resource, **metal**, turns walling from a cheap one-time spam-win into a defended, ongoing
investment.
- **Deposits.** A small number of renewable **metal deposits** (steel-hexagon markers) overlaid on the
  *existing* map — they mark existing cells and do **not** change terrain elevations or layout. Placed
  in the contested mid-ground so you must extend the network to them and keep that line alive.
- **Miner.** Built on or adjacent (8-neighbourhood) to a deposit and connected, a Miner pulls
  `metalYield`/s into the global metal pool. It's flood-damageable like an Extractor and obeys the
  build-time system. Miners cost **energy** — the bootstrap loop is energy → Miners → metal → walls.
- **Barriers cost metal**, both to build (`cost.barrier`, in metal) and to repair (`barrier.repairCostPerHp`,
  in metal). Build/affordability/refund all route to the metal pool for barriers (see `costType()`).
- **Erosion.** Each tick a built barrier loses HP at `barrier.erosionRate × (differential − erodeStart)`,
  where the **differential** is the spread between the highest and lowest non-wall neighbour *surface
  heights* (`elev·levelHeight + depth`). Deep reservoir on one side + lower/dry on the other ⇒ large
  differential ⇒ fast erosion; equal depth both sides ⇒ ~0. At 0 HP the barrier **bursts** (removed,
  `isWall` cleared, fluid flows through next tick).
- **Repair = maintenance pump.** A barrier's repair pump **stays armed** (until toggled off) and
  continuously tops the wall up against erosion, spending metal; it can be pre-armed at full HP. Holding
  a deep dam therefore costs a steady metal/s — wall *strategically* and keep Miners alive to fund it.
- **HUD:** a metal counter + net metal/s mirrors the energy stat; the at-risk "!" flash is driven by
  **net** HP loss, so a fully-maintained eroding wall doesn't false-alarm.

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
- Build toolbar to select a structure; click a valid cell to place a **blueprint** (it then builds
  over time — see *Construction*); auto-connect if in range.
- **Repair tool** — click a damaged structure to toggle its repair pump (heals over time, costs energy).
- Right-click (or the Sell/Delete tool) removes a structure for a partial refund.
- **Hover readout** — a tooltip follows the cursor showing the exact **fluid depth**, the **risk level**
  (Dry → Shallow → Deep → Hazardous → Lethal), and, over a structure, its type / HP% / yield.
- **On-map readouts** — a health bar on every damageable structure and a floating energy-yield number
  on each producing Extractor.
- Top bar: stored-energy meter, income vs. consumption, net/s, and the selected structure's cost.
- Beacon charge meter appears once the Beacon is placed. Flashing `!` warnings on structures taking
  damage. Invalid placements show a red cell outline and a reason hint.
- Pause button and a fast-forward toggle (1x / 2x / 3x); default 1x.
- A dismissible "How to play" panel on first load explaining the core twist.

## Visual style
- Minimalist vector/geometric on a dark background. Flat distinct colors per elevation with subtle
  cliff shading. Fluid is a translucent glowing overlay whose opacity/hue track **depth**: toxic
  green (shallow) → blue → lethal purple (deep). Bright friendly shapes for structures, thin cyan
  lines for the network. No external assets.
- **Live-state readability (v0.2)** is layered *on top* of the unchanged fluid style: per-structure
  health bars, floating Extractor yield numbers, the cursor depth/risk readout, and the at-risk-flash /
  repair-ring markers. The green→blue→purple fluid overlay itself is untouched.

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

## Implementation notes & decisions (v0.2)
Focus of the version: make live state read at a glance, anchored by a real damage/repair system.

- **Gradual damage replaces the old instant cutoff.** v0.1 had a single Extractor-only `destroyDepth`
  (≈7.5) that the open basin rarely reached, so structures felt risk-free. v0.2 removes
  `riskDepth`/`destroyDepth` and damages **all** damageable structures continuously, scaled by how far
  the local depth exceeds a per-type threshold. Extractors are the toughest, Relays the most fragile.
- **What is/isn't damageable.** Damageable = Extractor / Relay / Blaster (have HP + bars). The Beacon
  is immune (no bar). The Core keeps its instant-submerge loss. Barriers are walls whose own cell is
  forced dry, so they can never take fluid damage — intentionally no HP bar.
- **Repair is a player-toggled pump, not auto-heal.** It spends from the global energy pool over time
  (rate + cost knobs) and is allowed even on disconnected structures (you're bailing water); it can run
  while the cell is still flooded, which is the core tension. Added as a toolbar tool beside Sell/Delete
  to respect "don't change the control scheme/toolbar paradigm" (mouse-only, click-a-cell).
- **Readability is additive.** Health bars, floating Extractor yields, the at-risk flash, the repair
  ring, and the cursor depth/risk tooltip are all drawn on top; the green→blue→purple fluid overlay,
  the terrain/elevations, and the win/lose conditions are untouched per the brief.
- **Flood escalation.** Bumped `emitterRate` 7→10 and `basinPrefill` 2.6→3.6 (kept `flowRate` at the
  0.25 stability cap) so the basin climbs past the Extractor threshold during normal play and reaches
  the structures players actually build. The Core remains hard to submerge by design (plateau backstop).
- **Damage `s.yield`/`s.dps`/`s.hp` fields** are exposed via `window.HTH.structs()` for the self-test
  state dump; the harness `hero` scenario now showcases a mid-repair, deeply-flooded reservoir.

## Implementation notes & decisions (v0.3)
Focus of the version: kill the ~10-second rush-win and make it a deliberate, multi-minute MEDIUM game.

- **Timed construction is the real fix.** Even with infinite energy, a naive relay-line-to-the-basin
  can no longer rush a win: the chain serializes (each relay must finish before the next can start),
  and a bare line shoved through the deep basin gets eroded before it ever reaches a Beacon — you have
  to *defend* the push (dam/blast/repair). The economy nerf is secondary: it just makes the opening
  deliberate instead of an instant full board.
- **Blueprints are real structure objects** (`building/buildProgress/buildTime/buildConnected`) excluded
  from the network BFS, so they don't relay or activate until complete — that exclusion is exactly what
  serializes a chain. Construction is advanced in `stepConstruction(dt)` inside `simStep`; finishing any
  blueprint re-runs `recomputeNetwork()` so the next link can start the same tick.
- **Barriers build off-network.** Requiring a network connection to build a wall would break damming a
  far-off basin, so barriers build on their own short timer and only set `isWall`/force-dry their cell
  on completion (until then fluid flows through the site).
- **Blueprints don't take fluid damage** (skipped in the damage pass) — a site under construction can't
  be eroded before it exists; HP starts full on completion. They also show no HP bar/yield/at-risk flash,
  just the build ring.
- **Economy snowball is a known lever.** Once several Extractors are up, the ever-rising flood pushes
  their depth-scaled yield toward the cap and cheap repair keeps deep ones alive, so late-game income
  outpaces the Beacon's draw. That's acceptable for v0.3 (the skill is the opening + the Beacon hookup);
  v0.4's scarce **metal** upkeep (barrier erosion costs metal to repair) adds a parallel cost that
  doesn't snowball the same way. Repair-cost rebalancing remains a future target.

## Implementation notes & decisions (v0.4)
Focus of the version: stop the "spam cheap Barriers to wall the fluid off" cheese, via two combined
mechanics — barrier erosion and a scarce second resource (metal).

- **`HAS_HEALTH` vs `DAMAGEABLE`.** Barriers now have HP/health-bars/repair (`HAS_HEALTH`) but are
  **not** in `DAMAGEABLE` (the own-cell-depth damage set) — their cell is forced dry, so they'd never
  take depth damage. Erosion is a separate pass driven by `barrierDifferential()`. `maxHpOf()` and
  `costType()` keep the barrier's different HP source and metal cost out of the type-keyed tables.
- **Differential = neighbour surface spread.** Using `max−min` of non-wall neighbour surfaces (not the
  wall's own floor) gives exactly the spec's "surface-height differential across the barrier": a deep
  reservoir vs a dry/low side erodes fast; equal water both sides nets ~0 (a submerged levee with no
  net pressure doesn't pointlessly erode).
- **Maintenance pump.** Barrier repair intentionally does **not** auto-stop at full HP (flood-structure
  repair still does). A deep dam erodes continuously, so a one-shot heal would be useless; the pump
  stays armed and pays metal/s to hold the wall. This is the knob that makes walling an *ongoing* cost.
- **Net-loss flash.** The at-risk "!" now keys off net HP change this step (`s.losing`), not gross
  erosion, so a maintained wall (eroding but fully repaired) reads as safe while an unfunded one flashes.
- **Miners cost energy, barriers cost metal.** This makes a deliberate bootstrap chain (energy →
  Miners → metal → walls) and keeps the two economies coupled but distinct. Miner placement is gated to
  on/adjacent-to-a-deposit so you can't make a useless one by accident.
- **Deposits are an overlay**, never a terrain edit (a separate `deposit` typed array; elevations
  untouched per the hard constraint). Three of them, in the contested middle, so reaching/holding them
  is a real decision.
- **Balance intent.** Numbers are tuned so a small dam against a modest pool is cheap to hold (≈1–2
  metal/s) while walling the whole deep basin is self-defeating (tens of metal/s ⇒ many Miners). The
  energy economy is unchanged from v0.3, so v0.3's pacing/winnability carries over; metal is an added
  layer for the damming game. Erosion-vs-repair and deposit placement are the most likely future tweaks.

## Tuning quick-reference (current `CONFIG`)
| Knob | Value | Notes |
|------|-------|-------|
| grid | 48×32 @ 20px | board 960×640 |
| levelHeight | 1.6 | depth needed to climb one elevation step |
| emitterRate | 10.0 /s | flood pressure / escalation speed (v0.2: ↑ from 7.0) |
| basinPrefill | 3.6 | starting basin depth / instant hazard (v0.2: ↑ from 2.6) |
| flowRate | 0.25 | per-tick share of surface diff (≤0.25 = stable) |
| extractorYield | 1.8 /depth/s | v0.3: ↓ from 2.3; cap 24/s (↓ from 34); white on-map yield |
| buildTime | barrier 2 / relay 5 / extractor 6 / blaster 8 / beacon 28 (s) | v0.3 timed construction; miner 6 (v0.4) |
| damage HP | extractor 120 / blaster 80 / relay 55 | max HP per type (toughness order) |
| damage startDepth | extractor 5.0 / blaster 3.0 / relay 2.4 | depth where HP loss begins |
| damage rate | extractor 3.2 / blaster 4.5 / relay 6.0 | HP/s lost per unit depth past start; lethalDepth 8.0 (readout label) |
| repair | 28 HP/s, 0.7 energy/HP | repair-pump heal rate + cost (flood structures) |
| metal | start 30 · yield 3/s/miner · 3 deposits | v0.4 second resource (deposits at 22,8 / 22,24 / 33,16) |
| barrier | hp 70 · erodeStart 1.0 · erosionRate 2.2 · repair 18 HP/s @ 0.4 metal/HP | v0.4: HP + pressure erosion + metal upkeep |
| miner | hp 100 · startDepth 4.5 · rate 3.5 | v0.4 metal harvester (flood-damageable like Extractor) |
| coreSubmergeDepth | 0.8 | lose threshold on the Core cell (unchanged) |
| blaster | range 5, 0.85 depth/shot, 4/s, 1.1 e/shot | |
| beacon | draw 9/s, charge 3.5%/s | ≈ 29s of uptime to win |
| costs | extractor 55 / relay 25 / blaster 80 / beacon 300 / miner 50 (energy) · barrier 15 (METAL) | refund 50% in-kind |
| startEnergy | 200 | v0.3: ↓ from 260 (deliberate opening) |
| coreIncome | 1.0 /s | v0.3: ↓ from 1.5 |

## Backlog / ideas for future versions
- Sound (WebAudio synth, no assets) for shots/flooding/win.
- Multiple Emitters / maps; a map-select or seed.
- Upgrades (Extractor capacity, Blaster range), tougher fluid variants.
- Smarter blaster targeting modes; Beacon under explicit threat events.
- Save/restore; richer particle/flow visuals; minimap.
