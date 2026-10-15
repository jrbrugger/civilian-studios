import { SIZES, TERMINAL, clampProgress, dotAt, hash, yawFor, type DotState } from "@/components/ui/dot-object-engine"

const N = 2000

/** An even spiral of unit-sphere points; flow runs from the top pole (0) to the bottom pole (1). */
function sphere(n = N) {
  const positions = new Float32Array(n * 3)
  const flow = new Float32Array(n)
  const g = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    positions.set([Math.cos(i * g) * r, y, Math.sin(i * g) * r], i * 3)
    flow[i] = (1 - y) / 2
  }
  return { positions, flow }
}

function run(state: DotState, t: number, st: number, progress?: number, n = N) {
  const { positions, flow } = sphere(n)
  const out = new Float32Array(5)
  const dots = Array.from({ length: n }, (_, i) => {
    dotAt(positions, flow, i, state, t, st, progress, out)
    return { x: out[0], y: out[1], z: out[2], glow: out[3], alpha: out[4], i }
  })
  return { dots, positions, flow }
}

describe("SIZES", () => {
  it("matches the approved presets", () => {
    expect(SIZES.sm).toEqual({ px: 64, fit: 0.38, dots: 520, radius: 0.5, spin: false, glow: 0.3, fps: 30, levels: 4, flat: true })
    expect(SIZES.md).toEqual({ px: 120, fit: 0.34, dots: 2800, radius: 0.42, spin: true, glow: 1, fps: 60, levels: 8, flat: false })
    expect(SIZES.lg).toEqual({ px: 340, fit: 0.34, dots: 7000, radius: 0.5, spin: true, glow: 1, fps: 60, levels: 8, flat: false })
    expect(TERMINAL).toEqual({ success: 2.2, error: 2.6 })
  })
})

describe("hash", () => {
  it("is deterministic and stays in 0..1", () => {
    for (let i = 0; i < 200; i++) {
      const h = hash(i, 3)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(1)
      expect(hash(i, 3)).toBe(h)
    }
  })
})

describe("dotAt", () => {
  it("success puts every dot back on its model position, fully opaque, when it settles", () => {
    const { dots, positions } = run("success", 5, TERMINAL.success!)
    for (const d of dots) {
      expect(d.x).toBeCloseTo(positions[d.i * 3], 5)
      expect(d.y).toBeCloseTo(positions[d.i * 3 + 1], 5)
      expect(d.z).toBeCloseTo(positions[d.i * 3 + 2], 5)
      expect(d.alpha).toBeCloseTo(1, 5)
    }
  })

  it("error leaves at least 80% of dots invisible and the rest as ash at or above the base", () => {
    const { dots } = run("error", 5, TERMINAL.error!)
    expect(dots.filter((d) => d.alpha < 0.05).length / N).toBeGreaterThanOrEqual(0.8)
    for (const d of dots.filter((d) => d.alpha >= 0.05)) expect(d.y).toBeGreaterThanOrEqual(-1)
  })

  it("idle and thinking start fully opaque", () => {
    for (const state of ["idle", "thinking"] as const) {
      for (const d of run(state, 0, 0).dots) expect(d.alpha).toBe(1)
    }
  })

  it("progress reveals dots head to tail and leaves the tail as a faint ghost", () => {
    const { dots, flow } = run("working", 0, 0, 0.3)
    // Embers (a tenth of the dots) fade on their own schedule; judge the rest.
    const steady = dots.filter((d) => hash(d.i, 7) >= 0.1)
    expect(steady.filter((d) => flow[d.i] < 0.2).every((d) => d.alpha > 0.9)).toBe(true)
    expect(steady.filter((d) => flow[d.i] > 0.6).every((d) => d.alpha < 0.1)).toBe(true)
  })

  it("lost sends between 20% and 45% of dots wandering", () => {
    const { dots, positions } = run("lost", 10, 0)
    const moved = dots.filter((d) => Math.hypot(d.x - positions[d.i * 3], d.y - positions[d.i * 3 + 1], d.z - positions[d.i * 3 + 2]) > 0.05)
    expect(moved.length / N).toBeGreaterThan(0.2)
    expect(moved.length / N).toBeLessThan(0.45)
  })
})

describe("yawFor", () => {
  it("thinking spins on md and lg", () => {
    expect(yawFor("thinking", SIZES.lg, 2, 0, 0)).toBeGreaterThan(yawFor("thinking", SIZES.lg, 1, 0, 0))
  })
  it("sm only sways", () => {
    for (const t of [0, 1, 2.5, 10, 100]) expect(Math.abs(yawFor("thinking", SIZES.sm, t, 0, 0) - 0.5)).toBeLessThanOrEqual(0.23)
  })
})

describe("clampProgress", () => {
  it("clamps to 0..1 and treats NaN or undefined as no progress", () => {
    expect(clampProgress(-1)).toBe(0)
    expect(clampProgress(2)).toBe(1)
    expect(clampProgress(0.4)).toBe(0.4)
    expect(clampProgress(NaN)).toBeUndefined()
    expect(clampProgress(undefined)).toBeUndefined()
  })
})
