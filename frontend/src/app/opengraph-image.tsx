import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { meta, metrics } from "@/lib/data";
import { metric, percent } from "@/lib/format";

// Social preview card. Numbers come from the precompute output, like the site.
export const alt = "FourthDown: next-week fantasy projections, measured against a baseline";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static Archivo files (.woff); the image renderer can't read the site's variable .woff2.
async function archivo(weight: 400 | 800) {
  const file = `archivo-latin-${weight}-normal.woff`;
  return readFile(path.join(process.cwd(), "node_modules/@fontsource/archivo/files", file));
}

export default async function OpenGraphImage() {
  const [regular, heavy] = await Promise.all([archivo(400), archivo(800)]);
  const ink = "#172026";
  const muted = "#46515a";
  const accent = "#c0362c";
  const tile = (label: string, value: string, strong: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", borderTop: `6px solid ${strong ? accent : "#b9c1c6"}`, paddingTop: 18, width: 300 }}>
      <div style={{ fontSize: 26, color: muted }}>{label}</div>
      <div style={{ fontSize: 96, fontWeight: 800, color: strong ? ink : muted, letterSpacing: -3 }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#eef0ef", padding: "64px 72px", color: ink, fontFamily: "Archivo" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 6, height: 34, background: "#b9c1c6", borderRadius: 3 }} />
            <div style={{ width: 6, height: 34, background: "#b9c1c6", borderRadius: 3 }} />
            <div style={{ width: 6, height: 34, background: "#b9c1c6", borderRadius: 3 }} />
            <div style={{ width: 9, height: 46, background: accent, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 800 }}>FourthDown</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
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
            <div style={{ fontSize: 44, fontWeight: 800, color: accent }}>{`${percent(metrics.improvement.mae_pct)} lower`}</div>
            <div style={{ fontSize: 26, color: muted }}>{`${percent(metrics.improvement.rmse_pct)} lower RMSE`}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
        { name: "Archivo", data: heavy, weight: 800, style: "normal" },
      ],
    },
  );
}
