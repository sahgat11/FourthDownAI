from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
)


def evaluate_baseline(
    features,
    test_season=2026
):
    test_data = features[
        (
            features["season"]
            == test_season
        )
        & (
            features[
                "next_week_fantasy_points"
            ].notna()
        )
    ].copy()

    actual = test_data[
        "next_week_fantasy_points"
    ]

    predictions = test_data[
        "fantasy_points_ppr_avg_3"
    ]

    mae = mean_absolute_error(
        actual,
        predictions
    )

    rmse = (
        mean_squared_error(
            actual,
            predictions
        )
        ** 0.5
    )

    test_data[
        "baseline_prediction"
    ] = predictions

    test_data[
        "absolute_error"
    ] = (
        test_data[
            "next_week_fantasy_points"
        ]
        - test_data[
            "baseline_prediction"
        ]
    ).abs()

    return {
        "mae": mae,
        "rmse": rmse,
        "predictions": test_data,
    }