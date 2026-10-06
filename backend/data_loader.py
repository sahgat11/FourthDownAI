import nflreadpy as nfl


def load_player_stats(season):
    print(f"Loading {season} NFL player data...")

    stats = nfl.load_player_stats(
        [season]
    )

    stats = stats.to_pandas()

    return stats


def get_fantasy_players(stats):
    fantasy_positions = [
        "QB",
        "RB",
        "WR",
        "TE",
    ]

    players = stats[
        stats["position"].isin(
            fantasy_positions
        )
    ].copy()

    columns = [
        "player_display_name",
        "position",
        "team",
        "opponent_team",
        "week",
        "fantasy_points",
        "fantasy_points_ppr",
    ]

    return players[columns]