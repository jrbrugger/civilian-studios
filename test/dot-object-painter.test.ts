import { paintDots, pull, type Painting } from "@/components/ui/dot-object-painter"
import { SIZES } from "@/components/ui/dot-object-engine"
import { cloudOf, sphereDots } from "@/components/ui/dot-object-models"

class FakePath2D {
  rects = 0
  rect() {
    this.rects++
  }
}
vi.stubGlobal("Path2D", FakePath2D)

function fakeContext() {
  const filled: FakePath2D[] = []
  return {
    filled,
    ctx: {
      fillStyle: "" as string | CanvasGradient | CanvasPattern,
      globalAlpha: 1,
      clearRect: vi.fn(),
      fill: (path: unknown) => void filled.push(path as FakePath2D),
    },
  }
}

function painting(over: Partial<Painting> = {}): Painting {
  return {
    model: cloudOf(sphereDots()),
    preset: SIZES.md,
    state: "idle",
    t: 1,
    st: 1,
    look: 0,
    cursor: null,
    offsets: { x: new Float32Array(8000), y: new Float32Array(8000) },
    color: "rgb(10, 20, 30)",
    ...over,
  }
}

describe("pull", () => {
  it("is zero outside the reach", () => {
    expect(pull(0, 0, 100, 0, 50)).toEqual([0, 0])
  })
  it("leans toward the cursor inside the reach", () => {
    const [dx, dy] = pull(0, 0, 20, -20, 50)
    expect(dx).toBeGreaterThan(0)
    expect(dy).toBeLessThan(0)
  })
  it("is strongest near the cursor", () => {
    // Same direction, so compare magnitudes: weight is (1 - d/reach)², distance is part of the vector.
    const near = Math.hypot(...pull(0, 0, 10, 0, 50))
    const far = Math.hypot(...pull(0, 0, 45, 0, 50))
    expect(near).toBeGreaterThan(far)
  })
})

describe("paintDots", () => {
  it("draws the preset's dots in at most `levels` fills, clears first and uses the given colour", () => {
    const { ctx, filled } = fakeContext()
    const drawn = paintDots(ctx, painting())
    expect(drawn).toBe(Math.min(cloudOf(sphereDots()).n, 2800))
    expect(filled.length).toBeGreaterThan(0)
    expect(filled.length).toBeLessThanOrEqual(SIZES.md.levels)
    expect(filled.reduce((sum, p) => sum + p.rects, 0)).toBe(drawn)
    expect(ctx.clearRect).toHaveBeenCalled()
    expect(ctx.fillStyle).toBe("rgb(10, 20, 30)")
  })

  it("scales the count with density", () => {
    const { ctx } = fakeContext()
    expect(paintDots(ctx, painting({ density: 0.5 }))).toBe(1400)
  })

  it("draws only the dots a smaller model has, without reading past it", () => {
    const { ctx } = fakeContext()
    const small = cloudOf(sphereDots(500))
    expect(paintDots(ctx, painting({ model: small, preset: SIZES.lg, offsets: { x: new Float32Array(10), y: new Float32Array(10) } }))).toBeLessThanOrEqual(10)
    expect(paintDots(ctx, painting({ model: small, preset: SIZES.lg }))).toBe(500)
  })

  it("lets gravity offsets decay toward zero when there is no cursor", () => {
    const { ctx } = fakeContext()
    const offsets = { x: new Float32Array(8000).fill(10), y: new Float32Array(8000).fill(-10) }
    paintDots(ctx, painting({ offsets }))
    expect(offsets.x[0]).toBeLessThan(10)
    expect(offsets.x[0]).toBeGreaterThan(0)
    expect(offsets.y[0]).toBeGreaterThan(-10)
  })

  it("pulls nearby dots toward the cursor", () => {
    const { ctx } = fakeContext()
    const offsets = { x: new Float32Array(8000), y: new Float32Array(8000) }
    paintDots(ctx, painting({ offsets, cursor: { x: 60, y: 60 } }))
    expect(Array.from(offsets.x.subarray(0, 2800)).some((v) => v !== 0)).toBe(true)
  })
})
