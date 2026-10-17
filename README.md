# Belle Pubs & Hotels: website preview

A speculative redesign for [Belle Pubs & Hotels](https://www.bellepubsandrestaurants.co.uk): five London sports pubs, four with boutique rooms. It's a static site with mock forms that send nothing. The research behind every design choice is in [RESEARCH.md](RESEARCH.md).

## Run it

```bash
npm install
npm start          # http://localhost:8080/belle-pubs/
npm run build      # writes _site/
```

By default the site builds for `https://alexwilder-dev.github.io/belle-pubs/`. Set `SITE_ORIGIN` and `PATH_PREFIX` to build for somewhere else. The GitHub Pages workflow sets both automatically from the repository's Pages settings.

## Editing content

Everything lives in `src/_data/`:

| File | What's in it |
|---|---|
| `venues.json` | The five pubs: address, hours, stations, screens, sound zones, rooms and room types, history, hire notes, gallery |
| `menus.json` | Food, Belle Burgers, Sunday roast, breakfast and drinks, transcribed from the October 2025 menus |
| `christmas.json` | Christmas 2026 party menus, drinks, Christmas Day menus and the early-bird deadline |
| `fixtures/*.json` | Real upcoming fixtures with sources (football, rugby & NFL, F1/darts/boxing and more) |
| `board.js` | Turns the fixtures into the "what's on" board, including the **sample** screen plan (which Belle shows what, and where the sound is on) |
| `offers.json`, `events.json`, `jobs.json` | Weekly offers, dated events, current vacancies |
| `site.js` | Head office contacts, the gift voucher, site URL settings |

Dietary marks follow the printed menus. Add `"diet": ["v"]` or `["ve"]` to a dish to mark it.

## Images

The original photos and PDFs from the current site are listed in `assets/source/MANIFEST.md`, but not committed (about 300 MB):

```bash
python3 scripts/fetch-sources.py   # download the originals again
npm run images                     # resize photos, trace the logos to SVG
npx -p playwright npm run og       # redraw the 1200×630 link-preview images
```

Web-sized images, traced logos and the preview images are committed under `src/assets/`, so building the site doesn't need any of these steps.

## Deploying

`.github/workflows/pages.yml` builds and deploys on every push. In the repository, go to Settings → Pages → Build and deployment and set Source to **GitHub Actions**.
