// Projects the five Belles and a simplified Thames onto a 1000-wide SVG.
import fs from "node:fs";

const venues = JSON.parse(fs.readFileSync("src/_data/venues.json", "utf8"));
const LON = [-0.247, -0.045];
const LAT = [51.459, 51.528];
const W = 1000;
const H = Math.round((W * (LAT[1] - LAT[0])) / ((LON[1] - LON[0]) * Math.cos((51.49 * Math.PI) / 180)));
const px = (lat, lon) => [((lon - LON[0]) / (LON[1] - LON[0])) * W, ((LAT[1] - lat) / (LAT[1] - LAT[0])) * H];

// West to east, roughly following the river's centre line.
const RIVER = [
  [51.4925, -0.2600], [51.4883, -0.2302], [51.4805, -0.2245], [51.4730, -0.2205], [51.4669, -0.2131],
  [51.4640, -0.2010], [51.4652, -0.1880], [51.4725, -0.1800], [51.4818, -0.1717], [51.4830, -0.1640],
  [51.4846, -0.1503], [51.4840, -0.1420], [51.4858, -0.1320], [51.4881, -0.1268], [51.4943, -0.1235],
  [51.5008, -0.1222], [51.5065, -0.1213], [51.5090, -0.1150], [51.5099, -0.1045], [51.5082, -0.0880],
  [51.5056, -0.0754], [51.5043, -0.0640], [51.5052, -0.0520], [51.5085, -0.0380],
];

// Catmull-Rom spline through the points, written as cubic Béziers.
function smooth(points) {
  const p = points.map(([la, lo]) => px(la, lo));
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const order = ["hammersmith", "duchess", "griffin", "fitzrovia", "moretown"];
// Label offsets so names sit clear of the river and of each other.
const LABEL = {
  hammersmith: { dx: 0, dy: -46, anchor: "middle" },
  duchess: { dx: -20, dy: 62, anchor: "end" },
  griffin: { dx: 22, dy: 64, anchor: "start" },
  fitzrovia: { dx: 0, dy: -46, anchor: "middle" },
  moretown: { dx: 0, dy: -46, anchor: "middle" },
};
const LANDMARKS = [
  { name: "Tower Bridge", at: px(51.5055, -0.0754), dy: 34 },
  { name: "Battersea Power Station", at: px(51.4818, -0.1446), dy: -60, chimneys: true },
  { name: "Hammersmith Bridge", at: px(51.4883, -0.2302), dy: 34 },
  { name: "Westminster", at: px(51.5008, -0.1222), dy: 0, dx: 16 },
];

export default {
  width: W,
  height: H,
  river: smooth(RIVER),
  landmarks: LANDMARKS.map((l) => ({ ...l, x: +l.at[0].toFixed(1), y: +l.at[1].toFixed(1) })),
  pins: order.map((slug, i) => {
    const v = venues.find((x) => x.slug === slug);
    const [x, y] = px(v.lat, v.lon);
    return { n: i + 1, slug, name: v.name, area: v.areaShort, rooms: v.rooms ? v.rooms.count : 0,
      x: +x.toFixed(1), y: +y.toFixed(1), ...LABEL[slug] };
  }),
};
