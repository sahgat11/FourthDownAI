"use client";

import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const LEAGUE_ID = "1404003994883362816";
const USERNAME = "sahgat11";

type ModelInfo = {
  season: number;
  completed_week: number;
  test_records: number;
  baseline_mae: number;
  xgboost_mae: number;
  improvement_percent: number;
};

type Recommendation = {
  add_player: string;
  add_position: string;
  add_team: string;
  add_projection: number;

  drop_player: string;
  drop_position: string;
  drop_team: string;
  drop_projection: number;

  starter_gain: number;
  asset_gain: number;
  breakout_score: number;

  move_type: string;
  confidence: string;
  reason: string;
};

type RecommendationResponse = {
  league_id: string;
  league_name: string;
  username: string;
  week: number;
  recommendations: Recommendation[];
};

export default function Home() {
  const [model, setModel] =
    useState<ModelInfo | null>(null);

  const [recommendations, setRecommendations] =
    useState<Recommendation[]>([]);

  const [week, setWeek] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const modelResponse = await fetch(
          `${API_URL}/api/model`
        );

        if (!modelResponse.ok) {
          throw new Error(
            "Could not load model information."
          );
        }

        const modelData: ModelInfo =
          await modelResponse.json();

        setModel(modelData);

        const recommendationResponse =
          await fetch(
            `${API_URL}/api/recommendations?league_id=${LEAGUE_ID}&username=${USERNAME}`
          );

        if (!recommendationResponse.ok) {
          throw new Error(
            "Could not load recommendations."
          );
        }

        const recommendationData:
          RecommendationResponse =
            await recommendationResponse.json();

        setRecommendations(
          recommendationData.recommendations
        );

        setWeek(
          recommendationData.week
        );
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Something went wrong."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        <header className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
              Fantasy Intelligence
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              FourthDown AI
            </h1>

            <p className="mt-2 text-zinc-400">
              Machine learning powered fantasy football decisions.
            </p>
          </div>

          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
            Week {week ?? "..."}
          </div>
        </header>

        {loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
            Loading FourthDown analysis...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="mb-10 grid gap-4 md:grid-cols-4">

              <StatCard
                label="XGBoost MAE"
                value={
                  model
                    ? model.xgboost_mae.toFixed(2)
                    : "-"
                }
              />

              <StatCard
                label="Baseline MAE"
                value={
                  model
                    ? model.baseline_mae.toFixed(2)
                    : "-"
                }
              />

              <StatCard
                label="Improvement"
                value={
                  model
                    ? `${model.improvement_percent.toFixed(1)}%`
                    : "-"
                }
              />

              <StatCard
                label="Test Samples"
                value={
                  model
                    ? model.test_records.toLocaleString()
                    : "-"
                }
              />

            </section>

            <section>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Recommended Moves
                  </h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    Personalized using your Sleeper roster and FourthDown projections.
                  </p>
                </div>
              </div>

              {recommendations.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
                  No meaningful roster upgrades found.
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {recommendations.map(
                    (move, index) => (
                      <RecommendationCard
                        key={`${move.add_player}-${move.drop_player}`}
                        move={move}
                        rank={index + 1}
                      />
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}


function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold">
        {value}
      </p>
    </div>
  );
}


function RecommendationCard({
  move,
  rank,
}: {
  move: Recommendation;
  rank: number;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Recommendation {rank}
          </p>

          <h3 className="mt-1 text-lg font-semibold">
            {move.move_type}
          </h3>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            move.confidence === "HIGH"
              ? "bg-emerald-500/15 text-emerald-400"
              : move.confidence === "MEDIUM"
                ? "bg-yellow-500/15 text-yellow-400"
                : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {move.confidence}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-400">
            Add
          </p>

          <p className="mt-2 font-semibold">
            {move.add_player}
          </p>

          <p className="text-sm text-zinc-400">
            {move.add_position} · {move.add_team}
          </p>

          <p className="mt-3 text-xl font-semibold">
            {move.add_projection.toFixed(2)}
          </p>

          <p className="text-xs text-zinc-500">
            projected points
          </p>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs font-semibold uppercase text-red-400">
            Drop
          </p>

          <p className="mt-2 font-semibold">
            {move.drop_player}
          </p>

          <p className="text-sm text-zinc-400">
            {move.drop_position} · {move.drop_team}
          </p>

          <p className="mt-3 text-xl font-semibold">
            {move.drop_projection.toFixed(2)}
          </p>

          <p className="text-xs text-zinc-500">
            projected points
          </p>
        </div>

      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-5">
        <div>
          <p className="text-xs text-zinc-500">
            Roster Gain
          </p>

          <p className="mt-1 font-semibold text-emerald-400">
            +{move.asset_gain.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500">
            Lineup Gain
          </p>

          <p className="mt-1 font-semibold text-emerald-400">
            +{move.starter_gain.toFixed(2)}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-400">
        {move.reason}
      </p>

    </article>
  );
}