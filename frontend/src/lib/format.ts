const one = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const two = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const DASH = "–";

/** Fantasy points, one decimal: 21.3 */
export function points(value: number | null | undefined): string {
  return value == null ? DASH : one.format(value);
}

/** Error metrics, two decimals: 4.64 */
export function metric(value: number | null | undefined): string {
  return value == null ? DASH : two.format(value);
}

export function count(value: number | null | undefined): string {
  return value == null ? DASH : int.format(value);
}

/** Share stored as 0–1, shown as a percent: 32.5% */
export function share(value: number | null | undefined): string {
  return value == null ? DASH : `${one.format(value * 100)}%`;
}

/** Signed change: +2.4 / −1.1 (true minus sign) */
export function signed(
  value: number | null | undefined,
  format: (v: number) => string = (v) => one.format(v),
): string {
  if (value == null) return DASH;
  const body = format(Math.abs(value));
  // Values that round to zero (e.g. -0.04 -> "0.0") get no sign.
  if (direction(value, format) === 0) return body;
  return value > 0 ? `+${body}` : `−${body}`;
}

/** Direction of a value after display rounding: 1, -1 or 0. */
export function direction(
  value: number,
  format: (v: number) => string = (v) => one.format(v),
): -1 | 0 | 1 {
  if (Number(format(Math.abs(value)).replace(/[^0-9.]/g, "")) === 0) return 0;
  return value > 0 ? 1 : -1;
}

export function percent(value: number | null | undefined): string {
  return value == null ? DASH : `${one.format(value)}%`;
}

export function updatedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}
