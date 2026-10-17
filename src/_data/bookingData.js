// A small JSON blob for the booking dialog: venue details and the next few weeks of fixtures.
import fs from "node:fs";
import board from "./board.js";

const venues = JSON.parse(fs.readFileSync("src/_data/venues.json", "utf8"));

export default function () {
  const { items } = board();
  return {
    venues: venues.map((v) => ({ slug: v.slug, name: v.name, area: v.areaShort, phone: v.phone, hours: v.hours })),
    fixtures: items.map((f) => ({
      id: f.id, title: f.title, date: f.date, time: f.time, sport: f.sportLabel,
      competition: f.competition, channel: f.channel, headline: f.headline,
      venues: f.showing.map((s) => s.venue),
    })),
  };
}
