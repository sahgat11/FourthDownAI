"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { PlayerRecord } from "@/lib/types";

function initials(name: string) {
  const parts = name.replace(/\b(Jr|Sr|II|III|IV)\.?$/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

/**
 * nflverse headshot, falling back to initials if the image is missing or
 * fails. Decorative: the player's name is always shown next to it.
 */
export function PlayerAvatar({
  player,
  size = 40,
  className,
}: {
  player: Pick<PlayerRecord, "name" | "headshot_url">;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = player.headshot_url && !failed;
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-surface-sunk ring-1 ring-rule",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        data-avatar-fallback
        className="flex h-full w-full items-center justify-center font-display font-bold text-ink-2"
        style={{ fontSize: Math.round(size * 0.38) }}
      >
        {initials(player.name)}
      </span>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element -- remote headshots, sized explicitly
        <img
          src={player.headshot_url!}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          // A photo can fail before hydration, when onError isn't attached
          // yet; catch that case as soon as React sees the element.
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setFailed(true);
          }}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
    </span>
  );
}
