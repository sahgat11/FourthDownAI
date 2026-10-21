# Static data schema (`frontend/public/data/`)

`backend/precompute.py` runs the full league-independent pipeline
(`pipeline.build_base_analysis`, the same code the CLI and API use) and
writes five JSON files. The website reads only these files, so every
number on the site is traceable to a precompute run.

```bash
python backend/precompute.py                         # pull nflverse, write files
python backend/precompute.py --save-stats stats.parquet   # also cache raw stats
python backend/precompute.py --stats-file stats.parquet   # rerun from cache
python backend/precompute.py --no-sleeper            # skip Sleeper trending lookup
python -m pytest backend/tests                       # schema + metric tests
```

Conventions

- `schema_version` (int) is on every file. Bump it on breaking changes.
- Points are PPR. Floats are rounded to 2 decimals (MAE/RMSE to 3,
  shares/WOPR to 3, scores to 1). Missing values are `null`, never `NaN`.
- `data_through_week` is the latest complete NFL week in the data.
  `projection_week = data_through_week + 1` is the week being projected.
- Files are written all-or-nothing: everything is serialized first, then
  each file is swapped in with an atomic rename. The script exits non-zero
  (and writes nothing) if the pipeline fails or yields no projections.

## Shared player record

Used by `projections.json`, `breakouts.json` and `waivers.json`.

