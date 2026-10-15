import re
import unicodedata


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
                    position
                )
            )

    return (
        owned_gsis_ids,
        owned_name_keys,
    )


def find_available_breakouts(
    breakouts,
    sleeper_players,
    owned_player_ids
):
    players = breakouts.copy()

    (
        owned_gsis_ids,
        owned_name_keys,
    ) = build_owned_player_sets(
        sleeper_players,
        owned_player_ids
    )

    def is_rostered(row):
        # Best match:
        # nflverse player_id ↔ Sleeper gsis_id
        nfl_id = row.get(
            "player_id"
        )

        if nfl_id is not None:
            nfl_id = str(
                nfl_id
            )

            if nfl_id in owned_gsis_ids:
                return True

        # Fallback for players whose IDs
        # don't line up across providers.
        name_key = create_player_key(
            row[
                "player_display_name"
            ],
            row[
                "position"
            ]
        )

        return (
            name_key
            in owned_name_keys
        )

    players[
        "is_rostered"
    ] = players.apply(
        is_rostered,
        axis=1
    )

    available = players[
        ~players[
            "is_rostered"
        ]
    ].copy()

    available[
        "waiver_score"
    ] = (
        available[
            "breakout_score"
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
            ]
        )
    )

    return available