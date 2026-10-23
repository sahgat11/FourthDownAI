"""
Precompute static JSON for the FourthDown AI website.

Runs the full league-independent pipeline (same code path as the CLI
and API) and writes:

    meta.json         run metadata, freshness, model description
    metrics.json      held-out evaluation: XGBoost vs 3-week baseline
    projections.json  next-week PPR projections for active RB/WR/TE
    breakouts.json    Breakout Watch candidates
    waivers.json      likely-available waiver targets

into frontend/public/data/ (override with --out). The schema is
documented in backend/DATA_SCHEMA.md. Every number shown on the site
must come from these files.

Usage:
    python backend/precompute.py
    python backend/precompute.py --stats-file stats.parquet   # dev cache
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import SEASON, SKILL_POSITIONS, STATIC_DATA_DIR  # noqa: E402
from data_loader import load_player_stats, load_schedule  # noqa: E402
from ml_model import FEATURE_COLUMNS  # noqa: E402
from pipeline import build_base_analysis  # noqa: E402
from waiver_engine import (  # noqa: E402
    filter_waiver_pool,
    score_waiver_candidates,
)


SCHEMA_VERSION = 1

# Waiver availability proxy for a public (league-less) site: players
# ranked inside these position cutoffs by season-to-date PPR points are
# treated as rostered in a typical 12-team league and excluded.
ROSTERED_CUTOFFS = {"RB": 30, "WR": 42, "TE": 12}

WAIVER_MIN_PROJECTION = 5.0
WAIVER_MAX_DATA_AGE_WEEKS = 1
PROJECTION_MAX_DATA_AGE_WEEKS = 1

FEATURE_LABELS = {
    "fantasy_points_ppr_avg_3": "PPR points (3-wk avg)",
    "carries_avg_3": "Carries (3-wk avg)",
    "rushing_yards_avg_3": "Rushing yards (3-wk avg)",
    "rushing_tds_avg_3": "Rushing TDs (3-wk avg)",
    "targets_avg_3": "Targets (3-wk avg)",
    "receptions_avg_3": "Receptions (3-wk avg)",
    "receiving_yards_avg_3": "Receiving yards (3-wk avg)",
    "receiving_tds_avg_3": "Receiving TDs (3-wk avg)",
    "receiving_air_yards_avg_3": "Air yards (3-wk avg)",
    "target_share_avg_3": "Target share (3-wk avg)",
    "air_yards_share_avg_3": "Air yards share (3-wk avg)",
    "wopr_avg_3": "WOPR (3-wk avg)",
    "opportunities_avg_3": "Opportunities (3-wk avg)",
    "target_share_change": "Target share change (wk/wk)",
    "opportunity_change": "Opportunity change (wk/wk)",
}

CALIBRATION_BINS = [0, 5, 10, 15, 20, 25, math.inf]


# ---------------------------------------------------------------- helpers


def clean(value, digits=2):
    """Convert numpy/pandas scalars to JSON-safe Python values."""

    if value is None or value is pd.NA:
        return None
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        if not math.isfinite(float(value)):
            return None
        return round(float(value), digits)
    if pd.isna(value):
        return None
    return value


def mae(actual, predicted):
    return float(np.mean(np.abs(actual - predicted)))


def rmse(actual, predicted):
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def pct_improvement(baseline, model):
    return (baseline - model) / baseline * 100


# ---------------------------------------------------------------- metrics


def build_metrics(base):
    baseline = base["baseline"]
    ml = base["ml"]
    season = base["season"]

    # Both evaluations score the same held-out rows; join them so
    # per-week / per-position breakdowns compare like with like.
    keys = ["player_id", "season", "week"]
    test = ml["predictions"][
        keys + ["position", "next_week_fantasy_points", "ml_prediction"]
    ].merge(
        baseline["predictions"][keys + ["baseline_prediction"]],
        on=keys,
        how="inner",
    )

    if len(test) != ml["test_size"] or len(test) != baseline["test_size"]:
        raise RuntimeError(
            "Baseline and XGBoost were not evaluated on the same rows."
        )

    test["target_week"] = test["week"] + 1
    actual = test["next_week_fantasy_points"]

    def summarize(frame):
        y = frame["next_week_fantasy_points"]
        return {
            "n": int(len(frame)),
            "baseline_mae": clean(mae(y, frame["baseline_prediction"]), 3),
            "xgboost_mae": clean(mae(y, frame["ml_prediction"]), 3),
            "baseline_rmse": clean(rmse(y, frame["baseline_prediction"]), 3),
            "xgboost_rmse": clean(rmse(y, frame["ml_prediction"]), 3),
        }

    by_week = [
        {"target_week": int(week), **summarize(group)}
        for week, group in test.groupby("target_week")
    ]

    by_position = [
        {"position": position, **summarize(test[test["position"] == position])}
        for position in SKILL_POSITIONS
        if (test["position"] == position).any()
    ]

    test["bin"] = pd.cut(
        test["ml_prediction"],
        CALIBRATION_BINS,
        right=False,
    )
    calibration = []
    for interval, group in test.groupby("bin", observed=True):
        calibration.append(
            {
                "predicted_min": clean(interval.left),
                "predicted_max": clean(interval.right),
                "n": int(len(group)),
                "mean_predicted": clean(group["ml_prediction"].mean()),
                "mean_actual": clean(
                    group["next_week_fantasy_points"].mean()
                ),
            }
        )

    importance = [
        {
            "feature": row["feature"],
            "label": FEATURE_LABELS.get(row["feature"], row["feature"]),
            "importance": clean(row["importance"], 4),
        }
        for _, row in ml["importance"].iterrows()
    ]

    # Sanity: recomputed overall numbers must match the model modules.
    assert math.isclose(mae(actual, test["ml_prediction"]), ml["mae"])
    assert math.isclose(
        mae(actual, test["baseline_prediction"]), baseline["mae"]
    )

    train_seasons = sorted(
        int(s)
        for s in base["features"]["season"].unique()
        if s < season
    )

    return {
        "schema_version": SCHEMA_VERSION,
        "season": season,
        "evaluation": {
            "description": (
                f"Models trained on {train_seasons[0]}-{train_seasons[-1]} "
                f"and scored on every {season} RB/WR/TE game whose "
                "following week is complete. Each row uses data through "
                "week N to predict week N+1 PPR points."
            ),
            "train_seasons": train_seasons,
            "test_season": season,
            "target_weeks": sorted(int(w) for w in test["target_week"].unique()),
            "train_rows": int(ml["train_size"]),
            "test_rows": int(ml["test_size"]),
        },
        "baseline": {
            "name": "3-week rolling average",
            "mae": clean(baseline["mae"], 3),
            "rmse": clean(baseline["rmse"], 3),
        },
        "xgboost": {
            "name": "XGBoost",
            "mae": clean(ml["mae"], 3),
            "rmse": clean(ml["rmse"], 3),
        },
        "improvement": {
            "mae_pct": clean(pct_improvement(baseline["mae"], ml["mae"]), 1),
            "rmse_pct": clean(
                pct_improvement(baseline["rmse"], ml["rmse"]), 1
            ),
        },
        "by_week": by_week,
        "by_position": by_position,
        "calibration": calibration,
        "feature_importance": importance,
    }


# ------------------------------------------------------------ projections


def season_totals(stats, season, completed_week):
    current = stats[
        (stats["season"] == season)
        & (stats["week"] <= completed_week)
        & (stats["position"].isin(SKILL_POSITIONS))
    ]
    return (
        current.groupby("player_id")
        .agg(
            season_ppr=("fantasy_points_ppr", "sum"),
            games=("week", "nunique"),
        )
        .reset_index()
    )


def build_matchups(schedule, week):
    games = schedule[
        (schedule["week"] == week)
        & (schedule["game_type"].fillna("REG") == "REG")
    ]
    matchups = {}
    for _, game in games.iterrows():
        matchups[game["home_team"]] = {
            "opponent": game["away_team"],
            "home": True,
            "gameday": game["gameday"],
        }
        matchups[game["away_team"]] = {
            "opponent": game["home_team"],
            "home": False,
            "gameday": game["gameday"],
        }
    return matchups


def active_pool(base, matchups=None):
    """
    Each RB/WR/TE's latest row, with recent data only.

    position_rank ranks projections within position among players who
    have a game in projection_week (bye-week players get no rank). When
    no schedule is available every player is ranked.
    """

    pool = base["player_pool"]
    min_week = base["completed_week"] - PROJECTION_MAX_DATA_AGE_WEEKS
    pool = pool[
        pool["position"].isin(SKILL_POSITIONS)
        & pool["projected_points"].notna()
        & (pool["week"] >= min_week)
    ].copy()

    totals = season_totals(base["stats"], base["season"], base["completed_week"])
    pool = pool.merge(totals, on="player_id", how="left")

    if matchups:
        playing = pool["team"].isin(matchups.keys())
    else:
        playing = pd.Series(True, index=pool.index)

    pool["position_rank"] = (
        pool[playing]
        .groupby("position")["projected_points"]
        .rank(ascending=False, method="first")
    )
    pool["position_rank"] = pool["position_rank"].astype("Int64")
    return pool


def player_record(row, matchups):
    matchup = matchups.get(row["team"])
    return {
        "player_id": row["player_id"],
        "name": row["player_display_name"],
        "position": row["position"],
        "team": row["team"],
        "opponent": matchup["opponent"] if matchup else None,
        "home": matchup["home"] if matchup else None,
        "on_bye": matchup is None,
        "data_week": int(row["week"]),
        "projected_points": clean(row["projected_points"]),
        "position_rank": clean(row.get("position_rank")),
        "recent_avg": clean(row["fantasy_points_ppr_avg_3"]),
        "last_week_points": clean(row["fantasy_points_ppr"]),
        "season_ppr": clean(row.get("season_ppr")),
        "games": clean(row.get("games")),
        "usage": {
            "targets_avg_3": clean(row["targets_avg_3"]),
            "carries_avg_3": clean(row["carries_avg_3"]),
            "opportunities_avg_3": clean(row["opportunities_avg_3"]),
            "target_share_avg_3": clean(row["target_share_avg_3"], 3),
            "wopr_avg_3": clean(row["wopr_avg_3"], 3),
        },
        "headshot_url": clean(row.get("headshot_url")),
    }


def build_projections(base, pool, matchups, projection_week):
    pool = pool.sort_values("projected_points", ascending=False)
    players = [player_record(row, matchups) for _, row in pool.iterrows()]
    return {
        "schema_version": SCHEMA_VERSION,
        "season": base["season"],
        "projection_week": projection_week,
        "data_through_week": base["completed_week"],
        "count": len(players),
        "players": players,
    }


HISTORY_GAMES = 4


def build_history(base, games=HISTORY_GAMES):
    """
    Each player's last few games this season (oldest first): PPR points,
    touches (carries + targets) and target share. Powers the trend lines
    and "why" chips on breakout and waiver cards.
    """

    rows = base["features"]
    rows = rows[
        (rows["season"] == base["season"])
        & (rows["week"] <= base["completed_week"])
    ].sort_values(["player_id", "week"])

    history = {}
    for player_id, group in rows.groupby("player_id"):
        recent = group.tail(games)
        history[player_id] = [
            {
                "week": int(r["week"]),
                "points": clean(r["fantasy_points_ppr"]),
                "touches": clean(r["opportunities"]),
                "target_share": clean(r["target_share"], 3),
            }
            for _, r in recent.iterrows()
        ]
    return history


# -------------------------------------------------------------- breakouts


def build_breakouts(base, pool, matchups, projection_week, history=None):
    breakouts = base["breakouts"].merge(
        pool[["player_id", "position_rank", "season_ppr", "games"]],
        on="player_id",
        how="left",
    )
    players = []
    for _, row in breakouts.iterrows():
        record = player_record(row, matchups)
        record.update(
            {
                "breakout_score": clean(row["breakout_score"], 1),
                "projection_gain": clean(row["projection_gain"]),
                "opportunity_change": clean(row["opportunity_change"]),
                "target_share_change": clean(row["target_share_change"], 3),
                "history": (history or {}).get(row["player_id"], []),
                "components": {
                    "gain": clean(row["gain_score"] * 100, 1),
                    "projection": clean(row["projection_score"] * 100, 1),
                    "opportunity": clean(row["opportunity_score"] * 100, 1),
                    "target_share": clean(row["target_share_score"] * 100, 1),
                },
            }
        )
        players.append(record)

    return {
        "schema_version": SCHEMA_VERSION,
        "season": base["season"],
        "projection_week": projection_week,
        "data_through_week": base["completed_week"],
        "criteria": {
            "min_projected_points": 7,
            "min_projection_gain": 2,
            "weights": {
                "gain": 0.45,
                "projection": 0.20,
                "opportunity": 0.25,
                "target_share": 0.10,
            },
            "description": (
                "Players whose next-week projection beats their 3-week "
                "average by 2+ points (and projects 7+), scored by "
                "position-relative percentiles of projected gain, "
                "projection, opportunity growth and target-share growth."
            ),
        },
        "count": len(players),
        "players": players,
    }


# ---------------------------------------------------------------- waivers


def load_sleeper_players():
    """Sleeper's player directory, or None when it can't be loaded."""

    try:
        from sleeper_client import get_nfl_players

        return get_nfl_players(allow_stale=True)
    except Exception as error:  # network / API failure is non-fatal
        print(f"Sleeper player directory unavailable: {error.__class__.__name__}")
        return None


def fetch_sleeper_trending(players):
    """
    Optional signal: Sleeper's public trending adds (last 48h), keyed
    by GSIS id. Returns None when Sleeper is unreachable.
    """

    if players is None:
        return None
    try:
        from sleeper_client import make_request

        trending = make_request(
            "/players/nfl/trending/add?lookback_hours=48&limit=300"
        )
    except Exception as error:
        print(f"Sleeper trending adds unavailable: {error.__class__.__name__}")
        return None

    adds = {}
    for item in trending:
        player = players.get(str(item.get("player_id")))
        gsis_id = player and player.get("gsis_id")
        if gsis_id:
            adds[str(gsis_id).strip()] = int(item.get("count") or 0)
    return adds


# ----------------------------------------------------------- league players

LEAGUE_POSITIONS = {"QB", "RB", "WR", "TE", "K", "DEF"}


def build_league_players(sleeper_players, season):
    """
    Compact Sleeper id -> [name, position, team, gsis_id] map so the site
    can read a Sleeper league's rosters in the browser without the 16 MB
    directory. Fantasy positions only; free agents kept if still active.
    """

    from waiver_engine import get_sleeper_full_name

    players = {}
    for sleeper_id, p in sleeper_players.items():
        position = p.get("position")
        if position not in LEAGUE_POSITIONS:
            continue
        if not (p.get("active") or p.get("team")):
            continue
        name = (
            f"{p.get('team')} D/ST" if position == "DEF" and p.get("team")
            else get_sleeper_full_name(p)
        )
        if not name:
            continue
        gsis = p.get("gsis_id")
        players[str(sleeper_id)] = [
            name,
            position,
            p.get("team"),
            str(gsis).strip() if gsis else None,
        ]
    return {
        "schema_version": SCHEMA_VERSION,
        "season": season,
        "count": len(players),
        "players": dict(sorted(players.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 10**9)),
    }


def likely_rostered_ids(pool):
    ids = set()
    ranked = pool.sort_values("season_ppr", ascending=False)
    for position, cutoff in ROSTERED_CUTOFFS.items():
        top = ranked[ranked["position"] == position].head(cutoff)
        ids.update(top["player_id"].astype(str))
    return ids


def build_waivers(base, pool, matchups, projection_week, trending, history=None):
    candidates = filter_waiver_pool(
        pool,
        base["completed_week"],
        min_projection=WAIVER_MIN_PROJECTION,
        max_data_age_weeks=WAIVER_MAX_DATA_AGE_WEEKS,
    )
    rostered = likely_rostered_ids(pool)
    available = candidates[
        ~candidates["player_id"].astype(str).isin(rostered)
    ]
    ranked = score_waiver_candidates(available, base["breakouts"])

    players = []
    for _, row in ranked.iterrows():
        record = player_record(row, matchups)
        record.update(
            {
                "waiver_score": clean(row["waiver_score"], 1),
                "breakout_score": clean(row["breakout_score"], 1),
                "is_breakout": clean(row["is_breakout"]),
                "sleeper_adds_48h": (
                    trending.get(str(row["player_id"]), 0)
                    if trending is not None
                    else None
                ),
                "history": (history or {}).get(row["player_id"], []),
            }
        )
        players.append(record)

    return {
        "schema_version": SCHEMA_VERSION,
        "season": base["season"],
        "projection_week": projection_week,
        "data_through_week": base["completed_week"],
        "availability": {
            "method": "season_points_cutoff",
            "rostered_cutoffs": ROSTERED_CUTOFFS,
            "description": (
                "No league is connected, so players inside the top "
                + " / ".join(
                    f"{n} {pos}" for pos, n in ROSTERED_CUTOFFS.items()
                )
                + " by season PPR points are assumed rostered in a "
                "typical 12-team league and excluded."
            ),
            "sleeper_trending": trending is not None,
        },
        "criteria": {
            "min_projected_points": WAIVER_MIN_PROJECTION,
            "max_data_age_weeks": WAIVER_MAX_DATA_AGE_WEEKS,
            "weights": {"projection": 0.70, "recent": 0.20, "breakout": 0.10},
        },
        "count": len(players),
        "players": players,
    }


# ------------------------------------------------------------------- meta


def build_meta(base, projection_week, counts, trending, schedule_ok):
    model = base["production_model"]
    params = model.get_params()
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat(),
        "season": base["season"],
        "data_through_week": base["completed_week"],
        "projection_week": projection_week,
        "scoring": "PPR",
        "positions": SKILL_POSITIONS,
        "model": {
            "name": "XGBoost regressor",
            "target": "Next-week PPR fantasy points",
            "features": [
                {"feature": f, "label": FEATURE_LABELS.get(f, f)}
                for f in FEATURE_COLUMNS
            ],
            "params": {
                k: clean(params[k], 4)
                for k in [
                    "n_estimators",
                    "max_depth",
                    "learning_rate",
                    "subsample",
                    "colsample_bytree",
                ]
            },
        },
        "sources": {
            "player_stats": "nflverse (nflreadpy)",
            "schedule": "nflverse (nflreadpy)" if schedule_ok else None,
            "sleeper_trending": bool(trending is not None),
        },
        "counts": counts,
    }


# ------------------------------------------------------------------- main


def _normalized(payload):
    """JSON round-trip so comparisons match what is on disk."""
    return json.loads(json.dumps(payload, allow_nan=False))


def data_unchanged(outputs, out_dir):
    """
    True when every file on disk already holds the same data, ignoring
    meta.json's generated_at. Lets scheduled refreshes skip no-op commits.
    """

    out_dir = Path(out_dir)
    for name, payload in outputs.items():
        path = out_dir / name
        if not path.exists():
            return False
        try:
            existing = json.loads(path.read_text())
        except ValueError:
            return False
        new = _normalized(payload)
        if name == "meta.json":
            existing = {k: v for k, v in existing.items() if k != "generated_at"}
            new = {k: v for k, v in new.items() if k != "generated_at"}
        if existing != new:
            return False
    return True


def write_outputs(outputs, out_dir):
    """
    Serialize everything first (so a bad value aborts before any file
    changes), then replace each file atomically via a sibling temp file.

    If nothing but the timestamp would change, the previous generated_at
    is kept so the files stay byte-identical. Returns True when data changed.
    """

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    changed = not data_unchanged(outputs, out_dir)
    if not changed:
        previous = json.loads((out_dir / "meta.json").read_text())
        outputs["meta.json"]["generated_at"] = previous["generated_at"]

    rendered = {
        name: json.dumps(payload, allow_nan=False, separators=(",", ":")) + "\n"
        for name, payload in outputs.items()
    }
    for name, text in rendered.items():
        temp_path = out_dir / f".{name}.tmp"
        temp_path.write_text(text)
        os.replace(temp_path, out_dir / name)
    return changed


def run(stats=None, out_dir=STATIC_DATA_DIR, use_sleeper=True):
    base = build_base_analysis(stats=stats, season=SEASON)
    projection_week = base["completed_week"] + 1

    try:
        schedule = load_schedule(base["season"])
        matchups = build_matchups(schedule, projection_week)
        schedule_ok = bool(matchups)
    except Exception as error:
        print(f"Schedule unavailable: {error.__class__.__name__}")
        matchups, schedule_ok = {}, False

    sleeper_players = load_sleeper_players() if use_sleeper else None
    trending = fetch_sleeper_trending(sleeper_players)

    pool = active_pool(base, matchups if schedule_ok else None)
    metrics = build_metrics(base)
    projections = build_projections(base, pool, matchups, projection_week)
    history = build_history(base)
    breakouts = build_breakouts(base, pool, matchups, projection_week, history)
    waivers = build_waivers(base, pool, matchups, projection_week, trending, history)

    if not schedule_ok:
        for payload in (projections, breakouts, waivers):
            for player in payload["players"]:
                player["on_bye"] = None

    if projections["count"] == 0:
        raise RuntimeError("No projections produced; refusing to write.")

    counts = {
        "projections": projections["count"],
        "breakouts": breakouts["count"],
        "waivers": waivers["count"],
    }
    meta = build_meta(base, projection_week, counts, trending, schedule_ok)

    outputs = {
        "meta.json": meta,
        "metrics.json": metrics,
        "projections.json": projections,
        "breakouts.json": breakouts,
        "waivers.json": waivers,
    }
    # Without Sleeper, leave any existing league_players.json untouched.
    if sleeper_players is not None:
        outputs["league_players.json"] = build_league_players(
            sleeper_players, base["season"]
        )
    changed = write_outputs(outputs, out_dir)
    return outputs, changed


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--out", default=str(STATIC_DATA_DIR))
    parser.add_argument(
        "--stats-file",
        help="Read player stats from this parquet file instead of nflverse.",
    )
    parser.add_argument(
        "--save-stats",
        help="Save the downloaded player stats to this parquet file.",
    )
    parser.add_argument(
        "--no-sleeper",
        action="store_true",
        help="Skip Sleeper (trending adds and league_players.json).",
    )
    args = parser.parse_args()

    if args.stats_file:
        stats = pd.read_parquet(args.stats_file)
    else:
        stats = load_player_stats()
        if args.save_stats:
            stats.to_parquet(args.save_stats)

    outputs, changed = run(stats=stats, out_dir=args.out, use_sleeper=not args.no_sleeper)

    metrics = outputs["metrics.json"]
    meta = outputs["meta.json"]
    print()
    print(f"Wrote {len(outputs)} files to {args.out}")
    print(
        f"Season {meta['season']}, data through week "
        f"{meta['data_through_week']}, projecting week {meta['projection_week']}"
    )
    print(
        f"Baseline MAE {metrics['baseline']['mae']} / RMSE "
        f"{metrics['baseline']['rmse']}  |  XGBoost MAE "
        f"{metrics['xgboost']['mae']} / RMSE {metrics['xgboost']['rmse']}"
    )
    print(f"Counts: {meta['counts']}")
    print("Data changed." if changed else "No data changes; kept previous timestamp.")


if __name__ == "__main__":
    main()
