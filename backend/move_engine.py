import pandas as pd

from waiver_engine import (
    create_player_key,
)


SKILL_POSITIONS = {
    "RB",
    "WR",
    "TE",
}

FLEX_POSITIONS = {
    "RB",
    "WR",
    "TE",
}


def get_slot_requirements(team):
    starters = team[
        team["roster_status"]
        == "Starter"
    ].copy()

    requirements = {
        "RB": 0,
        "WR": 0,
        "TE": 0,
        "FLEX": 0,
    }

    for slot in starters["slot"]:
        if slot in requirements:
            requirements[slot] += 1

    return requirements


def optimize_skill_lineup(
    players,
    requirements,
):
    available = players[
        (
            players[
                "position"
            ].isin(
                SKILL_POSITIONS
            )
        )
        & (
            players[
                "projected_points"
            ].notna()
        )
    ].copy()

    if available.empty:
        return (
            0.0,
            pd.DataFrame(),
        )

    available[
        "projected_points"
    ] = available[
        "projected_points"
    ].astype(float)

    selected_ids = set()
    lineup_rows = []

    for position in [
        "RB",
        "WR",
        "TE",
    ]:
        needed = requirements.get(
            position,
            0,
        )

        candidates = available[
            (
                available[
                    "position"
                ]
                == position
            )
            & (
                ~available[
                    "player_id"
                ]
                .astype(str)
                .isin(
                    selected_ids
                )
            )
        ].sort_values(
            "projected_points",
            ascending=False,
        )

        chosen = candidates.head(
            needed
        )

        for _, player in (
            chosen.iterrows()
        ):
            player_copy = (
                player.to_dict()
            )

            player_copy[
                "optimized_slot"
            ] = position

            lineup_rows.append(
                player_copy
            )

            selected_ids.add(
                str(
                    player[
                        "player_id"
                    ]
                )
            )

    flex_needed = requirements.get(
        "FLEX",
        0,
    )

    flex_candidates = available[
        (
            available[
                "position"
            ].isin(
                FLEX_POSITIONS
            )
        )
        & (
            ~available[
                "player_id"
            ]
            .astype(str)
            .isin(
                selected_ids
            )
        )
    ].sort_values(
        "projected_points",
        ascending=False,
    )

    flex_chosen = (
        flex_candidates.head(
            flex_needed
        )
    )

    for _, player in (
        flex_chosen.iterrows()
    ):
        player_copy = (
            player.to_dict()
        )

        player_copy[
            "optimized_slot"
        ] = "FLEX"

        lineup_rows.append(
            player_copy
        )

        selected_ids.add(
            str(
                player[
                    "player_id"
                ]
            )
        )

    lineup = pd.DataFrame(
        lineup_rows
    )

    if lineup.empty:
        return (
            0.0,
            lineup,
        )

    total_projection = float(
        lineup[
            "projected_points"
        ].sum()
    )

    return (
        total_projection,
        lineup,
    )


def calculate_depth_risk(
    roster,
    requirements,
):
    risk = 0

    for position in [
        "RB",
        "WR",
        "TE",
    ]:
        required_starters = (
            requirements.get(
                position,
                0,
            )
        )

        if required_starters == 0:
            continue

        current_count = len(
            roster[
                roster[
                    "position"
                ]
                == position
            ]
        )

        desired_count = (
            required_starters
            + 1
        )

        shortage = max(
            0,
            desired_count
            - current_count,
        )

        risk += shortage

    return risk


def get_confidence(
    starter_gain,
    asset_gain,
):
    if (
        starter_gain >= 3.0
        or (
            starter_gain >= 2.0
            and asset_gain >= 3.0
        )
    ):
        return "HIGH"

    if (
        starter_gain >= 1.0
        or asset_gain >= 3.0
    ):
        return "MEDIUM"

    return "LOW"


def get_move_type(
    starter_gain,
):
    if starter_gain >= 0.5:
        return "STARTER UPGRADE"

    return "DEPTH UPGRADE"


def generate_reason(
    starter_gain,
    asset_gain,
    depth_penalty,
):
    if starter_gain >= 0.5:
        reason = (
            "Improves the optimized "
            "starting lineup by "
            f"{starter_gain:.2f} points."
        )

    else:
        reason = (
            "Improves roster depth by "
            f"{asset_gain:.2f} projected "
            "points."
        )

    if depth_penalty > 0:
        reason += (
            " Move slightly reduces "
            "positional depth."
        )

    return reason


def build_waiver_roster_row(
    waiver,
):
    name = waiver[
        "player_display_name"
    ]

    position = waiver[
        "position"
    ]

    return {
        "player_id":
            (
                f"waiver::"
                f"{name}::"
                f"{position}"
            ),
        "player":
            name,
        "position":
            position,
        "team":
            waiver["team"],
        "slot":
            "BN",
        "roster_status":
            "Bench",
        "recent_avg":
            waiver.get(
                "fantasy_points_ppr_avg_3"
            ),
        "projected_points":
            float(
                waiver[
                    "projected_points"
                ]
            ),
        "data_week":
            waiver.get("week"),
        "match_method":
            "WAIVER",
    }


def get_team_player_keys(
    team
):
    keys = set()

    for _, player in (
        team.iterrows()
    ):
        keys.add(
            create_player_key(
                player["player"],
                player["position"],
            )
        )

    return keys


