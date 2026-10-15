def get_latest_complete_week(
    features,
    season=2026,
    completeness_threshold=0.75,
):
    season_data = features[
        features["season"] == season
    ].copy()

    if season_data.empty:
        raise ValueError(
            f"No data found for season {season}."
        )

    weekly_counts = (
        season_data
        .groupby("week")
        .agg(
            player_count=(
                "player_id",
                "nunique",
            ),
            team_count=(
                "team",
                "nunique",
            ),
        )
        .sort_index()
    )

    weeks = list(
        weekly_counts.index
    )

    if len(weeks) == 1:
        return int(
            weeks[0]
        )

    for index in range(
        len(weeks) - 1,
        0,
        -1,
    ):
        candidate_week = (
            weeks[index]
        )

        history_start = max(
            0,
            index - 3,
        )

        history_weeks = weeks[
            history_start:index
        ]

        if not history_weeks:
            return int(
                candidate_week
            )

        reference_players = (
            weekly_counts
            .loc[
                history_weeks,
                "player_count",
            ]
            .median()
        )

        reference_teams = (
            weekly_counts
            .loc[
                history_weeks,
                "team_count",
            ]
            .median()
        )

        candidate_players = (
            weekly_counts.loc[
                candidate_week,
                "player_count",
            ]
        )

        candidate_teams = (
            weekly_counts.loc[
                candidate_week,
                "team_count",
            ]
        )

        player_ratio = (
            candidate_players
            / reference_players
        )

        team_ratio = (
            candidate_teams
            / reference_teams
        )

        if (
            player_ratio
            >= completeness_threshold
            and team_ratio
            >= completeness_threshold
        ):
            return int(
                candidate_week
            )

    return int(
        weeks[0]
    )