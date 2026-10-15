import argparse

from data_loader import (
    load_player_stats,
)

from feature_engineering import (
    build_features,
)

from baseline_model import (
    evaluate_baseline,
)

from ml_model import (
    train_and_evaluate,
    train_production_model,
    predict_next_week,
    predict_player_pool,
)

from breakout_engine import (
    calculate_breakout_scores,
)

from sleeper_client import (
    get_league,
    get_nfl_players,
    get_owned_player_ids,
    get_user,
    get_user_roster,
)

from waiver_engine import (
    find_available_breakouts,
)

from team_engine import (
    build_team_roster,
)

from move_engine import (
    generate_add_drop_recommendations,
)

from week_utils import (
    get_latest_complete_week,
)


SEASON = 2026


def print_model_performance(
    baseline,
    ml,
):
    print()
    print("MODEL PERFORMANCE")
    print("-" * 70)

    print(
        f"Test records: "
        f"{ml['test_size']}"
    )

    print(
        f"Baseline MAE: "
        f"{baseline['mae']:.2f}"
    )

    print(
        f"XGBoost MAE:  "
        f"{ml['mae']:.2f}"
    )

    improvement = (
        (
            baseline["mae"]
            - ml["mae"]
        )
        / baseline["mae"]
        * 100
    )

    print(
        f"Improvement:  "
        f"{improvement:.1f}%"
    )


def print_breakouts(
    breakouts,
    completed_week,
):
    print()
    print(
        f"BREAKOUT WATCH - "
        f"AFTER WEEK {completed_week}"
    )

    print("-" * 70)
    print()

    columns = [
        "player_display_name",
        "position",
        "team",
        "fantasy_points_ppr_avg_3",
        "projected_points",
        "projection_gain",
        "breakout_score",
    ]

    top_breakouts = (
        breakouts[
            columns
        ]
        .head(15)
        .copy()
    )

    top_breakouts.columns = [
        "Player",
        "Pos",
        "Team",
        "Last 3 Avg",
        "Projection",
        "Expected Gain",
        "Breakout Score",
    ]

    print(
        top_breakouts.to_string(
            index=False
        )
    )


def print_waivers(
    waivers,
    league,
    completed_week,
):
    print()
    print(
        f"FOURTHDOWN AI WAIVER WIRE "
        f"- WEEK {completed_week + 1}"
    )

    print("-" * 70)

    print(
        f"League: "
        f"{league.get('name', 'Sleeper League')}"
    )

    print()

    columns = [
        "player_display_name",
        "position",
        "team",
        "fantasy_points_ppr_avg_3",
        "projected_points",
        "projection_gain",
        "breakout_score",
    ]

    top_waivers = (
        waivers[
            columns
        ]
        .head(15)
        .copy()
    )

    top_waivers.columns = [
        "Player",
        "Pos",
        "Team",
        "Last 3 Avg",
        "Projection",
        "Expected Gain",
        "Waiver Score",
    ]

    if top_waivers.empty:
        print(
            "No qualifying waiver "
            "candidates found."
        )

        return

    print(
        top_waivers.to_string(
            index=False
        )
    )


def print_my_team(
    team,
    username,
):
    print()
    print(
        f"FOURTHDOWN AI - "
        f"MY TEAM ({username})"
    )

    print("-" * 70)
    print()

    if team.empty:
        print(
            "No roster players found."
        )

        return

    display = team[
        [
            "slot",
            "player",
            "position",
            "team",
            "roster_status",
            "data_week",
            "recent_avg",
            "projected_points",
            "match_method",
        ]
    ].copy()

    display.columns = [
        "Slot",
        "Player",
        "Pos",
        "Team",
        "Status",
        "Data Week",
        "Last 3 Avg",
        "Projection",
        "Match",
    ]

    print(
        display.to_string(
            index=False,
            na_rep="N/A",
        )
    )


