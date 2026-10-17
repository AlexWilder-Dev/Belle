// Site-wide settings. The deploy workflow passes SITE_ORIGIN and PATH_PREFIX from GitHub Pages,
// so absolute URLs in link previews match wherever the site is served.
const origin = (process.env.SITE_ORIGIN || "https://alexwilder-dev.github.io").replace(/\/$/, "");
const prefix = process.env.PATH_PREFIX || "/belle-pubs/";

export default {
  name: "Belle Pubs & Hotels",
  line: "Beautiful sports pubs & hotel rooms",
  origin,
  prefix,
  base: origin + prefix.replace(/\/$/, ""),
  headOffice: [
    { role: "General & corporate enquiries", name: "Jane White", email: "jane@bellepubsandrestaurants.co.uk" },
    { role: "Finance & purchasing", name: "Simon Johnson", email: "simon@bellepubsandrestaurants.co.uk" }
  ],
  voucher: {
    title: "Two Course Meal at Belle Pubs for Two",
    price: "£69",
    seller: "Activity Superstore",
    url: "https://www.activitysuperstore.com/two-course-meal-at-belle-pubs-for-two",
    venues: ["moretown", "duchess", "fitzrovia", "griffin"],
    text: "Two courses each with a glass of wine, a beer or a soft drink, at the Moretown, Duchess, Fitzrovia or Griffin. Valid for 12 months."
  },
  today: "2026-10-17"
};
