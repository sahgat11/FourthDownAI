"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { PlayerRecord, Position } from "@/lib/types";

export type PositionFilter = "ALL" | Position;

export const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "RB", label: "RB" },
  { value: "WR", label: "WR" },
  { value: "TE", label: "TE" },
];

function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "");
}

export function usePlayerFilter<T extends PlayerRecord>(players: T[]) {
  const [position, setPosition] = useState<PositionFilter>("ALL");
  const [query, setQuery] = useState("");
  const [hideByes, setHideByes] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const rows = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return players.filter(
      (p) =>
        (position === "ALL" || p.position === position) &&
        (!hideByes || !p.on_bye) &&
        (!q || normalize(`${p.name} ${p.team}`).includes(q)),
    );
  }, [players, position, deferredQuery, hideByes]);

  const active = position !== "ALL" || query !== "" || hideByes;

  function reset() {
    setPosition("ALL");
    setQuery("");
    setHideByes(false);
  }

  return { rows, position, setPosition, query, setQuery, hideByes, setHideByes, active, reset };
}
