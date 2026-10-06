from data_loader import (
    load_player_stats,
)
from feature_engineering import (
    build_features,
)


def main():
    stats = load_player_stats()

    features = build_features(
        stats
    )

    print()
    print("FourthDown AI")
    print("=" * 60)

    print()
    print(
        f"Created {len(features)} "
        f"RB/WR/TE player-week records."
    )

    print()
    print("Sample ML features:")
    print()

    columns = [
        "player_display_name",
        "position",
        "team",
        "season",
        "week",
        "fantasy_points_ppr",
        "fantasy_points_ppr_avg_3",
        "opportunities",
        "opportunities_avg_3",
        "target_share",
        "target_share_avg_3",
        "target_share_change",
        "wopr_avg_3",
        "next_week_fantasy_points",
    ]

    print(
        features[
            columns
        ]
        .tail(25)
        .to_string(
            index=False
        )
    )


if __name__ == "__main__":
    main()