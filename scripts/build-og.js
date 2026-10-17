// Renders the 1200x630 link-preview images in src/assets/og from real venue photos plus the Belle logo.
// Needs Playwright with Chromium: `npx -p playwright node scripts/build-og.js`, or NODE_PATH pointing at a global install.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(import.meta.dirname, "..");
const images = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/images.json"), "utf8"));
const logo = (n) => fs.readFileSync(path.join(ROOT, "src/assets/logos", `${n}.svg`), "utf8");
const file = (p) => "file://" + path.join(ROOT, p);

const CARDS = [
  { name: "home", photo: "duchess-exterior", kicker: "Belle Pubs & Restaurants", title: "Five London sports pubs.<br>Forty rooms upstairs.", pos: "50% 40%" },
  { name: "sport", photo: "griffin-screens", kicker: "What's on at the Belle", title: "Every big game,<br>sound on.", pos: "50% 50%" },
  { name: "stay", photo: "room-griffin-king", kicker: "Stay at the Belle", title: "Come as a guest.<br>Leave as family.", pos: "50% 55%" },
  { name: "christmas", photo: "duchess-upstairs", kicker: "Christmas 2026", title: "Parties from £33 a head", pos: "50% 50%" },
  { name: "hire", photo: "duchess-terrace", kicker: "Parties & private hire", title: "Your do. Our place.", pos: "60% 50%" },
  { name: "menus", photo: "food-spread", kicker: "Eat & drink", title: "Twenty Belle Burgers<br>& a proper Sunday roast", pos: "50% 50%" },
  { name: "moretown", photo: "moretown-pano", venue: "moretown", title: "31 screens by St Katharine Docks", pos: "50% 50%" },
  { name: "duchess", photo: "duchess-exterior", venue: "duchess", title: "Flowers, two gardens & the Power Station view", pos: "50% 35%" },
  { name: "fitzrovia", photo: "fitzrovia-exterior", venue: "fitzrovia", title: "A pub & five rooms on Tottenham Court Road", pos: "50% 45%" },
  { name: "griffin", photo: "griffin-exterior", venue: "griffin", title: "Award-winning sport & 14 rooms in Vauxhall", pos: "50% 40%" },
  { name: "hammersmith", photo: "hammersmith-night", venue: "hammersmith", title: "The Enchanted Garden on King Street", pos: "50% 62%" },
  { name: "jobs", photo: "rose-wall", kicker: "Work with us", title: "Pull pints. Make people's day.", pos: "50% 50%" },
  { name: "contact", photo: "duchess-flowers", kicker: "Belle Pubs & Restaurants", title: "Five pubs, one hello", pos: "50% 50%" },
];

const biggest = (n) => images[n][0].w;
const html = (c) => `<!doctype html><html><head><style>
@font-face { font-family: Alegreya; src: url(${file("src/assets/fonts/alegreya-normal.woff2")}); font-weight: 400 900; }
@font-face { font-family: Oswald; src: url(${file("src/assets/fonts/oswald-normal.woff2")}); font-weight: 400 700; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; position: relative; overflow: hidden; background: #14100f; font-family: Alegreya; }
.bg { position: absolute; inset: 0; background: url(${file(`src/assets/img/${c.photo}-${biggest(c.photo)}.webp`)}) ${c.pos} / cover; }
.shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(20,16,15,.88) 0%, rgba(20,16,15,.6) 46%, rgba(20,16,15,.05) 80%), linear-gradient(0deg, rgba(20,16,15,.55), transparent 45%); }
.roses { position: absolute; right: -40px; top: -46px; width: 330px; transform: scaleX(-1); }
.group { position: absolute; left: 56px; top: 44px; width: 240px; color: #fff; }
.group svg, .venue svg { width: 100%; height: auto; display: block; }
.copy { position: absolute; left: 56px; bottom: 74px; width: 700px; color: #fff; }
.kicker { font-family: Oswald; text-transform: uppercase; letter-spacing: .16em; font-size: 22px; color: #9dcbe4; margin-bottom: 14px; }
.venue { width: ${c.venue === "moretown" ? 520 : 600}px; color: #fff; margin-bottom: 18px; filter: drop-shadow(0 2px 12px rgba(0,0,0,.5)); }
h1 { font-weight: 800; font-size: ${c.venue ? 44 : 66}px; line-height: 1.04; text-shadow: 0 2px 14px rgba(0,0,0,.4); }
.chequer { position: absolute; left: 0; right: 0; bottom: 0; height: 22px; background: repeating-conic-gradient(#1a1411 0 25%, #fff 0 50%) 0 0 / 22px 22px; }
.bar { position: absolute; left: 0; right: 0; bottom: 22px; height: 6px; background: #d22d4e; }
</style></head><body>
<div class="bg"></div><div class="shade"></div>
<img class="roses" src="${file("src/assets/img/menu-roses-600.webp")}">
<div class="group">${logo("group")}</div>
<div class="copy">${c.venue ? `<div class="venue">${logo(c.venue)}</div>` : `<p class="kicker">${c.kicker}</p>`}<h1>${c.title}</h1></div>
<div class="bar"></div><div class="chequer"></div>
</body></html>`;

const out = path.join(ROOT, "src/assets/og");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of CARDS) {
  const tmp = path.join(out, `_${c.name}.html`);
  fs.writeFileSync(tmp, html(c));
  await page.goto("file://" + tmp, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, `${c.name}.jpg`), type: "jpeg", quality: 84 });
  fs.unlinkSync(tmp);
  console.log("og", c.name);
}
await browser.close();
