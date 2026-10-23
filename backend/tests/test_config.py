from datetime import date

from config import current_nfl_season


def test_season_rolls_over_in_september():
    assert current_nfl_season(date(2026, 10, 22)) == 2026
    assert current_nfl_season(date(2027, 1, 15)) == 2026  # playoffs belong to the 2026 season
    assert current_nfl_season(date(2027, 9, 1)) == 2027
