import nflreadpy as nfl

from config import DATA_SEASONS


def load_player_stats(seasons=None):
    if seasons is None:
        seasons = DATA_SEASONS

    print(f"Loading NFL player data for {seasons}...")

    stats = nfl.load_player_stats(seasons)

    return stats.to_pandas()


def load_schedule(season):
    return nfl.load_schedules([season]).to_pandas()
