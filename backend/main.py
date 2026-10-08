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

    # Train model on every week for which
    # the following week's result is known.
    production_model = (
        train_production_model(
            features
        )
    )

    predictions = predict_next_week(
        features,
        production_model,
        season=2026
    )

    breakouts = (
        calculate_breakout_scores(
            predictions
        )
    )

    print()
    print("BREAKOUT WATCH")
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

    print(
        top_breakouts.to_string(
            index=False
        )
    )


if __name__ == "__main__":
    main()