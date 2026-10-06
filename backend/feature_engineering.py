import pandas as pd


SKILL_POSITIONS = [
    "RB",
    "WR",
    "TE",
]


ROLLING_COLUMNS = [
    "fantasy_points_ppr",
    "carries",
    "rushing_yards",
    "rushing_tds",
    "targets",
    "receptions",
    "receiving_yards",
    "receiving_tds",
    "receiving_air_yards",
    "target_share",
    "air_yards_share",
    "wopr",
]


def build_features(stats):
    players = stats[
        stats["position"].isin(
            SKILL_POSITIONS
        )
    ].copy()

    players = players.sort_values(
        [
            "player_id",
            "season",
            "week",
        ]
    )

    # Basic opportunity statistics
    players["opportunities"] = (
        players["carries"]
        + players["targets"]
    )

    players["total_yards"] = (
        players["rushing_yards"]
        + players["receiving_yards"]
    )

    # Rolling 3-game averages
    for column in ROLLING_COLUMNS:
        players[
            f"{column}_avg_3"
        ] = (
            players
            .groupby(
                [
                    "player_id",
                    "season",
                ]
            )[column]
            .transform(
                lambda values:
                values.rolling(
                    window=3,
                    min_periods=1
                ).mean()
            )
        )

    players[
        "opportunities_avg_3"
    ] = (
        players
        .groupby(
            [
                "player_id",
                "season",
            ]
        )["opportunities"]
        .transform(
            lambda values:
            values.rolling(
                3,
                min_periods=1
            ).mean()
        )
    )

    # Changes in usage can help detect breakouts
    players[
        "target_share_change"
    ] = (
        players
        .groupby(
            [
                "player_id",
                "season",
            ]
        )["target_share"]
        .diff()
    )

    players[
        "opportunity_change"
    ] = (
        players
        .groupby(
            [
                "player_id",
                "season",
            ]
        )["opportunities"]
        .diff()
    )

    # What we want the model to predict:
    # next week's PPR fantasy points
    players[
        "next_week_fantasy_points"
    ] = (
        players
        .groupby(
            [
                "player_id",
                "season",
            ]
        )["fantasy_points_ppr"]
        .shift(-1)
    )

    return players