def print_recommended_moves(
    moves,
    completed_week,
):
    print()
    print(
        f"FOURTHDOWN AI - "
        f"RECOMMENDED MOVES "
        f"FOR WEEK "
        f"{completed_week + 1}"
    )

    print("=" * 70)
    print()

    if moves.empty:
        print(
            "No meaningful add/drop "
            "upgrades found."
        )

        return

    for index, move in (
        moves.iterrows()
    ):
        number = index + 1

        print(
            f"{number}. "
            f"ADD "
            f"{move['add_player']} "
            f"({move['add_position']}, "
            f"{move['add_team']})"
        )

        print(
            f"   DROP "
            f"{move['drop_player']} "
            f"({move['drop_position']}, "
            f"{move['drop_team']})"
        )

        print(
            f"   Add projection:  "
            f"{move['add_projection']:.2f}"
        )

        print(
            f"   Drop projection: "
            f"{move['drop_projection']:.2f}"
        )

        print(
            f"   Projected gain:  "
            f"+{move['projected_gain']:.2f}"
        )

        print(
            f"   Breakout score:  "
            f"{move['breakout_score']:.1f}"
        )

        print(
            f"   Confidence:      "
            f"{move['confidence']}"
        )

        print()


def main():
    parser = argparse.ArgumentParser(
        description=(
            "FourthDown AI fantasy "
            "football analytics"
        )
    )

    parser.add_argument(
        "--league-id",
        help=(
            "Sleeper league ID."
        ),
    )

    parser.add_argument(
        "--username",
        help=(
            "Sleeper username used "
            "for My Team analysis."
        ),
    )

    args = parser.parse_args()

    stats = load_player_stats()

    features = build_features(
        stats
    )

    completed_week = (
        get_latest_complete_week(
            features,
            season=SEASON,
        )
    )

    baseline = evaluate_baseline(
        features,
        test_season=SEASON,
        max_target_week=completed_week,
    )

    ml = train_and_evaluate(
        features,
        test_season=SEASON,
        max_target_week=completed_week,
    )

    print()
    print("FourthDown AI")
    print("=" * 70)

    print(
        f"Latest completed data week: "
        f"{completed_week}"
    )

    print_model_performance(
        baseline,
        ml,
    )

    production_model = (
        train_production_model(
            features,
            season=SEASON,
            completed_week=completed_week,
        )
    )

    predictions = predict_next_week(
        features,
        production_model,
        season=SEASON,
        completed_week=completed_week,
    )

    player_pool_predictions = (
        predict_player_pool(
            features,
            production_model,
            season=SEASON,
            completed_week=completed_week,
        )
    )

    breakouts = (
        calculate_breakout_scores(
            predictions
        )
    )

    print_breakouts(
        breakouts,
        completed_week,
    )

    if not args.league_id:
        print()
        print(
            "Tip: Add --league-id "
            "for Sleeper waiver "
            "recommendations."
        )

        return

    print()
    print(
        "Loading Sleeper league..."
    )

    league = get_league(
        args.league_id
    )

    owned_player_ids = (
        get_owned_player_ids(
            args.league_id
        )
    )

    sleeper_players = (
        get_nfl_players()
    )

    waivers = (
        find_available_breakouts(
            breakouts,
            sleeper_players,
            owned_player_ids,
        )
    )

    print_waivers(
        waivers,
        league,
        completed_week,
    )

    if not args.username:
        print()
        print(
            "Tip: Add --username "
            "for My Team analysis."
        )

        return

    user = get_user(
        args.username
    )

    if not user:
        print()
        print(
            f"Sleeper user "
            f"'{args.username}' "
            f"not found."
        )

        return

    roster = get_user_roster(
        args.league_id,
        user["user_id"],
    )

    if not roster:
        print()
        print(
            "Could not find this "
            "user's roster in the "
            "selected league."
        )

        return

    team = build_team_roster(
        roster,
        league,
        sleeper_players,
        player_pool_predictions,
    )

    print_my_team(
        team,
        args.username,
    )

    moves = (
        generate_add_drop_recommendations(
            team,
            waivers,
            min_projected_gain=1.5,
            max_recommendations=5,
        )
    )

    print_recommended_moves(
        moves,
        completed_week,
    )


if __name__ == "__main__":
    main()