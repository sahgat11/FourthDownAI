// Types for the static JSON written by backend/precompute.py.
// Keep in sync with backend/DATA_SCHEMA.md.

export type Position = "RB" | "WR" | "TE";

export interface Usage {
  targets_avg_3: number | null;
  carries_avg_3: number | null;
  opportunities_avg_3: number | null;
  target_share_avg_3: number | null;
  wopr_avg_3: number | null;
}

export interface PlayerRecord {
  player_id: string;
  name: string;
  position: Position;
  team: string;
  opponent: string | null;
  home: boolean | null;
  on_bye: boolean | null;
  data_week: number;
  projected_points: number;
  position_rank: number | null;
  recent_avg: number | null;
  last_week_points: number | null;
  season_ppr: number | null;
  games: number | null;
  usage: Usage;
  headshot_url: string | null;
}

export interface BreakoutPlayer extends PlayerRecord {
  breakout_score: number;
  projection_gain: number;
  opportunity_change: number | null;
  target_share_change: number | null;
  components: {
    gain: number;
    projection: number;
    opportunity: number;
    target_share: number;
  };
}

export interface WaiverPlayer extends PlayerRecord {
  waiver_score: number;
  breakout_score: number;
  is_breakout: boolean;
  sleeper_adds_48h: number | null;
}

interface WeekScoped {
  schema_version: number;
  season: number;
  projection_week: number;
  data_through_week: number;
  count: number;
}

export interface ProjectionsFile extends WeekScoped {
  players: PlayerRecord[];
}

export interface BreakoutsFile extends WeekScoped {
  criteria: {
    min_projected_points: number;
    min_projection_gain: number;
    weights: Record<string, number>;
    description: string;
  };
  players: BreakoutPlayer[];
}

export interface WaiversFile extends WeekScoped {
  availability: {
    method: string;
    rostered_cutoffs: Record<Position, number>;
    description: string;
    sleeper_trending: boolean;
  };
  criteria: {
    min_projected_points: number;
    max_data_age_weeks: number;
    weights: Record<string, number>;
  };
  players: WaiverPlayer[];
}

export interface ErrorSummary {
  n: number;
  baseline_mae: number;
  xgboost_mae: number;
  baseline_rmse: number;
  xgboost_rmse: number;
}

export interface MetricsFile {
  schema_version: number;
  season: number;
  evaluation: {
    description: string;
    train_seasons: number[];
    test_season: number;
    target_weeks: number[];
    train_rows: number;
    test_rows: number;
  };
  baseline: { name: string; mae: number; rmse: number };
  xgboost: { name: string; mae: number; rmse: number };
  improvement: { mae_pct: number; rmse_pct: number };
  by_week: (ErrorSummary & { target_week: number })[];
  by_position: (ErrorSummary & { position: Position })[];
  calibration: {
    predicted_min: number;
    predicted_max: number | null;
    n: number;
    mean_predicted: number;
    mean_actual: number;
  }[];
  feature_importance: { feature: string; label: string; importance: number }[];
}

export interface MetaFile {
  schema_version: number;
  generated_at: string;
  season: number;
  data_through_week: number;
  projection_week: number;
  scoring: string;
  positions: Position[];
  model: {
    name: string;
    target: string;
    features: { feature: string; label: string }[];
    params: Record<string, number>;
  };
  sources: {
    player_stats: string;
    schedule: string | null;
    sleeper_trending: boolean;
  };
  counts: { projections: number; breakouts: number; waivers: number };
}
