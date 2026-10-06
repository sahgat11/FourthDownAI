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
    print("=" * 60)

    print()
    print("MODEL COMPARISON")
    print("-" * 60)

    print(
        f"Training records: "
        f"{ml['train_size']}"
    )

    print(
        f"Test records:     "
        f"{ml['test_size']}"
    )

    print()

    print(
        f"Baseline MAE: "
        f"{baseline['mae']:.2f}"
    )

    print(
        f"XGBoost MAE:  "
        f"{ml['mae']:.2f}"
    )

    print()

    print(
        f"Baseline RMSE: "
        f"{baseline['rmse']:.2f}"
    )

    print(
        f"XGBoost RMSE:  "
        f"{ml['rmse']:.2f}"
    )

    improvement = (
        (
            baseline["mae"]
            - ml["mae"]
        )
        / baseline["mae"]
        * 100
    )

    print()
    print(
        f"MAE improvement: "
        f"{improvement:.1f}%"
    )

    print()
    print("Most important features:")
    print()

    print(
        ml["importance"]
        .head(10)
        .to_string(
            index=False
        )
    )

    print()
    print("Largest XGBoost misses:")
    print()

    columns = [
        "player_display_name",
        "position",
        "week",
        "ml_prediction",
        "next_week_fantasy_points",
        "ml_error",
    ]

    print(
        ml["predictions"]
        .sort_values(
            "ml_error",
            ascending=False
        )
        .head(10)
        [columns]
        .to_string(
            index=False
        )
    )


if __name__ == "__main__":
    main()