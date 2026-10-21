"""
League-independent analysis pipeline.

This is the single place that loads data, evaluates the baseline and
XGBoost models on the held-out season, trains the production model and
builds the projection pool and breakout list. The CLI (main.py), the
FastAPI service (analysis_service.py) and the static precompute
(precompute.py) all call build_base_analysis() so they can never drift.
"""

from baseline_model import evaluate_baseline
from breakout_engine import calculate_breakout_scores
from config import SEASON
from data_loader import load_player_stats
from feature_engineering import build_features
from ml_model import (
    predict_next_week,
    predict_player_pool,
    train_and_evaluate,
    train_production_model,
)
from week_utils import get_latest_complete_week


def mae_improvement_percent(baseline, ml):
    return (baseline["mae"] - ml["mae"]) / baseline["mae"] * 100


def build_base_analysis(stats=None, season=SEASON):
    """
    Run the full league-independent pipeline.

    `stats` may be passed in (e.g. from a cached parquet file);
    otherwise it is loaded from nflverse.
    """

    if stats is None:
        stats = load_player_stats()

    features = build_features(stats)

    completed_week = get_latest_complete_week(features, season=season)

    baseline = evaluate_baseline(
        features,
        test_season=season,
        max_target_week=completed_week,
    )

    ml = train_and_evaluate(
        features,
        test_season=season,
        max_target_week=completed_week,
    )

    production_model = train_production_model(
        features,
        season=season,
        completed_week=completed_week,
    )

    # Rows from the latest completed week only (used for breakouts).
    predictions = predict_next_week(
        features,
        production_model,
        season=season,
        completed_week=completed_week,
    )

    # Each player's most recent row (used for projections / waivers).
    player_pool = predict_player_pool(
        features,
        production_model,
        season=season,
        completed_week=completed_week,
    )

    breakouts = calculate_breakout_scores(predictions)

    return {
        "season": season,
        "completed_week": completed_week,
        "stats": stats,
        "features": features,
        "baseline": baseline,
        "ml": ml,
        "model_improvement": mae_improvement_percent(baseline, ml),
        "production_model": production_model,
        "predictions": predictions,
        "player_pool": player_pool,
        "breakouts": breakouts,
    }
