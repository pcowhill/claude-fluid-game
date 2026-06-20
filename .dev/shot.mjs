// Visual self-test harness (DEV ONLY; not part of the game and not required to play).
// Requires a globally-installed Playwright + Chromium. Usage:
//   node .dev/shot.mjs <out.png> [scenario]
// Scenarios: howto | baseline | spread | play | hero | beacon | win
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); }
catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;

const __dir = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file://' + path.resolve(__dir, '..', 'index.html');
const out = process.argv[2] || '/tmp/shot.png';
const scenario = process.argv[3] || 'baseline';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 820 }, deviceScaleFactor: 1 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(200);

// Dismiss how-to for most scenarios
async function dismiss(){ await page.evaluate(() => document.getElementById('howto').classList.add('hidden')); }

// Helpers run in page context
async function run(fn, ...args){ return page.evaluate(fn, ...args); }

if (scenario === 'howto') {
  // leave the panel up
} else if (scenario === 'baseline') {
  await dismiss();
  await run(() => HTH.emitterFill(120)); // let fluid spread a bit
} else if (scenario === 'spread') {
  await dismiss();
  await run(() => HTH.emitterFill(400));
} else if (scenario === 'play') {
  await dismiss();
  await run(() => {
    HTH.setEnergy(99999);
    // relay chain from core toward basin
    HTH.place('relay', 11, 16);
    HTH.place('relay', 19, 16);
    HTH.place('relay', 27, 16);
    HTH.place('relay', 34, 16);
    HTH.place('relay', 39, 16);
    // extractors in the lowland / basin edge
    HTH.place('extractor', 30, 14);
    HTH.place('extractor', 33, 18);
    HTH.place('extractor', 37, 16);
    // blaster to protect the corridor
    HTH.place('blaster', 24, 16);
    // dam: barriers across a basin mouth
    for (let r=12;r<=20;r++) HTH.place('barrier', 36, r);
    HTH.emitterFill(500);
    HTH.step(150);
    HTH.setEnergy(800);
  });
} else if (scenario === 'beacon') {
  await dismiss();
  await run(() => {
    HTH.setEnergy(99999);
    HTH.place('relay', 11, 16);
    HTH.place('relay', 19, 16);
    HTH.place('relay', 27, 16);
    HTH.place('relay', 34, 16);
    HTH.place('relay', 39, 16);
    HTH.place('extractor', 33, 18);
    HTH.place('extractor', 37, 14);
    HTH.place('beacon', 43, 16);
    HTH.emitterFill(450);
    HTH.step(200);
    if (HTH.state) { /* charge will progress */ }
    HTH.setEnergy(5000);
    HTH.step(120);
  });
} else if (scenario === 'hero') {
  await dismiss();
  await run(() => {
    HTH.setEnergy(99999);
    // Backbone of relays from the Core toward the basin (routed along higher ground)
    HTH.place('relay', 10, 16); HTH.place('relay', 16, 13); HTH.place('relay', 22, 14);
    HTH.place('relay', 28, 14); HTH.place('relay', 34, 16); HTH.place('relay', 38, 16);
    // Harvesters across the lowland / basin edge (deeper = more, riskier)
    HTH.place('extractor', 31, 16); HTH.place('extractor', 35, 14); HTH.place('extractor', 35, 18);
    // A dam: levee sealing the basin mouth to grow a deep, lethal reservoir
    for (let r = 5; r <= 27; r++) HTH.place('barrier', 40, r);
    // Harvesters INSIDE the deep reservoir, hard against the Emitter (heavily flooded)
    HTH.place('extractor', 43, 14); HTH.place('extractor', 43, 18);
    // Blaster guarding the corridor
    HTH.place('blaster', 33, 20);
    // The objective, placed deep in the basin
    HTH.place('beacon', 44, 16);
    // Let the world settle into a believable mid-game with real flood pressure
    HTH.emitterFill(700);
    HTH.step(120);         // flood rises + structures in the reservoir accrue damage
    // Showcase the repair mechanic: pump a deep, damaged extractor
    HTH.repairAt(43, 14, true);
    HTH.setEnergy(720);
    HTH.setBeaconCharge(43);
    selectTool('repair');  // clean green hover highlight for the snapshot
  });
  // hover the repairing extractor to surface depth/risk/health in the shot;
  // brief live run lets pulses animate and the HUD reflect the repair draw
  await page.mouse.move(20 + 43.5 * 20, 86 + 14.5 * 20);
  await page.waitForTimeout(180);
} else if (scenario === 'win') {
  await dismiss();
  await run(() => {
    HTH.setEnergy(99999);
    HTH.place('relay', 11, 16); HTH.place('relay', 19, 16); HTH.place('relay', 27, 16);
    HTH.place('relay', 34, 16); HTH.place('relay', 39, 16);
    HTH.place('beacon', 43, 16);
    HTH.emitterFill(150);
    HTH.setBeaconCharge(95);   // near-win; supply line stays up long enough to finish
    HTH.setEnergy(99999);
    HTH.step(30);              // ~3s of powered charge -> crosses 100%
  });
  await page.waitForTimeout(100);
}

await page.waitForTimeout(250);
await page.screenshot({ path: out });
console.log('SCENARIO=' + scenario + ' OUT=' + out);
if (errors.length) { console.log('--- ERRORS ---'); errors.forEach(e => console.log(e)); }
else console.log('no console errors');

// quick state dump
const st = await run(() => {
  const s = HTH.state, d = HTH.depth(), cfg = HTH.CONFIG;
  let max=0, wet=0, sum=0;
  for (let i=0;i<d.length;i++){ if(d[i]>0){wet++; sum+=d[i]; if(d[i]>max)max=d[i];} }
  // depth right at the emitter and a couple sample lowland cells
  const C=cfg.cols;
  const at=(c,r)=>+d[r*C+c].toFixed(2);
  // structure-health summary (v0.2): lowest HP by type + how many are taking damage
  const ss = HTH.structs();
  const byType = {};
  let damaging = 0, repairing = 0;
  for (const x of ss) {
    if (x.hp == null) continue;
    if (!byType[x.t]) byType[x.t] = { n:0, minHp: Infinity };
    byType[x.t].n++; byType[x.t].minHp = Math.min(byType[x.t].minHp, +x.hp.toFixed(0));
    if ((x.dps||0) > 0) damaging++;
    if (x.rep) repairing++;
  }
  return { energy: Math.round(s.energy), income:+s.income.toFixed(1), cons:+s.cons.toFixed(1),
           over:s.over, time:+s.time.toFixed(0),
           maxDepth:+max.toFixed(2), wetCells:wet, totalFluid:+sum.toFixed(0),
           dEmitter:at(cfg.emitter.c,cfg.emitter.r), dMidLow:at(28,16), dNearCore:at(11,16),
           beaconCharge: HTH.beaconCharge(), hp: byType, damaging, repairing };
});
console.log('STATE=' + JSON.stringify(st));
await browser.close();