def generate_add_drop_recommendations(
    team,
    waivers,
    max_recommendations=5,
):
    if (
        team.empty
        or waivers.empty
    ):
        return pd.DataFrame()

    # Final safety check:
    # never recommend a player who is
    # already on the user's roster.
    team_player_keys = (
        get_team_player_keys(
            team
        )
    )

    requirements = (
        get_slot_requirements(
            team
        )
    )

    (
        current_total,
        current_lineup,
    ) = optimize_skill_lineup(
        team,
        requirements,
    )

    current_depth_risk = (
        calculate_depth_risk(
            team,
            requirements,
        )
    )

    droppable = team[
        (
            team[
                "roster_status"
            ]
            == "Bench"
        )
        & (
            team[
                "position"
            ].isin(
                SKILL_POSITIONS
            )
        )
        & (
            team[
                "projected_points"
            ].notna()
        )
    ].copy()

    if droppable.empty:
        return pd.DataFrame()

    candidates = []

    for _, waiver in (
        waivers.iterrows()
    ):
        add_position = waiver[
            "position"
        ]

        add_player = waiver[
            "player_display_name"
        ]

        waiver_key = (
            create_player_key(
                add_player,
                add_position,
            )
        )

        # Defense in depth against
        # bad waiver matching.
        if (
            waiver_key
            in team_player_keys
        ):
            continue

        if (
            add_position
            not in SKILL_POSITIONS
        ):
            continue

        add_projection = waiver.get(
            "projected_points"
        )

        if pd.isna(
            add_projection
        ):
            continue

        add_projection = float(
            add_projection
        )

        waiver_row = (
            build_waiver_roster_row(
                waiver
            )
        )

        for _, drop in (
            droppable.iterrows()
        ):
            drop_projection = drop[
                "projected_points"
            ]

            if pd.isna(
                drop_projection
            ):
                continue

            drop_projection = float(
                drop_projection
            )

            drop_id = str(
                drop[
                    "player_id"
                ]
            )

            hypothetical = team[
                team[
                    "player_id"
                ]
                .astype(str)
                != drop_id
            ].copy()

            waiver_df = pd.DataFrame(
                [waiver_row]
            )

            hypothetical = pd.concat(
                [
                    hypothetical,
                    waiver_df,
                ],
                ignore_index=True,
            )

            (
                new_total,
                new_lineup,
            ) = optimize_skill_lineup(
                hypothetical,
                requirements,
            )

            starter_gain = (
                new_total
                - current_total
            )

            asset_gain = (
                add_projection
                - drop_projection
            )

            new_depth_risk = (
                calculate_depth_risk(
                    hypothetical,
                    requirements,
                )
            )

            added_depth_risk = max(
                0,
                new_depth_risk
                - current_depth_risk,
            )

            depth_penalty = (
                added_depth_risk
                * 2.5
            )

            breakout_score = float(
                waiver.get(
                    "breakout_score",
                    0,
                )
            )

            breakout_bonus = (
                breakout_score
                * 0.02
            )

            if (
                starter_gain < 0.5
                and asset_gain < 2.0
            ):
                continue

            move_score = (
                (
                    starter_gain
                    * 1.75
                )
                + (
                    max(
                        asset_gain,
                        0,
                    )
                    * 0.75
                )
                + breakout_bonus
                - depth_penalty
            )

            if move_score <= 0:
                continue

            candidates.append(
                {
                    "add_player":
                        add_player,
                    "add_position":
                        add_position,
                    "add_team":
                        waiver["team"],
                    "add_projection":
                        add_projection,
                    "breakout_score":
                        breakout_score,

                    "drop_player":
                        drop["player"],
                    "drop_position":
                        drop["position"],
                    "drop_team":
                        drop["team"],
                    "drop_projection":
                        drop_projection,

                    "starter_gain":
                        starter_gain,
                    "asset_gain":
                        asset_gain,

                    "depth_penalty":
                        depth_penalty,

                    "current_lineup_projection":
                        current_total,
                    "new_lineup_projection":
                        new_total,

                    "move_score":
                        move_score,

                    "move_type":
                        get_move_type(
                            starter_gain
                        ),

                    "confidence":
                        get_confidence(
                            starter_gain,
                            asset_gain,
                        ),

                    "reason":
                        generate_reason(
                            starter_gain,
                            asset_gain,
                            depth_penalty,
                        ),
                }
            )

    if not candidates:
        return pd.DataFrame()

    moves = pd.DataFrame(
        candidates
    )

    moves = moves.sort_values(
        [
            "move_score",
            "starter_gain",
            "asset_gain",
        ],
        ascending=[
            False,
            False,
            False,
        ]
    )

    selected = []

    used_adds = set()
    used_drops = set()

    for _, move in (
        moves.iterrows()
    ):
        add_player = move[
            "add_player"
        ]

        drop_player = move[
            "drop_player"
        ]

        if add_player in used_adds:
            continue

        if drop_player in used_drops:
            continue

        selected.append(
            move.to_dict()
        )

        used_adds.add(
            add_player
        )

        used_drops.add(
            drop_player
        )

        if (
            len(selected)
            >= max_recommendations
        ):
            break

    return pd.DataFrame(
        selected
    )