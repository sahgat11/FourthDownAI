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
)

from breakout_engine import (
    calculate_breakout_scores,
)

from sleeper_client import (
    get_league,
    get_nfl_players,
    get_owned_player_ids,
)

from waiver_engine import (
    find_available_breakouts,
)


def print_model_performance(
    baseline,
    ml
):
    print()
    print("MODEL PERFORMANCE")
    print("-" * 70)

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
    current_week
):
    print()
    print(
        f"BREAKOUT WATCH - "
        f"AFTER WEEK {current_week}"
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
    current_week
):
    print()
    print(
        f"FOURTHDOWN AI WAIVER WIRE "
        f"- WEEK {current_week + 1}"
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
            "Sleeper league ID used "
            "to generate waiver "
            "recommendations."
        )
    )

    args = parser.parse_args()

    stats = load_player_stats()

    features = build_features(
        stats
    )

    baseline = evaluate_baseline(
        features,
        test_season=2026
    )

    ml = train_and_evaluate(
        features,
        test_season=2026
    )

    print()
    print("FourthDown AI")
    print("=" * 70)

    print_model_performance(
        baseline,
        ml
    )

    production_model = (
        train_production_model(
            features
        )
    )

    predictions = predict_next_week(
        features,
        production_model,
        season=2026
    )

    current_week = int(
        predictions[
            "week"
        ].max()
    )

    breakouts = (
        calculate_breakout_scores(
            predictions
        )
    )

    print_breakouts(
        breakouts,
        current_week
    )

    if not args.league_id:
        print()
        print(
            "Tip: Add --league-id "
            "to generate recommendations "
            "for your Sleeper league."
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
            owned_player_ids
        )
    )

    print_waivers(
        waivers,
        league,
        current_week
    )


if __name__ == "__main__":
    main()