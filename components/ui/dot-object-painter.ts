import { CAM, TILT, dotAt, yawFor, type DotState, type SizePreset } from "@/components/ui/dot-object-engine"
import type { DotCloud } from "@/components/ui/dot-object-models"

/** How far, and how hard, a dot leans toward the cursor. */
const LEAN = 0.55
/** How quickly a dot's lean eases toward its target each frame. */
const EASE = 0.14

/** Cursor gravity: inside `reach` a dot leans toward the cursor, harder the closer it is. */
export function pull(px: number, py: number, cx: number, cy: number, reach: number): [number, number] {
  const dx = cx - px
  const dy = cy - py
  const d = Math.hypot(dx, dy)
  if (d >= reach) return [0, 0]
  const w = Math.pow(1 - d / reach, 2) * LEAN
  return [dx * w, dy * w]
}

export interface Painting {
  model: DotCloud
  preset: SizePreset
  state: DotState
  /** Seconds since mount. */
  t: number
  /** Seconds since the state began. */
  st: number
  progress?: number
  /** Where the cursor is, -1..1, smoothed. */
  look: number
  /** Cursor in canvas px, or null when gravity is off or the cursor is away. Offsets still ease back. */
  cursor: { x: number; y: number } | null
  /** Per-dot lean in px, owned by the caller and kept between frames. */
  offsets: { x: Float32Array; y: Float32Array }
  color: string
  /** Share of the preset's dots to draw. */
  density?: number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Draw one frame at the preset's logical size; returns the number of dots drawn. */
export function paintDots(ctx: Pick<CanvasRenderingContext2D, "clearRect" | "fill" | "fillStyle" | "globalAlpha">, p: Painting): number {
  const { preset, model, offsets } = p
  const size = preset.px
  const count = Math.min(model.n, Math.round(preset.dots * (p.density ?? 1)), offsets.x.length)
  const yaw = yawFor(p.state, preset, p.t, p.st, p.look)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const ct = Math.cos(TILT)
  const stt = Math.sin(TILT)
  const half = size / 2
  const scale = size * preset.fit
  const reach = size * 0.3
  const levels = preset.levels
  const paths = Array.from({ length: levels }, () => new Path2D())
  const used = new Uint8Array(levels)
  const out = new Float32Array(5)

  for (let i = 0; i < count; i++) {
    dotAt(model.positions, model.flow, i, p.state, p.t, p.st, p.progress, out)
    const x1 = out[0] * cy + out[2] * sy
    const z1 = -out[0] * sy + out[2] * cy
    const y2 = out[1] * ct - z1 * stt
    const z2 = out[1] * stt + z1 * ct
    const persp = CAM / (CAM - z2)
    let px = half + x1 * scale * persp
    let py = half - y2 * scale * persp
    // Every dot eases toward its own target lean, so dots spring back when the cursor leaves.
    const [lx, ly] = p.cursor ? pull(px, py, p.cursor.x, p.cursor.y, reach) : [0, 0]
    offsets.x[i] += (lx - offsets.x[i]) * EASE
    offsets.y[i] += (ly - offsets.y[i]) * EASE
    px += offsets.x[i]
    py += offsets.y[i]

    const depth = clamp01((z2 + 1) / 2)
    const shade = clamp01((0.15 + 0.85 * depth) * out[4] + out[3] * 0.6 * preset.glow)
    const level = Math.min(levels - 1, Math.floor(shade * levels))
    const r = preset.radius * (preset.flat ? 0.85 + 0.3 * depth : (0.65 + 0.7 * depth) * persp) * (1 + out[3] * 0.9 * preset.glow)
    paths[level].rect(px - r, py - r, r * 2, r * 2)
    used[level] = 1
  }

  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = p.color
  for (let level = 0; level < levels; level++) {
    if (!used[level]) continue
    ctx.globalAlpha = 0.18 + 0.72 * (level / (levels - 1))
    ctx.fill(paths[level])
  }
  ctx.globalAlpha = 1
  return count
}
