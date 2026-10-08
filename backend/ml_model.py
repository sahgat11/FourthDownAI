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


def train_and_evaluate(
    features,
    test_season=2026
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

    X_train = train[
        FEATURE_COLUMNS
    ].fillna(0)

    y_train = train[
        "next_week_fantasy_points"
    ]

    X_test = test[
        FEATURE_COLUMNS
    ].fillna(0)

    y_test = test[
        "next_week_fantasy_points"
    ]

    model = XGBRegressor(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
    )

    model.fit(
        X_train,
        y_train
    )

    predictions = model.predict(
        X_test
    )

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    rmse = (
        mean_squared_error(
            y_test,
            predictions
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
            "feature": FEATURE_COLUMNS,
            "importance":
                model.feature_importances_,
        }
    ).sort_values(
        "importance",
        ascending=False
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
def train_production_model(features):
    training_data = features[
        features[
            "next_week_fantasy_points"
        ].notna()
    ].copy()

    X_train = training_data[
        FEATURE_COLUMNS
    ].fillna(0)

    y_train = training_data[
        "next_week_fantasy_points"
    ]

    model = XGBRegressor(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
    )

    model.fit(
        X_train,
        y_train
    )

    return model


def predict_next_week(
    features,
    model,
    season=2026
):
    season_data = features[
        features["season"] == season
    ].copy()

    latest_rows = (
        season_data
        .sort_values(
            [
                "player_id",
                "week",
            ]
        )
        .groupby(
            "player_id"
        )
        .tail(1)
        .copy()
    )

    X_latest = latest_rows[
        FEATURE_COLUMNS
    ].fillna(0)

    latest_rows[
        "projected_points"
    ] = model.predict(
        X_latest
    )

    return latest_rows