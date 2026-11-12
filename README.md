# Pakistan Fire Explorer 2002

Interactive dashboard for the MODIS active-fire detections in `data/modis_2002_Pakistan.csv` (4,440 records).

- Open `index.html` in a browser (no build or server needed), or serve the repo with GitHub Pages.
- Filters: date range, minimum confidence, satellite, day/night.
- **Trend slider**: sets the moving-average window (1–60 days) on the daily chart; optional linear trend line with slope.
- Charts: daily bar + trend, monthly bars (click to zoom), monthly mean FRP, day/night and Terra/Aqua doughnuts, location map, latitude bands, confidence/FRP/hour histograms, brightness-vs-FRP scatter with correlation, summary statistics table.
- Regenerate `data.js` after changing the CSV: `python3 tools/build_data.py`.

## Live site
Hosted with GitHub Pages: https://nafaysajjad.github.io/test/ (deployed by `.github/workflows/pages.yml`).
