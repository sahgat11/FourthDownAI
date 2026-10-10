import pandas as pd

from waiver_engine import (
    create_player_key,
)


def get_full_name(player):
    full_name = player.get(
        "full_name"
    )

    if full_name:
        return full_name

    first_name = (
        player.get(
            "first_name"
        )
        or ""
    )

    last_name = (
        player.get(
            "last_name"
        )
        or ""
    )

    return (
        f"{first_name} {last_name}"
        .strip()
    )


def build_prediction_lookups(
    predictions
):
    id_lookup = {}
    name_lookup = {}

    for _, row in predictions.iterrows():
        player_id = row.get(
            "player_id"
        )

        if pd.notna(player_id):
            id_lookup[
                str(player_id)
            ] = row

        key = create_player_key(
            row[
                "player_display_name"
            ],
            row[
                "position"
            ]
        )

        name_lookup[
            key
        ] = row

    return (
        id_lookup,
        name_lookup,
    )


def find_prediction(
    sleeper_player,
    name,
    position,
    id_lookup,
    name_lookup
):
    gsis_id = sleeper_player.get(
        "gsis_id"
    )

    if gsis_id:
        prediction = id_lookup.get(
            str(gsis_id)
        )

        if prediction is not None:
            return (
                prediction,
                "GSIS"
            )

    key = create_player_key(
        name,
        position
    )

    prediction = name_lookup.get(
        key
    )

    if prediction is not None:
        return (
            prediction,
            "NAME"
        )

    return (
        None,
        "NONE"
    )


def build_team_roster(
    roster,
    league,
    sleeper_players,
    predictions
):
    (
        id_lookup,
        name_lookup,
    ) = build_prediction_lookups(
        predictions
    )

    player_ids = (
        roster.get(
            "players"
        )
        or []
    )

    starter_ids = [
        str(player_id)
        for player_id
        in (
            roster.get(
                "starters"
            )
            or []
        )
        if str(player_id) != "0"
    ]

    reserve_ids = {
        str(player_id)
        for player_id
        in (
            roster.get(
                "reserve"
            )
            or []
        )
    }

    roster_positions = (
        league.get(
            "roster_positions"
        )
        or []
    )

    starter_slots = [
        position
        for position
        in roster_positions
        if position
        not in {
            "BN",
            "IR",
            "TAXI",
        }
    ]

    starter_slot_map = {}

    for index, player_id in enumerate(
        starter_ids
    ):
        if index < len(
            starter_slots
        ):
            starter_slot_map[
                player_id
            ] = starter_slots[
                index
            ]

        else:
            starter_slot_map[
                player_id
            ] = "START"

    rows = []

    for player_id in player_ids:
        player_id = str(
            player_id
        )

        sleeper_player = (
            sleeper_players.get(
                player_id
            )
        )

        if not sleeper_player:
            continue

        name = get_full_name(
            sleeper_player
        )

        position = (
            sleeper_player.get(
                "position"
            )
            or ""
        )

        nfl_team = (
            sleeper_player.get(
                "team"
            )
            or "FA"
        )

        (
            prediction,
            match_method,
        ) = find_prediction(
            sleeper_player,
            name,
            position,
            id_lookup,
            name_lookup,
        )

        projected_points = None
        recent_average = None
        data_week = None

        if prediction is not None:
            projected_points = float(
                prediction[
                    "projected_points"
                ]
            )

            recent_average = float(
                prediction[
                    "fantasy_points_ppr_avg_3"
                ]
            )

            data_week = int(
                prediction[
                    "week"
                ]
            )

        if player_id in reserve_ids:
            roster_status = "IR"
            slot = "IR"

        elif player_id in starter_ids:
            roster_status = (
                "Starter"
            )

            slot = (
                starter_slot_map.get(
                    player_id,
                    "START"
                )
            )

        else:
            roster_status = "Bench"
            slot = "BN"

        rows.append(
            {
                "player_id":
                    player_id,
                "player":
                    name,
                "position":
                    position,
                "team":
                    nfl_team,
                "slot":
                    slot,
                "roster_status":
                    roster_status,
                "recent_avg":
                    recent_average,
                "projected_points":
                    projected_points,
                "data_week":
                    data_week,
                "match_method":
                    match_method,
            }
        )

    team = pd.DataFrame(
        rows
    )

    if team.empty:
        return team

    status_order = {
        "Starter": 0,
        "Bench": 1,
        "IR": 2,
    }

    team[
        "status_order"
    ] = team[
        "roster_status"
    ].map(
        status_order
    )

    team = team.sort_values(
        [
            "status_order",
            "position",
            "player",
        ]
    )

    team = team.drop(
        columns=[
            "status_order"
        ]
    )

    return team