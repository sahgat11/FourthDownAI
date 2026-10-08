import pandas as pd


def percentile_by_position(
    players,
    column
):
    return (
        players
        .groupby("position")[column]
        .rank(
            pct=True,
            method="average"
        )
    )


def calculate_breakout_scores(
    predictions
):
    players = predictions.copy()

    players[
        "projection_gain"
    ] = (
        players["projected_points"]
        - players[
            "fantasy_points_ppr_avg_3"
        ]
    )

    # Only include legitimate breakout candidates.
    players = players[
        (
            players["projected_points"]
            >= 7
        )
        & (
            players["projection_gain"]
            >= 2
        )
    ].copy()

    players[
        "positive_opportunity_change"
    ] = (
        players[
            "opportunity_change"
        ]
        .fillna(0)
        .clip(lower=0)
    )

    players[
        "positive_target_share_change"
    ] = (
        players[
            "target_share_change"
        ]
        .fillna(0)
        .clip(lower=0)
    )

    # Compare players against others
    # at the same fantasy position.
    players[
        "gain_score"
    ] = percentile_by_position(
        players,
        "projection_gain"
    )

    players[
        "projection_score"
    ] = percentile_by_position(
        players,
        "projected_points"
    )

    players[
        "opportunity_score"
    ] = percentile_by_position(
        players,
        "positive_opportunity_change"
    )

    players[
        "target_share_score"
    ] = percentile_by_position(
        players,
        "positive_target_share_change"
    )

    # Breakout score:
    # improvement matters most,
    # followed by growing opportunity.
    players[
        "breakout_score"
    ] = (
        0.45
        * players["gain_score"]
        + 0.20
        * players["projection_score"]
        + 0.25
        * players["opportunity_score"]
        + 0.10
        * players["target_share_score"]
    ) * 100

    players[
        "breakout_score"
    ] = (
        players[
            "breakout_score"
        ]
        .round(1)
    )

    return players.sort_values(
        [
            "breakout_score",
            "projected_points",
        ],
        ascending=[
            False,
            False,
        ]
    )