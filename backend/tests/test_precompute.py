"""
End-to-end test of precompute.py on synthetic data (no network).
Checks the output files against the documented schema and that the
published metrics match the model modules exactly.
"""

import json
import math

import numpy as np
import pandas as pd
import pytest

import precompute
from baseline_model import evaluate_baseline
from feature_engineering import build_features
from ml_model import train_and_evaluate
from week_utils import get_latest_complete_week

TEAMS = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"]


def synthetic_stats(seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    for pid in range(120):
        position = ["RB", "WR", "TE"][pid % 3]
        team = TEAMS[pid % len(TEAMS)]
        talent = rng.uniform(0.3, 1.5)
        for season in [2023, 2024, 2025, 2026]:
            last_week = 6 if season == 2026 else 17
            for week in range(1, last_week + 1):
                targets = rng.poisson(5 * talent)
                carries = rng.poisson((10 if position == "RB" else 0.5) * talent)
                receptions = min(targets, rng.poisson(3.5 * talent))
                rec_yards = receptions * rng.uniform(6, 14)
                rush_yards = carries * rng.uniform(2, 6)
                rec_td = rng.poisson(0.3 * talent)
                rush_td = rng.poisson(0.2 * talent)
                rows.append(
                    {
                        "player_id": f"00-{pid:07d}",
                        "player_display_name": f"Player {pid}",
                        "position": position,
                        "season": season,
                        "week": week,
                        "team": team,
                        "headshot_url": None,
                        "carries": carries,
                        "rushing_yards": rush_yards,
                        "rushing_tds": rush_td,
                        "targets": targets,
                        "receptions": receptions,
                        "receiving_yards": rec_yards,
                        "receiving_tds": rec_td,
                        "receiving_air_yards": targets * rng.uniform(5, 12),
                        "target_share": targets / 35,
                        "air_yards_share": rng.uniform(0, 0.4),
                        "wopr": rng.uniform(0, 0.8),
                        "fantasy_points_ppr": receptions
                        + 0.1 * (rec_yards + rush_yards)
                        + 6 * (rec_td + rush_td),
                    }
                )
    return pd.DataFrame(rows)


def fake_schedule(season):
    # Week 7: AAA-BBB, CCC-DDD; EEE and FFF on bye.
    return pd.DataFrame(
        {
            "season": [season, season],
            "week": [7, 7],
            "game_type": ["REG", "REG"],
            "gameday": ["2026-10-25", "2026-10-25"],
            "home_team": ["AAA", "CCC"],
            "away_team": ["BBB", "DDD"],
        }
    )


@pytest.fixture(scope="module")
def output(tmp_path_factory, monkeypatch_module):
    monkeypatch_module.setattr(precompute, "load_schedule", fake_schedule)
    out_dir = tmp_path_factory.mktemp("data")
    stats = synthetic_stats()
    precompute.run(stats=stats, out_dir=out_dir, use_sleeper=False)
    files = {p.name: json.loads(p.read_text()) for p in out_dir.glob("*.json")}
    return stats, files


@pytest.fixture(scope="module")
def monkeypatch_module():
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


def test_writes_all_files(output):
    _, files = output
    assert set(files) == {
        "meta.json",
        "metrics.json",
        "projections.json",
        "breakouts.json",
        "waivers.json",
    }
    for payload in files.values():
        assert payload["schema_version"] == precompute.SCHEMA_VERSION


def test_meta(output):
    _, files = output
    meta = files["meta.json"]
    assert meta["data_through_week"] == 6
    assert meta["projection_week"] == 7
    assert meta["counts"]["projections"] == files["projections.json"]["count"]
    assert len(meta["model"]["features"]) == 15


def test_metrics_match_model_modules(output):
    stats, files = output
    metrics = files["metrics.json"]

    features = build_features(stats)
    week = get_latest_complete_week(features, 2026)
    baseline = evaluate_baseline(features, 2026, week)
    ml = train_and_evaluate(features, 2026, week)

    assert metrics["baseline"]["mae"] == round(baseline["mae"], 3)
    assert metrics["baseline"]["rmse"] == round(baseline["rmse"], 3)
    assert metrics["xgboost"]["mae"] == round(ml["mae"], 3)
    assert metrics["xgboost"]["rmse"] == round(ml["rmse"], 3)
    assert metrics["evaluation"]["test_rows"] == ml["test_size"]
    assert metrics["evaluation"]["target_weeks"] == [2, 3, 4, 5, 6]
    assert sum(w["n"] for w in metrics["by_week"]) == ml["test_size"]
    assert sum(p["n"] for p in metrics["by_position"]) == ml["test_size"]
    assert sum(c["n"] for c in metrics["calibration"]) == ml["test_size"]
    total = sum(f["importance"] for f in metrics["feature_importance"])
    assert math.isclose(total, 1.0, abs_tol=0.01)


def test_projections(output):
    _, files = output
    proj = files["projections.json"]
    players = proj["players"]
    assert proj["count"] == len(players) > 0
    points = [p["projected_points"] for p in players]
    assert points == sorted(points, reverse=True)
    required = {
        "player_id", "name", "position", "team", "opponent", "home",
        "on_bye", "data_week", "projected_points", "position_rank",
        "recent_avg", "last_week_points", "season_ppr", "games", "usage",
    }
    for p in players:
        assert required <= set(p)
        assert p["position"] in {"RB", "WR", "TE"}
        assert p["data_week"] >= 5
        assert p["on_bye"] == (p["team"] in {"EEE", "FFF"})
        if not p["on_bye"]:
            assert p["opponent"] in TEAMS


def test_breakouts_follow_criteria(output):
    _, files = output
    for p in files["breakouts.json"]["players"]:
        assert p["projected_points"] >= 7
        assert p["projection_gain"] >= 2
        assert 0 <= p["breakout_score"] <= 100


def test_waivers_exclude_likely_rostered(output):
    _, files = output
    waivers = files["waivers.json"]
    proj = {p["player_id"]: p for p in files["projections.json"]["players"]}
    cutoffs = waivers["availability"]["rostered_cutoffs"]
    for position, cutoff in cutoffs.items():
        ranked = sorted(
            (p for p in proj.values() if p["position"] == position),
            key=lambda p: p["season_ppr"],
            reverse=True,
        )[:cutoff]
        top_ids = {p["player_id"] for p in ranked}
        assert not top_ids & {p["player_id"] for p in waivers["players"]}
    scores = [p["waiver_score"] for p in waivers["players"]]
    assert scores == sorted(scores, reverse=True)
    for p in waivers["players"]:
        assert p["projected_points"] >= 5
        assert p["sleeper_adds_48h"] is None
