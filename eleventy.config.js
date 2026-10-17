import fs from "node:fs";
import path from "node:path";

const PREFIX = process.env.PATH_PREFIX || "/belle-pubs/";
const images = JSON.parse(fs.readFileSync("src/_data/images.json", "utf8"));
const logoCache = {};

// "/sport/" -> "/belle-pubs/sport/". Leaves absolute and anchor links alone.
const withPrefix = (href = "") => {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(href)) return href;
  return PREFIX + String(href).replace(/^\//, "");
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parseDay = (iso) => new Date(`${iso}T12:00:00Z`);

export default function (config) {
  config.addPassthroughCopy({ "src/assets": "assets" });
  config.addWatchTarget("src/assets/css/");
  config.addWatchTarget("src/assets/js/");

  config.addFilter("u", withPrefix);
  config.addFilter("abs", (href, site) => site.origin + withPrefix(href));
  config.addFilter("json", (v) => JSON.stringify(v));
  config.addFilter("venue", (venues, slug) => venues.find((v) => v.slug === slug));
  config.addFilter("dayShort", (iso) => { const d = parseDay(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; });
  config.addFilter("dayLong", (iso) => { const d = parseDay(iso); return `${DAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; });
  config.addFilter("clock", (hhmm) => {
    if (!hhmm) return "TBC";
    const [h, m] = hhmm.split(":").map(Number);
    if (h === 0 && m === 0) return "midnight";
    if (h === 12 && m === 0) return "noon";
    const hr = ((h + 11) % 12) + 1;
    return `${hr}${m ? "." + String(m).padStart(2, "0") : ""}${h < 12 || h === 24 ? "am" : "pm"}`;
  });
  config.addFilter("roomsTotal", (venues) => venues.reduce((n, v) => n + (v.rooms ? v.rooms.count : 0), 0));
  config.addFilter("withRooms", (venues) => venues.filter((v) => v.rooms));
  config.addFilter("forVenue", (items, slug) => items.filter((f) => f.showing.some((s) => s.venue === slug)));
  config.addFilter("ucfirst", (s = "") => s.charAt(0).toUpperCase() + s.slice(1));
  config.addFilter("limit", (arr, n) => (arr || []).slice(0, n));
  config.addFilter("where", (arr, key, val) => (arr || []).filter((x) => x[key] === val));
  config.addFilter("includesVenue", (arr, slug) => (arr || []).filter((x) => !x.venues || x.venues.includes(slug)));

  // Responsive <img> from the generated sizes in src/_data/images.json.
  config.addShortcode("img", (name, alt = "", sizes = "100vw", cls = "", eager = false) => {
    const set = images[name];
    if (!set) throw new Error(`Unknown image: ${name}`);
    const largest = set[0];
    const fallback = set.find((s) => s.w <= 960) || largest;
    const srcset = set.map((s) => `${withPrefix(`/assets/img/${name}-${s.w}.webp`)} ${s.w}w`).join(", ");
    return `<img src="${withPrefix(`/assets/img/${name}-${fallback.w}.webp`)}" srcset="${srcset}" sizes="${sizes}" width="${largest.w}" height="${largest.h}" alt="${alt.replace(/"/g, "&quot;")}"${cls ? ` class="${cls}"` : ""} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  });
  config.addFilter("imgUrl", (name, w = 960) => {
    const set = images[name];
    const pick = set.find((s) => s.w <= w) || set[set.length - 1];
    return withPrefix(`/assets/img/${name}-${pick.w}.webp`);
  });

  // Inline traced logo SVG so it can take currentColor.
  config.addShortcode("logo", (name, label, cls = "") => {
    if (!logoCache[name]) logoCache[name] = fs.readFileSync(path.join("src/assets/logos", `${name}.svg`), "utf8");
    return logoCache[name]
      .replace("<svg ", `<svg class="logo logo--${name} ${cls}" aria-label="${label}" focusable="false" `)
      .replace(/<\?xml[^>]*>/, "");
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    pathPrefix: PREFIX,
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
