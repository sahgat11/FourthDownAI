import re
import unicodedata


SKILL_POSITIONS = {
    "RB",
    "WR",
    "TE",
}


def normalize_name(name):
    if not name:
        return ""

    name = unicodedata.normalize(
        "NFKD",
        name
    )

    name = (
        name
        .encode(
            "ascii",
            "ignore"
        )
        .decode("ascii")
        .lower()
    )

    name = re.sub(
        r"[^a-z0-9 ]",
        " ",
        name
    )

    words = name.split()

    suffixes = {
        "jr",
        "sr",
        "ii",
        "iii",
        "iv",
        "v",
    }

    words = [
        word
        for word in words
        if word not in suffixes
    ]

    return " ".join(words)


def create_player_key(
    name,
    position
):
    normalized_name = normalize_name(
        name
    )

    normalized_position = (
        position or ""
    ).upper()

    return (
        normalized_name,
        normalized_position,
    )


def get_sleeper_full_name(
    player
):
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


def build_owned_player_sets(
    sleeper_players,
    owned_player_ids
):
    owned_gsis_ids = set()
    owned_name_keys = set()

    for sleeper_id in owned_player_ids:
        player = sleeper_players.get(
            str(sleeper_id)
        )

        if not player:
            continue

        gsis_id = player.get(
            "gsis_id"
        )

        if gsis_id:
            owned_gsis_ids.add(
                str(gsis_id)
            )

        name = get_sleeper_full_name(
            player
        )

        position = player.get(
            "position"
        )

        if (
            name
            and position
        ):
            owned_name_keys.add(
                create_player_key(
                    name,
                    position,
                )
            )

    return (
        owned_gsis_ids,
        owned_name_keys,
    )


def is_player_rostered(
    row,
    owned_gsis_ids,
    owned_name_keys,
):
    nfl_id = row.get(
        "player_id"
    )

    if nfl_id is not None:
        if (
            str(nfl_id)
            in owned_gsis_ids
        ):
            return True

    name_key = create_player_key(
        row[
            "player_display_name"
        ],
        row[
            "position"
        ],
    )

    return (
        name_key
        in owned_name_keys
    )


def build_breakout_lookup(
    breakouts
):
    id_lookup = {}
    name_lookup = {}

    if breakouts.empty:
        return (
            id_lookup,
            name_lookup,
        )

    for _, row in (
        breakouts.iterrows()
    ):
        player_id = row.get(
            "player_id"
        )

        if player_id is not None:
            id_lookup[
                str(player_id)
            ] = float(
                row[
                    "breakout_score"
                ]
            )

        key = create_player_key(
            row[
                "player_display_name"
            ],
            row[
                "position"
            ],
        )

        name_lookup[
            key
        ] = float(
            row[
                "breakout_score"
            ]
        )

    return (
        id_lookup,
        name_lookup,
    )


def get_breakout_score(
    row,
    id_lookup,
    name_lookup,
):
    player_id = row.get(
        "player_id"
    )

    if player_id is not None:
        score = id_lookup.get(
            str(player_id)
        )

        if score is not None:
            return score

    key = create_player_key(
        row[
            "player_display_name"
        ],
        row[
            "position"
        ],
    )

    return float(
        name_lookup.get(
            key,
            0.0,
        )
    )


def percentile_score(
    series
):
    if len(series) == 1:
        return series * 0 + 1.0

    return series.rank(
        pct=True,
        method="average",
    )


def find_available_players(
    player_pool,
    breakouts,
    sleeper_players,
    owned_player_ids,
    completed_week,
    min_projection=5.0,
    max_data_age_weeks=1,
):
    """
    Build a complete waiver pool.

    Unlike Breakout Watch, a player does
    NOT need to be trending upward to be
    considered here.
    """

    players = player_pool.copy()

    # Only positions currently supported
    # by FourthDown's ML model.
    players = players[
        players[
            "position"
        ].isin(
            SKILL_POSITIONS
        )
    ].copy()

    players = players[
        players[
            "projected_points"
        ].notna()
    ].copy()

    # Remove very low-value candidates.
    players = players[
        players[
            "projected_points"
        ]
        >= min_projection
    ].copy()

    # Avoid recommending players whose
    # most recent data is very stale.
    minimum_week = (
        completed_week
        - max_data_age_weeks
    )

    players = players[
        players["week"]
        >= minimum_week
    ].copy()

    (
        owned_gsis_ids,
        owned_name_keys,
    ) = build_owned_player_sets(
        sleeper_players,
        owned_player_ids,
    )

    players[
        "is_rostered"
    ] = players.apply(
        lambda row:
        is_player_rostered(
            row,
            owned_gsis_ids,
            owned_name_keys,
        ),
        axis=1,
    )

    # Only true free agents remain.
    available = players[
        ~players[
            "is_rostered"
        ]
    ].copy()

    if available.empty:
        return available

    # Attach Breakout Score as an
    # additional signal rather than
    # requiring it.
    (
        breakout_id_lookup,
        breakout_name_lookup,
    ) = build_breakout_lookup(
        breakouts
    )

    available[
        "breakout_score"
    ] = available.apply(
        lambda row:
        get_breakout_score(
            row,
            breakout_id_lookup,
            breakout_name_lookup,
        ),
        axis=1,
    )

    available[
        "is_breakout"
    ] = (
        available[
            "breakout_score"
        ]
        > 0
    )

    # General waiver value should mostly
    # reflect projected fantasy production.
    #
    # Breakout status is useful, but it is
    # only one part of the ranking.
    available[
        "projection_rank"
    ] = percentile_score(
        available[
            "projected_points"
        ]
    )

    available[
        "recent_rank"
    ] = percentile_score(
        available[
            "fantasy_points_ppr_avg_3"
        ].fillna(0)
    )

    available[
        "breakout_rank"
    ] = (
        available[
            "breakout_score"
        ]
        / 100.0
    )

    available[
        "waiver_score"
    ] = (
        (
            0.70
            * available[
                "projection_rank"
            ]
        )
        + (
            0.20
            * available[
                "recent_rank"
            ]
        )
        + (
            0.10
            * available[
                "breakout_rank"
            ]
        )
    ) * 100

    available[
        "waiver_score"
    ] = (
        available[
            "waiver_score"
        ]
        .round(1)
    )

    available = (
        available
        .sort_values(
            [
                "waiver_score",
                "projected_points",
            ],
            ascending=[
                False,
                False,
            ],
        )
    )

    return available