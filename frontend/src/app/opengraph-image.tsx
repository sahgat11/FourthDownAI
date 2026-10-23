import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { meta, metrics } from "@/lib/data";
import { metric, percent } from "@/lib/format";

// Social preview card. Numbers come from the precompute output, like the site.
export const alt = "FourthDown: next-week fantasy projections, measured against a baseline";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static .woff files; the image renderer can't read the site's variable .woff2.
function font(pkg: string, file: string) {
  return readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));
}

export default async function OpenGraphImage() {
  const [body, display, varsity] = await Promise.all([
    font("barlow", "barlow-latin-500-normal.woff"),
    font("big-shoulders-display", "big-shoulders-display-latin-800-normal.woff"),
    font("graduate", "graduate-latin-400-normal.woff"),
  ]);
  const navy = "#0e1c36";
  const ink = navy;
  const muted = "#3b4a66";
  const accent = "#b8122e";
  const tile = (label: string, value: string, strong: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", borderTop: `6px solid ${strong ? accent : "#b7bfcd"}`, paddingTop: 18, width: 300 }}>
      <div style={{ fontSize: 26, color: muted }}>{label}</div>
      <div style={{ fontSize: 112, fontFamily: "Big Shoulders", color: strong ? ink : muted, lineHeight: 1 }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f4f2ec", color: ink, fontFamily: "Barlow" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: navy, padding: "30px 72px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 6, height: 32, background: "#c9d3e6", opacity: 0.55, borderRadius: 3 }} />
            <div style={{ width: 6, height: 32, background: "#c9d3e6", opacity: 0.55, borderRadius: 3 }} />
            <div style={{ width: 6, height: 32, background: "#c9d3e6", opacity: 0.55, borderRadius: 3 }} />
            <div style={{ width: 9, height: 46, background: accent, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 44, fontFamily: "Graduate", color: "#ffffff" }}>FourthDown</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ height: 6, background: accent }} />
          <div style={{ height: 4, background: "#ffffff" }} />
          <div style={{ height: 6, background: accent }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "40px 72px 52px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 76, fontFamily: "Big Shoulders", textTransform: "uppercase", lineHeight: 1 }}>
            {`Week ${meta.projection_week} fantasy projections`}
          </div>
          <div style={{ fontSize: 30, color: muted }}>
            {`XGBoost vs a 3-week-average baseline, ${metrics.evaluation.test_rows.toLocaleString("en-US")} held-out player-weeks`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 56, alignItems: "flex-end" }}>
          {tile("XGBoost error (MAE)", metric(metrics.xgboost.mae), true)}
          {tile("Baseline error (MAE)", metric(metrics.baseline.mae), false)}
          <div style={{ display: "flex", flexDirection: "column", paddingBottom: 18 }}>
            <div style={{ fontSize: 52, fontFamily: "Big Shoulders", color: accent }}>{`${percent(metrics.improvement.mae_pct)} lower`}</div>
            <div style={{ fontSize: 26, color: muted }}>{`${percent(metrics.improvement.rmse_pct)} lower RMSE`}</div>
          </div>
        </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Barlow", data: body, weight: 500, style: "normal" },
        { name: "Big Shoulders", data: display, weight: 800, style: "normal" },
        { name: "Graduate", data: varsity, weight: 400, style: "normal" },
      ],
    },
  );
}
