import pandas as pd

from move_engine import generate_add_drop_recommendations, optimize_skill_lineup


def team(on_bye):
    rows = [
        {"player_id": "a", "position": "WR", "projected_points": 20.0},
        {"player_id": "b", "position": "WR", "projected_points": 10.0},
        {"player_id": "c", "position": "WR", "projected_points": 5.0},
    ]
    df = pd.DataFrame(rows)
    if on_bye is not None:
        df["on_bye"] = on_bye
    return df


REQ = {"RB": 0, "WR": 2, "TE": 0, "FLEX": 0}


def test_lineup_without_bye_data_is_unchanged():
    total, lineup = optimize_skill_lineup(team(None), REQ)
    assert total == 30.0
    assert list(lineup["player_id"]) == ["a", "b"]


def test_bye_week_player_cannot_start():
    total, lineup = optimize_skill_lineup(team([True, False, False]), REQ)
    assert total == 15.0
    assert list(lineup["player_id"]) == ["b", "c"]


def roster_row(pid, pos, proj, status="Bench", slot="BN", on_bye=False):
    return {"player_id": pid, "player": f"Player {pid}", "position": pos, "team": "AAA",
            "slot": slot, "roster_status": status, "recent_avg": proj, "projected_points": proj,
            "data_week": 6, "match_method": "GSIS", "on_bye": on_bye}


def test_bye_week_player_is_never_suggested_as_a_drop():
    my_team = pd.DataFrame([
        roster_row("s1", "WR", 12.0, "Starter", "WR"),
        roster_row("bye", "RB", 17.0, on_bye=True),
        roster_row("rb2", "RB", 9.0, "Starter", "RB"),
    ])
    waivers = pd.DataFrame([{
        "player_display_name": "Waiver Guy", "position": "WR", "team": "BBB",
        "projected_points": 14.0, "fantasy_points_ppr_avg_3": 10.0, "week": 6, "breakout_score": 0.0,
    }])
    moves = generate_add_drop_recommendations(my_team, waivers)
    assert moves.empty or "Player bye" not in set(moves["drop_player"])
