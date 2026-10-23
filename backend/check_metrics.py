"""
Gate for the scheduled data refresh.

The site's overview states that XGBoost beats the 3-week-average
baseline. Exit non-zero (so the workflow publishes nothing) if fresh
metrics no longer support that, or if the output looks broken.
"""

import json
import sys
from pathlib import Path

from config import STATIC_DATA_DIR


def check(data_dir=STATIC_DATA_DIR):
    data_dir = Path(data_dir)
    metrics = json.loads((data_dir / "metrics.json").read_text())
    meta = json.loads((data_dir / "meta.json").read_text())
    problems = []

    for measure in ("mae", "rmse"):
        model = metrics["xgboost"][measure]
        baseline = metrics["baseline"][measure]
        if model >= baseline:
            problems.append(
                f"XGBoost {measure.upper()} {model} is not below the baseline's {baseline}; "
                "the overview copy would be wrong."
            )

    if metrics["evaluation"]["test_rows"] < 100:
        problems.append(f"Only {metrics['evaluation']['test_rows']} test rows; too few to publish.")
    if meta["counts"]["projections"] == 0:
        problems.append("No projections were produced.")

    return problems


if __name__ == "__main__":
    issues = check()
    for issue in issues:
        print(f"::error::{issue}")
    if issues:
        sys.exit(1)
    print("Published metrics look healthy.")
