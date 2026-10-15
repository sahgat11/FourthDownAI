import pandas as pd


SKILL_POSITIONS = {
    "RB",
    "WR",
    "TE",
}


def get_confidence(
    projected_gain
):
    if projected_gain >= 4:
        return "HIGH"

    if projected_gain >= 2.5:
        return "MEDIUM"

    return "LOW"


def generate_add_drop_recommendations(
    team,
    waivers,
    min_projected_gain=1.5,
    max_recommendations=5,
):
    if team.empty or waivers.empty:
        return pd.DataFrame()

    # For v1, only consider dropping
    # bench RB/WR/TE players.
    droppable = team[
        (
            team["roster_status"]
            == "Bench"
        )
        & (
            team["position"]
            .isin(
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

        add_projection = waiver[
            "projected_points"
        ]

        if (
            add_position
            not in SKILL_POSITIONS
        ):
            continue

        if pd.isna(
            add_projection
        ):
            continue

        # Same-position replacements only
        # for the first version.
        possible_drops = droppable[
            droppable[
                "position"
            ]
            == add_position
        ]

        for _, drop in (
            possible_drops.iterrows()
        ):
            drop_projection = drop[
                "projected_points"
            ]

            if pd.isna(
                drop_projection
            ):
                continue

            projected_gain = (
                float(
                    add_projection
                )
                - float(
                    drop_projection
                )
            )

            if (
                projected_gain
                < min_projected_gain
            ):
                continue

            breakout_score = float(
                waiver.get(
                    "breakout_score",
                    0,
                )
            )

            # Projection gain matters most.
            # Breakout score acts as a
            # smaller secondary signal.
            move_score = (
                projected_gain
                + (
                    breakout_score
                    * 0.025
                )
            )

            candidates.append(
                {
                    "add_player":
                        waiver[
                            "player_display_name"
                        ],
                    "add_position":
                        add_position,
                    "add_team":
                        waiver[
                            "team"
                        ],
                    "add_projection":
                        float(
                            add_projection
                        ),
                    "breakout_score":
                        breakout_score,
                    "drop_player":
                        drop[
                            "player"
                        ],
                    "drop_position":
                        drop[
                            "position"
                        ],
                    "drop_team":
                        drop[
                            "team"
                        ],
                    "drop_projection":
                        float(
                            drop_projection
                        ),
                    "projected_gain":
                        projected_gain,
                    "confidence":
                        get_confidence(
                            projected_gain
                        ),
                    "move_score":
                        move_score,
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
            "projected_gain",
        ],
        ascending=[
            False,
            False,
        ]
    )

    # Don't recommend adding the
    # same player twice or dropping
    # the same player twice.
    selected = []

    used_adds = set()
    used_drops = set()

    for _, move in moves.iterrows():
        add_player = move[
            "add_player"
        ]

        drop_player = move[
            "drop_player"
        ]

        if (
            add_player
            in used_adds
        ):
            continue

        if (
            drop_player
            in used_drops
        ):
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