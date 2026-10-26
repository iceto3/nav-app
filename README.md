# Nav app

A sailing map for Greece. It is a static PWA hosted on GitHub Pages at https://iceto3.github.io/nav-app/ and has **no build step**: the browser loads plain ES modules from `src/`.

- **Bases:** Satellite (Esri), Topo (Esri), OpenStreetMap, and Old chart (an engraved style built from bundled `coast.pmtiles`).
- **Overlays:**
  - seamarks and POIs (bundled for Greece, live from Overpass elsewhere)
  - place and water labels
  - EMODnet depth rasters and depth contours (bundled pmtiles)
  - OpenSeaMap
- **Tools:** search (Nominatim), routing and voice guidance (OSRM), own position with range rings.
- **Underway (v35):** the boat marker points along the course over ground (COG) from GPS movement, a course line runs
  from the bow past the screen edge, a small panel shows "COG 237° SOG 5.4 kn", and range ring labels add the ETA at
  the current speed ("1 NM · 12 min"). Thresholds (moving above 1 kn, 12 m between track points, smoothing) are in
  `src/config.js` (`MOTION`, `COURSE_LINE`, `ETA`); see ARCHITECTURE.md › Motion.
- **Editor:** `editor/` edits shorelines, piers, contours and symbols. Its exports are merged into `data/` with `devedits/apply.py`.

## Run locally
```
npm install            # dev tools only (ESLint, Playwright); the app itself has no npm dependencies
npm run serve          # http://localhost:8799/ (static server with HTTP Range support, needed by pmtiles)
```
URL parameters: `?lat=&lon=&z=&base=sat|topo|osm|old`.

## Check, test, deploy
```
npm run lint           # ESLint (flat config, eslint.config.js; incl. formatting rules for v35+ modules)
npm test               # Playwright: static checks, unit tests (motion.spec), app, editor, simulated GPS movement
                       # (course.spec), visual parity vs a v33 reference copy (REF_DIR)
npm run bump -- 35     # new version: APP_VERSION, app.js marker, every ?v= cache-buster, modulepreload block
npm run deploy         # lint + tests (refuses to deploy on failure) -> push to GitHub Pages -> tests against live
npm run test:live      # the suite against the live site
npm run measure        # load timing of two roots (see scripts/measure-load.mjs)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organised and [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a layer, feature or icon.
