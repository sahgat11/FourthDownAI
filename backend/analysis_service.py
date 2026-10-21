import threading
from functools import lru_cache

from config import SEASON
from pipeline import build_base_analysis

from sleeper_client import (
    get_league,
    get_nfl_players,
    get_owned_player_ids,
    get_user,
    get_user_roster,
)

from waiver_engine import (
    find_available_players,
)

from team_engine import (
    build_team_roster,
)

from move_engine import (
    generate_add_drop_recommendations,
)


# Prevent multiple simultaneous API requests
# from rebuilding the ML pipeline at once.
_analysis_lock = threading.Lock()


@lru_cache(maxsize=1)
def _build_base_analysis():
    print(
        "Building FourthDown AI "
        "analysis cache..."
    )

    return build_base_analysis(
        season=SEASON,
    )


def get_base_analysis():
    """
    Return the cached league-independent
    analysis.

    The lock makes sure duplicate requests
    cannot train multiple models at once.
    """

    with _analysis_lock:
        return _build_base_analysis()


def get_waiver_analysis(
    league_id,
):
    base = get_base_analysis()

    league = get_league(
        league_id
    )

    owned_player_ids = (
        get_owned_player_ids(
            league_id
        )
    )

    sleeper_players = (
        get_nfl_players()
    )

    waivers = find_available_players(
        base["player_pool"],
        base["breakouts"],
        sleeper_players,
        owned_player_ids,
        base["completed_week"],
        min_projection=5.0,
        max_data_age_weeks=1,
    )

    return {
        "league":
            league,
        "sleeper_players":
            sleeper_players,
        "owned_player_ids":
            owned_player_ids,
        "waivers":
            waivers,
    }


def get_team_analysis(
    league_id,
    username,
):
    base = get_base_analysis()

    waiver_analysis = (
        get_waiver_analysis(
            league_id
        )
    )

    user = get_user(
        username
    )

    if not user:
        raise ValueError(
            f"Sleeper user "
            f"'{username}' not found."
        )

    roster = get_user_roster(
        league_id,
        user["user_id"],
    )

    if not roster:
        raise ValueError(
            "Could not find this "
            "user's roster in the "
            "selected league."
        )

    team = build_team_roster(
        roster,
        waiver_analysis["league"],
        waiver_analysis[
            "sleeper_players"
        ],
        base["player_pool"],
    )

    moves = (
        generate_add_drop_recommendations(
            team,
            waiver_analysis[
                "waivers"
            ],
            max_recommendations=5,
        )
    )

    return {
        "user":
            user,
        "roster":
            roster,
        "team":
            team,
        "moves":
            moves,
        "waivers":
            waiver_analysis[
                "waivers"
            ],
        "league":
            waiver_analysis[
                "league"
            ],
    }


def clear_analysis_cache():
    with _analysis_lock:
        _build_base_analysis.cache_clear()