import pandas as pd

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
)

from xgboost import XGBRegressor


FEATURE_COLUMNS = [
    "fantasy_points_ppr_avg_3",
    "carries_avg_3",
    "rushing_yards_avg_3",
    "rushing_tds_avg_3",
    "targets_avg_3",
    "receptions_avg_3",
    "receiving_yards_avg_3",
    "receiving_tds_avg_3",
    "receiving_air_yards_avg_3",
    "target_share_avg_3",
    "air_yards_share_avg_3",
    "wopr_avg_3",
    "opportunities_avg_3",
    "target_share_change",
    "opportunity_change",
]


def create_model():
    return XGBRegressor(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
    )


def train_and_evaluate(
    features,
    test_season=2026,
    max_target_week=None,
):
    data = features[
        features[
            "next_week_fantasy_points"
        ].notna()
    ].copy()

    train = data[
        data["season"] < test_season
    ].copy()

    test = data[
        data["season"] == test_season
    ].copy()

    # Avoid evaluating against results from
    # a week that is only partially complete.
    if max_target_week is not None:
        test = test[
            test["week"]
            < max_target_week
        ].copy()

    X_train = (
        train[
            FEATURE_COLUMNS
        ]
        .fillna(0)
    )

    y_train = train[
        "next_week_fantasy_points"
    ]

    X_test = (
        test[
            FEATURE_COLUMNS
        ]
        .fillna(0)
    )

    y_test = test[
        "next_week_fantasy_points"
    ]

    model = create_model()

    model.fit(
        X_train,
        y_train,
    )

    predictions = model.predict(
        X_test
    )

    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    rmse = (
        mean_squared_error(
            y_test,
            predictions,
        )
        ** 0.5
    )

    test[
        "ml_prediction"
    ] = predictions

    test[
        "ml_error"
    ] = (
        test[
            "next_week_fantasy_points"
        ]
        - test[
            "ml_prediction"
        ]
    ).abs()

    importance = pd.DataFrame(
        {
            "feature":
                FEATURE_COLUMNS,
            "importance":
                model.feature_importances_,
        }
    ).sort_values(
        "importance",
        ascending=False,
    )

    return {
        "model": model,
        "mae": mae,
        "rmse": rmse,
        "predictions": test,
        "importance": importance,
        "train_size": len(train),
        "test_size": len(test),
    }


def train_production_model(
    features,
    season=2026,
    completed_week=None,
):
    training_data = features[
        features[
            "next_week_fantasy_points"
        ].notna()
    ].copy()

    # Prevent partially completed weeks
    # from leaking future results into
    # the production model.
    if completed_week is not None:
        training_data = training_data[
            (
                training_data["season"]
                < season
            )
            |
            (
                (
                    training_data["season"]
                    == season
                )
                &
                (
                    training_data["week"]
                    < completed_week
                )
            )
        ].copy()

    X_train = (
        training_data[
            FEATURE_COLUMNS
        ]
        .fillna(0)
    )

    y_train = training_data[
        "next_week_fantasy_points"
    ]

    model = create_model()

    model.fit(
        X_train,
        y_train,
    )

    return model


def add_predictions(
    rows,
    model,
):
    rows = rows.copy()

    if rows.empty:
        rows[
            "projected_points"
        ] = []

        return rows

    X = (
        rows[
            FEATURE_COLUMNS
        ]
        .fillna(0)
    )

    rows[
        "projected_points"
    ] = model.predict(
        X
    )

    return rows


def predict_next_week(
    features,
    model,
    season=2026,
    completed_week=None,
):
    season_data = features[
        features["season"]
        == season
    ].copy()

    if season_data.empty:
        raise ValueError(
            f"No data found for season {season}."
        )

    if completed_week is None:
        completed_week = int(
            season_data["week"].max()
        )

    week_rows = season_data[
        season_data["week"]
        == completed_week
    ].copy()

    return add_predictions(
        week_rows,
        model,
    )


def predict_player_pool(
    features,
    model,
    season=2026,
    completed_week=None,
):
    season_data = features[
        features["season"]
        == season
    ].copy()

    if season_data.empty:
        raise ValueError(
            f"No data found for season {season}."
        )

    # Ignore data after the last
    # completed NFL week.
    if completed_week is not None:
        season_data = season_data[
            season_data["week"]
            <= completed_week
        ].copy()

    # For roster analysis, use each
    # player's latest available game.
    latest_rows = (
        season_data
        .sort_values(
            [
                "player_id",
                "week",
            ]
        )
        .groupby(
            "player_id",
            as_index=False,
        )
        .tail(1)
        .copy()
    )

    return add_predictions(
        latest_rows,
        model,
    )