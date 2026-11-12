"""Convert the MODIS CSV into data.js (compact arrays) so the site works from file:// or GitHub Pages."""
import csv, json, sys
src = sys.argv[1] if len(sys.argv) > 1 else "data/modis_2002_Pakistan.csv"
rows = []
for r in csv.DictReader(open(src)):
    rows.append([float(r["latitude"]), float(r["longitude"]), float(r["brightness"]),
                 r["acq_date"], int(r["acq_time"]), r["satellite"], int(r["confidence"]),
                 float(r["bright_t31"]), float(r["frp"]), r["daynight"]])
cols = ["lat", "lon", "brightness", "date", "time", "satellite", "confidence", "t31", "frp", "daynight"]
open("data.js", "w").write("window.MODIS_COLS=%s;\nwindow.MODIS_ROWS=%s;\n" % (json.dumps(cols), json.dumps(rows, separators=(",", ":"))))
print(len(rows), "rows")
