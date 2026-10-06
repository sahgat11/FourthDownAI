import nflreadpy as nfl


def load_player_stats(
    seasons=None
):
    if seasons is None:
        seasons = [
            2023,
            2024,
            2025,
            2026,
        ]

    print(
        "Loading NFL player data "
        f"for {seasons}..."
    )

    stats = nfl.load_player_stats(
        seasons
    )

    return stats.to_pandas()