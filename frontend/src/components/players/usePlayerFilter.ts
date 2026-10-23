"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PlayerRecord, Position } from "@/lib/types";

export type PositionFilter = "ALL" | Position;

export const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "RB", label: "RB" },
  { value: "WR", label: "WR" },
  { value: "TE", label: "TE" },
];

const POSITIONS = new Set<string>(["RB", "WR", "TE"]);

function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "");
}

/** Mirror filter state into the query string without a navigation. */
function writeUrl(state: { position: PositionFilter; query: string; hideByes: boolean }) {
  const params = new URLSearchParams(window.location.search);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set("pos", state.position === "ALL" ? null : state.position.toLowerCase());
  set("q", state.query.trim() || null);
  set("byes", state.hideByes ? "hide" : null);
  const search = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

export function usePlayerFilter<T extends PlayerRecord>(players: T[]) {
  const params = useSearchParams();
  const initialPos = (params.get("pos") ?? "").toUpperCase();
  const [state, setState] = useState(() => ({
    position: (POSITIONS.has(initialPos) ? initialPos : "ALL") as PositionFilter,
    query: params.get("q") ?? "",
    hideByes: params.get("byes") === "hide",
  }));
  const deferredQuery = useDeferredValue(state.query);

  function update(patch: Partial<typeof state>) {
    const next = { ...state, ...patch };
    setState(next);
    writeUrl(next);
  }

  const rows = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return players.filter(
      (p) =>
        (state.position === "ALL" || p.position === state.position) &&
        (!state.hideByes || !p.on_bye) &&
        (!q || normalize(`${p.name} ${p.team}`).includes(q)),
    );
  }, [players, state.position, state.hideByes, deferredQuery]);

  return {
    rows,
    position: state.position,
    setPosition: (position: PositionFilter) => update({ position }),
    query: state.query,
    setQuery: (query: string) => update({ query }),
    hideByes: state.hideByes,
    setHideByes: (hideByes: boolean) => update({ hideByes }),
    active: state.position !== "ALL" || state.query !== "" || state.hideByes,
    reset: () => update({ position: "ALL", query: "", hideByes: false }),
  };
}
