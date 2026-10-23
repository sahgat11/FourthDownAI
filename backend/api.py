import json

import pandas as pd

from fastapi import (
    FastAPI,
    HTTPException,
    Query,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from config import CORS_ORIGINS

from analysis_service import (
    get_base_analysis,
    get_waiver_analysis,
    get_team_analysis,
    clear_analysis_cache,
)


app = FastAPI(
    title="FourthDown AI API",
    description=(
        "Machine-learning fantasy "
        "football analytics API."
    ),
    version="0.1.0",
)


# The public site reads static JSON written by
# precompute.py; this API is the optional local
# mode for league-specific features.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def dataframe_records(
    dataframe,
    limit=None,
):
    if dataframe is None:
        return []

    df = dataframe.copy()

    if limit is not None:
        df = df.head(
            limit
        )

    # Pandas -> JSON -> Python gives us
    # clean native values and converts
    # NaN into null.
    return json.loads(
        df.to_json(
            orient="records"
        )
    )


@app.get("/")
def root():
    return {
        "name":
            "FourthDown AI",
        "message":
            "Fantasy football "
            "intelligence API",
        "docs":
            "/docs",
    }


@app.get("/api/health")
def health():
    return {
        "status":
            "ok",
        "service":
            "FourthDown AI API",
    }


@app.get("/api/model")
def model_info():
    base = get_base_analysis()

    return {
        "season":
            base["season"],
        "completed_week":
            base["completed_week"],
        "test_records":
            base["ml"][
                "test_size"
            ],
        "baseline_mae":
            round(
                base["baseline"][
                    "mae"
                ],
                3,
            ),
        "xgboost_mae":
            round(
                base["ml"][
                    "mae"
                ],
                3,
            ),
        "baseline_rmse":
            round(
                base["baseline"][
                    "rmse"
                ],
                3,
            ),
        "xgboost_rmse":
            round(
                base["ml"][
                    "rmse"
                ],
                3,
            ),
        "improvement_percent":
            round(
                base[
                    "model_improvement"
                ],
                2,
            ),
    }


@app.get("/api/breakouts")
def breakouts(
    limit: int = Query(
        default=15,
        ge=1,
        le=100,
    ),
):
    base = get_base_analysis()

    breakouts_df = (
        base["breakouts"]
    )

    columns = [
        "player_display_name",
        "position",
        "team",
        "week",
        "fantasy_points_ppr_avg_3",
        "projected_points",
        "projection_gain",
        "breakout_score",
    ]

    result = (
        breakouts_df[
            columns
        ]
        if not breakouts_df.empty
        else pd.DataFrame()
    )

    return {
        "season":
            base["season"],
        "completed_week":
            base["completed_week"],
        "count":
            min(
                len(result),
                limit,
            ),
        "players":
            dataframe_records(
                result,
                limit=limit,
            ),
    }


@app.get("/api/waivers")
def waivers(
    league_id: str = Query(
        ...,
        description=(
            "Sleeper league ID"
        ),
    ),
    limit: int = Query(
        default=15,
        ge=1,
        le=100,
    ),
):
    try:
        base = get_base_analysis()

        analysis = (
            get_waiver_analysis(
                league_id
            )
        )

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    waiver_df = analysis[
        "waivers"
    ]

    columns = [
        "player_display_name",
        "position",
        "team",
        "week",
        "fantasy_points_ppr_avg_3",
        "projected_points",
        "breakout_score",
        "waiver_score",
    ]

    result = (
        waiver_df[
            columns
        ]
        if not waiver_df.empty
        else pd.DataFrame()
    )

    return {
        "league_id":
            league_id,
        "league_name":
            analysis[
                "league"
            ].get(
                "name"
            ),
        "week":
            base[
                "completed_week"
            ] + 1,
        "players":
            dataframe_records(
                result,
                limit=limit,
            ),
    }


@app.get("/api/team")
def team(
    league_id: str = Query(
        ...,
    ),
    username: str = Query(
        ...,
    ),
):
    try:
        analysis = (
            get_team_analysis(
                league_id,
                username,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    team_df = analysis["team"]

    columns = [
        "player_id",
        "player",
        "position",
        "team",
        "slot",
        "roster_status",
        "data_week",
        "recent_avg",
        "projected_points",
        "match_method",
    ]

    result = (
        team_df[
            columns
        ]
        if not team_df.empty
        else pd.DataFrame()
    )

    return {
        "league_id":
            league_id,
        "league_name":
            analysis[
                "league"
            ].get(
                "name"
            ),
        "username":
            username,
        "players":
            dataframe_records(
                result
            ),
    }


@app.get(
    "/api/recommendations"
)
def recommendations(
    league_id: str = Query(
        ...,
    ),
    username: str = Query(
        ...,
    ),
):
    try:
        base = get_base_analysis()

        analysis = (
            get_team_analysis(
                league_id,
                username,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    return {
        "league_id":
            league_id,
        "league_name":
            analysis[
                "league"
            ].get(
                "name"
            ),
        "username":
            username,
        "week":
            base[
                "completed_week"
            ] + 1,
        "recommendations":
            dataframe_records(
                analysis["moves"]
            ),
    }


@app.post(
    "/api/refresh"
)
def refresh():
    clear_analysis_cache()

    return {
        "status":
            "cleared",
        "message":
            "Analysis cache cleared. "
            "The next request will "
            "rebuild the model.",
    }