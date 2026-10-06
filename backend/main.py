from data_loader import (
    load_player_stats,
    get_fantasy_players,
)


def main():
    stats = load_player_stats(
        2026
    )

    players = get_fantasy_players(
        stats
    )

    print()
    print("FourthDown AI")
    print("=" * 50)

    print()
    print(
        f"Loaded {len(players)} "
        f"player-week records."
    )

    print()
    print(players.head(20))


if __name__ == "__main__":
    main()