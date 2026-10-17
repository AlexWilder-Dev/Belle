// Builds the fixtures board from the real fixture lists in ./fixtures/*.json.
// Which Belles show each game, and where the sound is on, is SAMPLE logic: a plausible
// screen plan based on each pub's screens, sound zones, opening hours and crowd.
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("src/_data/fixtures");
const venues = JSON.parse(fs.readFileSync("src/_data/venues.json", "utf8"));

const LONDON = ["Arsenal", "Chelsea", "Tottenham Hotspur", "Crystal Palace", "Fulham", "Brentford", "West Ham United", "Harlequins", "Saracens"];
const BIG = ["Arsenal", "Chelsea", "Tottenham Hotspur", "Liverpool", "Manchester United", "Manchester City", "Newcastle United"];
const SPORTS = {
  football: "Football", rugby: "Rugby", nfl: "NFL", f1: "F1", darts: "Darts",
  boxing: "Boxing", ufc: "UFC", tennis: "Tennis", cricket: "Cricket", golf: "Golf",
};
// How long each sport keeps the screens busy, in minutes, for opening-hours checks.
const LENGTH = { football: 115, rugby: 110, nfl: 200, f1: 120, darts: 240, boxing: 60, ufc: 120, tennis: 150, cricket: 240, golf: 240 };

const mins = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const closeMins = (hhmm) => { const m = mins(hhmm); return m < 6 * 60 ? m + 24 * 60 : m; };
const weekday = (iso) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
const has = (f, names) => names.some((n) => [f.home, f.away].some((t) => t && t.includes(n)));
const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function isHeadline(f) {
  if (f.headline !== undefined) return f.headline;
  if (f.sport === "football") {
    if (has(f, ["England"]) && !f.competition.includes("Women")) return true;
    if (f.competition === "Premier League") return has(f, LONDON) || (has(f, BIG) && [f.home, f.away].every((t) => BIG.includes(t)));
    if (f.competition.includes("Champions League")) return has(f, ["Arsenal", "Chelsea", "Tottenham Hotspur"]);
    return false;
  }
  if (f.sport === "rugby") return has(f, ["England"]); // Red Roses included: Belle partners with England's Rosie Galligan
  if (f.sport === "nfl") return /london|international/i.test(`${f.competition} ${f.venue || ""}`);
  return ["f1", "boxing"].includes(f.sport) || /final/i.test(f.home || "");
}

// Which Belles are in the plan before opening hours are checked.
function candidates(f, headline) {
  const all = venues.map((v) => v.slug);
  switch (f.sport) {
    case "football":
      if (/Women/.test(f.competition)) return ["moretown", "hammersmith", "duchess"];
      if (/EFL|Carabao/.test(f.competition)) return headline || has(f, LONDON) ? ["moretown", "griffin", "fitzrovia", "hammersmith"] : ["moretown", "griffin"];
      if (/Nations League/.test(f.competition) && !has(f, ["England"])) return ["moretown", "fitzrovia", "griffin"];
      return all;
    case "rugby":
      if (/Prem/i.test(f.competition)) return ["hammersmith", "duchess", "griffin", "moretown"];
      return all;
    case "nfl": return ["moretown", "duchess", "griffin"];
    case "darts": return ["hammersmith", "moretown", "griffin"];
    case "boxing": case "ufc": return ["griffin", "fitzrovia", "duchess", "hammersmith", "moretown"];
    case "f1": return all;
    default: return ["moretown", "griffin", "fitzrovia"];
  }
}

function openFor(v, f) {
  if (!f.time) return true;
  const [open, close] = v.hours[weekday(f.date)];
  const start = mins(f.time);
  return start >= mins(open) && start + Math.min(LENGTH[f.sport] || 120, 120) <= closeMins(close);
}

function load() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((n) => n.endsWith(".json"))
    .flatMap((n) => JSON.parse(fs.readFileSync(path.join(DIR, n), "utf8")));
}

export default function () {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const items = load()
    .filter((f) => f.date >= today && SPORTS[f.sport])
    .map((f) => {
      const headline = isHeadline(f);
      const showing = candidates(f, headline)
        .map((slug) => venues.find((v) => v.slug === slug))
        .filter((v) => openFor(v, f))
        .map((v) => {
          const zones = headline ? v.soundZones : 1;
          return { venue: v.slug, name: v.name, area: v.areaShort, zones, of: v.soundZones,
            sound: zones === v.soundZones ? `Sound on in all ${v.soundZones} zones` : `Sound on in 1 of ${v.soundZones} zones` };
        });
      const title = f.away ? `${f.home} v ${f.away}` : f.home;
      return {
        ...f,
        id: slugify(`${f.date}-${title}`),
        title,
        sportLabel: SPORTS[f.sport],
        headline,
        showing,
        sortKey: `${f.date}T${f.time || "23:59"}`,
      };
    })
    .filter((f) => f.showing.length)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const days = [];
  for (const f of items) {
    let d = days.find((x) => x.date === f.date);
    if (!d) days.push((d = { date: f.date, items: [] }));
    d.items.push(f);
  }
  const sports = Object.entries(SPORTS)
    .filter(([key]) => items.some((f) => f.sport === key))
    .map(([key, label]) => ({ key, label, count: items.filter((f) => f.sport === key).length }));

  return { items, days, sports, today, headlines: items.filter((f) => f.headline) };
}
