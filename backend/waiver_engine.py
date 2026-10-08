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


def get_owned_player_keys(
    sleeper_players,
    owned_player_ids
):
    owned_keys = set()

    for player_id in owned_player_ids:
        player = sleeper_players.get(
            str(player_id)
        )

        if not player:
            continue

        full_name = player.get(
            "full_name"
        )

        if not full_name:
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

            full_name = (
                f"{first_name} "
                f"{last_name}"
            ).strip()

        position = player.get(
            "position"
        )

        if not full_name or not position:
            continue

        owned_keys.add(
            create_player_key(
                full_name,
                position
            )
        )

    return owned_keys


def find_available_breakouts(
    breakouts,
    sleeper_players,
    owned_player_ids
):
    players = breakouts.copy()

    owned_keys = get_owned_player_keys(
        sleeper_players,
        owned_player_ids
    )

    players[
        "match_key"
    ] = players.apply(
        lambda row:
        create_player_key(
            row[
                "player_display_name"
            ],
            row["position"]
        ),
        axis=1
    )

    players[
        "is_rostered"
    ] = players[
        "match_key"
    ].isin(
        owned_keys
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
    )

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
            ]
        )
    )

    return available