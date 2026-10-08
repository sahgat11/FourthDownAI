import numpy as np


def calculate_breakout_scores(predictions):
    players = predictions.copy()

    # How much better the model expects a player
    # to perform compared with recent production
    players["projection_gain"] = (
        players["projected_points"]
        - players["fantasy_points_ppr_avg_3"]
    )

    # Only keep players who are actually projected
    # to improve by a meaningful amount
    players = players[
        (players["projected_points"] >= 7)
        & (players["projection_gain"] >= 2)
    ].copy()

    # Keep only positive usage growth
    players["positive_opportunity_change"] = (
        players["opportunity_change"]
        .fillna(0)
        .clip(lower=0)
    )

    players["positive_target_share_change"] = (
        players["target_share_change"]
        .fillna(0)
        .clip(lower=0)
    )

    def normalize(series):
        minimum = series.min()
        maximum = series.max()

        if maximum == minimum:
            return np.zeros(len(series))

        return (
            (series - minimum)
            / (maximum - minimum)
        )

    # Normalize each metric to 0-1
    players["gain_score"] = normalize(
        players["projection_gain"]
    )

    players["projection_score"] = normalize(
        players["projected_points"]
    )

    players["opportunity_score"] = normalize(
        players["positive_opportunity_change"]
    )

    players["target_share_score"] = normalize(
        players["positive_target_share_change"]
    )

    # FourthDown AI breakout score
    #
    # Projection gain matters most because we want
    # players expected to outperform recent production.
    players["breakout_score"] = (
        0.45 * players["gain_score"]
        + 0.20 * players["projection_score"]
        + 0.25 * players["opportunity_score"]
        + 0.10 * players["target_share_score"]
    ) * 100

    players["breakout_score"] = (
        players["breakout_score"]
        .round(1)
    )

    return players.sort_values(
        "breakout_score",
        ascending=False
    )