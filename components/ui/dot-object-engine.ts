export type DotState = "idle" | "thinking" | "working" | "success" | "error" | "lost"
export type DotSize = "sm" | "md" | "lg"

export interface SizePreset {
  /** Box edge in CSS px. */
  px: number
  /** Half-extent of the model as a share of the box; perspective grows near parts, so this leaves room. */
  fit: number
  /** Dots drawn at density 1. */
  dots: number
  /** Dot radius in CSS px before depth and perspective. */
  radius: number
  spin: boolean
  /** How strongly glowing dots brighten and swell. */
  glow: number
  fps: number
  /** Brightness levels: one canvas fill per level. */
  levels: number
  /** Uniform dot size instead of perspective-scaled. */
  flat: boolean
}

export const SIZES: Record<DotSize, SizePreset> = {
  sm: { px: 64, fit: 0.38, dots: 520, radius: 0.5, spin: false, glow: 0.3, fps: 30, levels: 4, flat: true },
  md: { px: 120, fit: 0.34, dots: 2800, radius: 0.42, spin: true, glow: 1, fps: 60, levels: 8, flat: false },
  lg: { px: 340, fit: 0.34, dots: 7000, radius: 0.5, spin: true, glow: 1, fps: 60, levels: 8, flat: false },
}

/** Seconds a one-shot state takes to settle. */
export const TERMINAL: Partial<Record<DotState, number>> = { success: 2.2, error: 2.6 }

export const YAW0 = 0.5
export const TILT = 0.18
export const CAM = 3.4

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeBack = (t: number) => {
  const c = 1.6
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
}
const bump = (x: number) => (x <= 0 || x >= 1 ? 0 : Math.pow(Math.sin(Math.PI * x), 2))
const frac = (v: number) => v - Math.floor(v)

/** Deterministic pseudo-random 0..1 for dot `i` and channel `k`. */
export function hash(i: number, k: number): number {
  const x = Math.sin((i * 3 + k + 1) * 78.233) * 12345.678
  return x - Math.floor(x)
}

export function clampProgress(p: number | undefined): number | undefined {
  return p === undefined || Number.isNaN(p) ? undefined : clamp01(p)
}

/** Where the whole object faces. `look` (-1..1) is where the cursor is, smoothed. */
export function yawFor(state: DotState, preset: SizePreset, t: number, st: number, look: number): number {
  if (!preset.spin) return YAW0 + 0.22 * Math.sin(t * 0.7)
  switch (state) {
    case "thinking":
      return YAW0 + t * 0.3
    case "working":
      return YAW0 + t * 0.55
    case "success":
      return YAW0 + (1 - easeOut(clamp01(st / 1.6))) * 2.4 + look * 0.35
    case "lost":
      return YAW0 + 0.85 * Math.sin(t * 0.45) + look * 0.2
    case "idle":
      return YAW0 + 0.18 * Math.sin(t * 0.4) + look * 0.45
    default:
      return YAW0
  }
}

/**
 * One dot at time `t` (seconds since mount) and `st` (seconds since the state began).
 * Writes `[x, y, z, glow, alpha]` into `out`.
 */
export function dotAt(
  positions: Float32Array,
  flow: Float32Array,
  i: number,
  state: DotState,
  t: number,
  st: number,
  progress: number | undefined,
  out: Float32Array,
): void {
  let x = positions[i * 3]
  let y = positions[i * 3 + 1]
  let z = positions[i * 3 + 2]
  let glow = 0
  let alpha = 1
  const s = flow[i]
  const seed = hash(i, 7)
  const breathe = (a: number, speed: number) => {
    const b = 1 + a * Math.sin(t * speed)
    x *= b
    y *= b
    z *= b
  }

  if (state === "idle") {
    breathe(0.018, 1.1)
  } else if (state === "thinking") {
    breathe(0.025, 1.7)
    // Every 7s a head-to-tail band of dots loosens into a swirling cloud and snaps back, like computing.
    const w = (t % 7) / 7
    const amt = Math.pow(bump((w - 0.1 - s * 0.35) / 0.35), 0.8) * (seed < 0.6 ? 1 : 0.25)
    if (amt > 0) {
      const a = amt * (1.2 + seed * 1.5)
      const c = Math.cos(a)
      const sn = Math.sin(a)
      const e = 1 + amt * (0.18 + 0.25 * seed)
      const nx = (x * c + z * sn) * e
      const nz = (-x * sn + z * c) * e
      x = nx
      z = nz
      y = y * e + amt * 0.1 * Math.sin(seed * 30)
      glow = amt * 0.45
    }
  } else if (state === "working") {
    const phase = ((t * 0.55) % 1.2) - 0.1 // glow travels head to tail
    const d = (s - phase) / 0.09
    glow = Math.exp(-d * d)
    const push = 1 + 0.06 * glow
    x *= push
    y *= push
    z *= push
    if (seed < 0.1) {
      // Embers: a few dots drift up and fade.
      const f = frac(t * 0.25 + seed * 20)
      y += f * 0.55
      x += (seed - 0.05) * f
      alpha *= 1 - f
    }
  } else if (state === "lost") {
    breathe(0.012, 0.9)
    if (seed < 0.35) {
      // A third of the dots wander off, each on its own path.
      const f = frac(t * (0.09 + seed * 0.25) + seed * 30)
      const a = seed * 90
      const up = hash(i, 4) * 2 - 1
      x += Math.cos(a) * f * 1.7
      y += up * f * 1.1
      z += Math.sin(a) * f * 1.7
      alpha *= Math.pow(1 - f, 0.7)
    }
  } else if (state === "success") {
    const delay = s * 0.55 + seed * 0.35
    const k = easeBack(clamp01((st - delay) / 0.9))
    const u = hash(i, 0) * 2 - 1
    const a = hash(i, 1) * Math.PI * 2
    const r = 1.2 + 0.6 * hash(i, 2)
    const q = Math.sqrt(1 - u * u)
    const sx = q * Math.cos(a) * r
    const sy = u * r
    const sz = q * Math.sin(a) * r
    x = sx + (x - sx) * k
    y = sy + (y - sy) * k
    z = sz + (z - sz) * k
    alpha = 0.25 + 0.75 * clamp01(k)
    glow = Math.max(0, 1 - Math.abs(st - delay - 0.9) * 4) * 0.8
  } else if (state === "error") {
    // Evaporate: most dots rise, drift apart and fade; a thin layer of ash settles at the base.
    const delay = seed * 0.5 + (1 - s) * 0.3
    const f = clamp01((st - delay) / 1.6)
    if (seed > 0.85) {
      y = Math.max(-1, y - f * f * 2.2)
      alpha = 1 - 0.65 * f
    } else {
      const drift = Math.sin(seed * 60 + t * 2) * 0.12
      y += f * f * 0.9
      x += (seed - 0.45) * f * 0.7 + drift * f
      z += (hash(i, 3) - 0.5) * f * 0.7
      alpha = 1 - f
    }
  }

  // Determinate progress: dots are revealed head to tail; the rest stay as a faint ghost of the shape.
  if (progress !== undefined && (state === "working" || state === "thinking")) {
    const shown = clamp01((progress * 1.08 - s) / 0.08)
    alpha *= 0.07 + 0.93 * shown
    glow += (1 - Math.abs(shown * 2 - 1)) * 0.5 * (shown > 0 && shown < 1 ? 1 : 0)
  }

  out[0] = x
  out[1] = y
  out[2] = z
  out[3] = glow
  out[4] = alpha
}
