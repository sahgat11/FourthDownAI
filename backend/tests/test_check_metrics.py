import json

import check_metrics


def write(tmp_path, xgb_mae=4.6, base_mae=5.0, xgb_rmse=6.3, base_rmse=7.1, rows=1288, projections=300):
    (tmp_path / "metrics.json").write_text(json.dumps({
        "xgboost": {"mae": xgb_mae, "rmse": xgb_rmse},
        "baseline": {"mae": base_mae, "rmse": base_rmse},
        "evaluation": {"test_rows": rows},
    }))
    (tmp_path / "meta.json").write_text(json.dumps({"counts": {"projections": projections}}))


def test_healthy_metrics_pass(tmp_path):
    write(tmp_path)
    assert check_metrics.check(tmp_path) == []


def test_model_losing_to_baseline_blocks_publish(tmp_path):
    write(tmp_path, xgb_mae=5.1)
    problems = check_metrics.check(tmp_path)
    assert len(problems) == 1 and "MAE" in problems[0]


def test_tiny_or_empty_output_blocks_publish(tmp_path):
    write(tmp_path, rows=10, projections=0)
    assert len(check_metrics.check(tmp_path)) == 2
