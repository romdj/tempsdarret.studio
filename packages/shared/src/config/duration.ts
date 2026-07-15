/**
 * Parse a human-readable duration string (e.g. "48h", "15m", "500ms") into
 * milliseconds. Keeps durations expressed with their unit in config and env
 * (INVITATION_TTL=48h) instead of raw, unit-in-the-name millisecond numbers.
 */

const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

export const parseDuration = (value: string): number => {
  const match = /^\s*(\d+)(ms|s|m|h|d)\s*$/.exec(value);
  const unit = match?.[2];
  const factor = unit ? UNIT_TO_MS[unit] : undefined;

  if (match === null || factor === undefined) {
    throw new Error(`Invalid duration: "${value}" (expected e.g. "48h", "15m", "500ms")`);
  }

  return parseInt(match[1] as string, 10) * factor;
};
