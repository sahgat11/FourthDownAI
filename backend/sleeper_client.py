import json
import time
from pathlib import Path

import requests


BASE_URL = "https://api.sleeper.app/v1"

PROJECT_ROOT = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)

PLAYER_CACHE_FILE = (
    PROJECT_ROOT
    / "data"
    / "sleeper_players.json"
)

PLAYER_CACHE_SECONDS = 24 * 60 * 60


def make_request(endpoint):
    url = f"{BASE_URL}{endpoint}"

    response = requests.get(
        url,
        timeout=30
    )

    response.raise_for_status()

    return response.json()


def get_user(username):
    return make_request(
        f"/user/{username}"
    )


def get_user_leagues(
    user_id,
    season=2026
):
    return make_request(
        f"/user/{user_id}/leagues/nfl/{season}"
    )


def get_league(league_id):
    return make_request(
        f"/league/{league_id}"
    )


def get_rosters(league_id):
    return make_request(
        f"/league/{league_id}/rosters"
    )


def get_league_users(league_id):
    return make_request(
        f"/league/{league_id}/users"
    )


def get_nfl_players(
    force_refresh=False
):
    PLAYER_CACHE_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    if (
        PLAYER_CACHE_FILE.exists()
        and not force_refresh
    ):
        file_age = (
            time.time()
            - PLAYER_CACHE_FILE.stat().st_mtime
        )

        if file_age < PLAYER_CACHE_SECONDS:
            with open(
                PLAYER_CACHE_FILE,
                "r"
            ) as file:
                return json.load(file)

    print(
        "Downloading Sleeper NFL "
        "player directory..."
    )

    players = make_request(
        "/players/nfl"
    )

    with open(
        PLAYER_CACHE_FILE,
        "w"
    ) as file:
        json.dump(
            players,
            file
        )

    return players


def get_owned_player_ids(
    league_id
):
    rosters = get_rosters(
        league_id
    )

    owned_players = set()

    for roster in rosters:
        player_groups = [
            roster.get("players"),
            roster.get("reserve"),
            roster.get("taxi"),
        ]

        for group in player_groups:
            if not group:
                continue

            for player_id in group:
                owned_players.add(
                    str(player_id)
                )

    return owned_players


def print_user_leagues(
    username,
    season=2026
):
    user = get_user(
        username
    )

    if not user:
        print(
            f"Sleeper user "
            f"'{username}' not found."
        )

        return []

    user_id = user["user_id"]

    print()
    print(
        f"Sleeper user: "
        f"{user.get('display_name', username)}"
    )

    print(
        f"User ID: {user_id}"
    )

    leagues = get_user_leagues(
        user_id,
        season
    )

    print()
    print(
        f"Found {len(leagues)} "
        f"NFL league(s) for {season}."
    )

    print()

    for index, league in enumerate(
        leagues,
        start=1
    ):
        print(
            f"{index}. "
            f"{league['name']}"
        )

        print(
            f"   League ID: "
            f"{league['league_id']}"
        )

        print(
            f"   Teams: "
            f"{league.get('total_rosters')}"
        )

        print(
            f"   Status: "
            f"{league.get('status')}"
        )

        print()

    return leagues