from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
)


def evaluate_baseline(
    features,
    test_season=2026,
    max_target_week=None,
):
    data = features[
        features[
            "next_week_fantasy_points"
        ].notna()
    ].copy()

    test = data[
        data["season"] == test_season
    ].copy()

    # Row from Week N predicts Week N+1.
    #
    # If Week 5 is the latest fully completed
    # week, then Week 4 is the final row whose
    # next-week result is completely known.
    if max_target_week is not None:
        test = test[
            test["week"]
            < max_target_week
        ].copy()

    if test.empty:
        raise ValueError(
            "No valid baseline test "
            "records were found."
        )

    predictions = test[
        "fantasy_points_ppr_avg_3"
    ]

    actual = test[
        "next_week_fantasy_points"
    ]

    mae = mean_absolute_error(
        actual,
        predictions,
    )

    rmse = (
        mean_squared_error(
            actual,
            predictions,
        )
        ** 0.5
    )

    test[
        "baseline_prediction"
    ] = predictions

    test[
        "baseline_error"
    ] = (
        actual
        - predictions
    ).abs()

    return {
        "mae": mae,
        "rmse": rmse,
        "predictions": test,
        "test_size": len(test),
    }