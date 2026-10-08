from data_loader import (
    load_player_stats,
)

from feature_engineering import (
    build_features,
)

from baseline_model import (
    evaluate_baseline,
)

from ml_model import (
    train_and_evaluate,
    train_production_model,
    predict_next_week,
)

from breakout_engine import (
    calculate_breakout_scores,
)


def main():
    stats = load_player_stats()

    features = build_features(
        stats
    )

    # Evaluate our ML model against
    # the simple 3-game-average baseline.
    baseline = evaluate_baseline(
        features,
        test_season=2026
    )

    ml = train_and_evaluate(
        features,
        test_season=2026
    )

    print()
    print("FourthDown AI")
    print("=" * 70)

    print()
    print("MODEL PERFORMANCE")
    print("-" * 70)

    print(
        f"Baseline MAE: "
        f"{baseline['mae']:.2f}"
    )

    print(
        f"XGBoost MAE:  "
        f"{ml['mae']:.2f}"
    )

    improvement = (
        (
            baseline["mae"]
            - ml["mae"]
        )
        / baseline["mae"]
        * 100
    )

    print(
        f"Improvement:  "
        f"{improvement:.1f}%"
    )

    # Train a production model using
    # every player-week whose next-week
    # outcome is already known.
    production_model = (
        train_production_model(
            features
        )
    )

    # Generate predictions using only
    # the latest available NFL week.
    predictions = predict_next_week(
        features,
        production_model,
        season=2026
    )

    current_week = int(
        predictions[
            "week"
        ].max()
    )

    breakouts = (
        calculate_breakout_scores(
            predictions
        )
    )

    print()
    print(
        f"BREAKOUT WATCH - "
        f"AFTER WEEK {current_week}"
    )

    print("-" * 70)

    columns = [
        "player_display_name",
        "position",
        "team",
        "week",
        "fantasy_points_ppr_avg_3",
        "projected_points",
        "projection_gain",
        "breakout_score",
    ]

    top_breakouts = (
        breakouts[
            columns
        ]
        .head(15)
        .copy()
    )

    top_breakouts.columns = [
        "Player",
        "Pos",
        "Team",
        "Week",
        "Last 3 Avg",
        "Projection",
        "Expected Gain",
        "Breakout Score",
    ]

    print()

    print(
        top_breakouts.to_string(
            index=False
        )
    )


if __name__ == "__main__":
    main()