| field | type | notes |
|---|---|---|
| `player_id` | string | nflverse GSIS id, e.g. `00-0039337` |
| `name` | string | display name |
| `position` | `"RB"\|"WR"\|"TE"` | |
| `team` | string | team in the player's latest game |
| `opponent` | string \| null | `projection_week` opponent; null on bye/unknown |
| `home` | bool \| null | |
| `on_bye` | bool \| null | null when the schedule could not be loaded |
| `data_week` | int | week of the row the projection is built from |
| `projected_points` | number | XGBoost next-week PPR projection |
| `position_rank` | int \| null | rank by projection within position among players with a game in `projection_week`; null on bye |
| `recent_avg` | number | 3-week rolling PPR average (the baseline's prediction) |
| `last_week_points` | number | PPR points in `data_week` |
| `season_ppr` | number \| null | season-to-date PPR points |
| `games` | int \| null | games played this season |
| `usage` | object | `targets_avg_3`, `carries_avg_3`, `opportunities_avg_3`, `target_share_avg_3`, `wopr_avg_3` |
| `headshot_url` | string \| null | nflverse headshot URL |

## `meta.json`

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-10-21T05:27:06+00:00",   // UTC ISO-8601
  "season": 2026,
  "data_through_week": 6,
  "projection_week": 7,
  "scoring": "PPR",
  "positions": ["RB", "WR", "TE"],
  "model": {
    "name": "XGBoost regressor",
    "target": "Next-week PPR fantasy points",
    "features": [{ "feature": "fantasy_points_ppr_avg_3", "label": "PPR points (3-wk avg)" }],
    "params": { "n_estimators": 300, "max_depth": 4, "learning_rate": 0.03, "subsample": 0.8, "colsample_bytree": 0.8 }
  },
  "sources": { "player_stats": "nflverse (nflreadpy)", "schedule": "nflverse (nflreadpy)", "sleeper_trending": false },
  "counts": { "projections": 366, "breakouts": 33, "waivers": 116 }
}
```

## `metrics.json`

Held-out evaluation. Both models are scored on exactly the same rows:
every `season` RB/WR/TE game in week N whose week N+1 is complete,
predicting week N+1 PPR points. Training uses all prior seasons.

```jsonc
{
  "schema_version": 1,
  "season": 2026,
  "evaluation": {
    "description": "...",
    "train_seasons": [2023, 2024, 2025],
    "test_season": 2026,
    "target_weeks": [2, 3, 4, 5, 6],   // the weeks being predicted
    "train_rows": 12209,
    "test_rows": 1288
  },
  "baseline": { "name": "3-week rolling average", "mae": 4.979, "rmse": 7.088 },
  "xgboost":  { "name": "XGBoost", "mae": 4.636, "rmse": 6.318 },
  "improvement": { "mae_pct": 6.9, "rmse_pct": 10.9 },   // positive = XGBoost better
  "by_week":     [{ "target_week": 2, "n": 269, "baseline_mae": 5.621, "xgboost_mae": 4.798, "baseline_rmse": 8.164, "xgboost_rmse": 6.661 }],
  "by_position": [{ "position": "RB",  "n": 374, "baseline_mae": 5.029, "xgboost_mae": 4.703, "baseline_rmse": 6.99, "xgboost_rmse": 6.237 }],
  "calibration": [{ "predicted_min": 0, "predicted_max": 5, "n": 521, "mean_predicted": 2.77, "mean_actual": 3.04 }],
  // XGBoost gain importances of the evaluation model, descending, sum ~ 1
  "feature_importance": [{ "feature": "fantasy_points_ppr_avg_3", "label": "PPR points (3-wk avg)", "importance": 0.3844 }]
}
```

`calibration` buckets XGBoost predictions into `[0,5) [5,10) ... [25,∞)`
(`predicted_max` is `null` for the open-ended bucket; empty buckets are omitted).

## `projections.json`

```jsonc
{
  "schema_version": 1, "season": 2026, "projection_week": 7, "data_through_week": 6,
  "count": 366,
  "players": [ /* shared player record */ ]   // sorted by projected_points desc
}
```

Includes every RB/WR/TE whose latest game is within one week of
`data_through_week` (so injured or inactive players drop out). Players on
bye have `on_bye: true` and still carry a model projection; the site
should show them as BYE rather than as a real projection.

## `breakouts.json`

Rows from the latest completed week whose projection is ≥ 7 and at least
2 points above the player's 3-week average. Sorted by `breakout_score`.

```jsonc
{
  "schema_version": 1, "season": 2026, "projection_week": 7, "data_through_week": 6,
  "criteria": { "min_projected_points": 7, "min_projection_gain": 2,
                "weights": { "gain": 0.45, "projection": 0.20, "opportunity": 0.25, "target_share": 0.10 },
                "description": "..." },
  "count": 33,
  "players": [{
    /* shared player record */
    "breakout_score": 87.1,          // 0-100
    "projection_gain": 3.89,         // projected_points - recent_avg
    "opportunity_change": 4.0,       // carries+targets vs previous game
    "target_share_change": 0.052,
    "components": { "gain": 96.4, "projection": 81.0, "opportunity": 70.2, "target_share": 88.1 }  // within-position percentiles x100
  }]
}
```

## `waivers.json`

The public site has no league, so availability is estimated: players
inside the top 30 RB / 42 WR / 12 TE by season PPR points are treated as
rostered in a typical 12-team league and excluded. The remaining pool
(projection ≥ 5, data no more than 1 week old) is ranked with the same
`waiver_score` the league-aware Sleeper mode uses
(`waiver_engine.score_waiver_candidates`).

```jsonc
{
  "schema_version": 1, "season": 2026, "projection_week": 7, "data_through_week": 6,
  "availability": {
    "method": "season_points_cutoff",
    "rostered_cutoffs": { "RB": 30, "WR": 42, "TE": 12 },
    "description": "...",
    "sleeper_trending": false
  },
  "criteria": { "min_projected_points": 5.0, "max_data_age_weeks": 1,
                "weights": { "projection": 0.70, "recent": 0.20, "breakout": 0.10 } },
  "count": 116,
  "players": [{
    /* shared player record */
    "waiver_score": 89.5,            // 0-100, sorted desc
    "breakout_score": 0.0,           // 0 when not a breakout candidate
    "is_breakout": false,
    "sleeper_adds_48h": null         // Sleeper trending adds (48h); null if Sleeper unreachable
  }]
}
```

## League-specific mode (optional, local)

My Team and add/drop recommendations need a Sleeper league and username,
so they are not precomputed. Run the API locally with
`uvicorn api:app --reload` from `backend/` (CORS origins via
`FOURTHDOWN_CORS_ORIGINS`), or the CLI:
`python backend/main.py --league-id <id> --username <name>`.
