import { cloudOf, decodeModel, encodeModel, reorder, spreadOrder, sphereDots, sphereLines, type DotCloud } from "@/components/ui/dot-object-models"

function randomModel(n: number): DotCloud {
  const positions = new Float32Array(n * 3)
  const flow = new Float32Array(n)
  let seed = 1
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let i = 0; i < n; i++) {
    positions.set([rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1], i * 3)
    flow[i] = rand()
  }
  return { n, positions, flow }
}

function minPairDistance(positions: Float32Array, idx: ArrayLike<number>, count: number) {
  let min = Infinity
  for (let a = 0; a < count; a++) {
    for (let b = a + 1; b < count; b++) {
      const i = idx[a]
      const j = idx[b]
      min = Math.min(min, Math.hypot(positions[i * 3] - positions[j * 3], positions[i * 3 + 1] - positions[j * 3 + 1], positions[i * 3 + 2] - positions[j * 3 + 2]))
    }
  }
  return min
}

describe("encodeModel / decodeModel", () => {
  it("round-trips within quantisation error", () => {
    const m = randomModel(300)
    const back = decodeModel(encodeModel(m))
    expect(back.n).toBe(300)
    for (let i = 0; i < m.positions.length; i++) expect(Math.abs(back.positions[i] - m.positions[i])).toBeLessThanOrEqual(2 / 32767)
    for (let i = 0; i < m.n; i++) expect(Math.abs(back.flow[i] - m.flow[i])).toBeLessThanOrEqual(1 / 255)
  })
})

describe("spreadOrder", () => {
  it("returns a permutation", () => {
    const order = spreadOrder(randomModel(2000).positions, 300)
    expect(order).toHaveLength(2000)
    expect(new Set(order).size).toBe(2000)
  })
  it("spreads its first picks further apart than the original order does", () => {
    const m = randomModel(2000)
    const order = spreadOrder(m.positions, 100)
    const original = Uint32Array.from({ length: 100 }, (_, i) => i)
    expect(minPairDistance(m.positions, order, 100)).toBeGreaterThan(minPairDistance(m.positions, original, 100))
  })
  it("reorder applies the order to positions and flow together", () => {
    const m = randomModel(50)
    const order = spreadOrder(m.positions, 10)
    const r = reorder(m, order)
    expect(r.n).toBe(50)
    expect(r.flow[3]).toBe(m.flow[order[3]])
    expect(r.positions[3 * 3 + 1]).toBe(m.positions[order[3] * 3 + 1])
  })
})

describe("DotModel", () => {
  it("is plain data, so a Server Component can pass it to DotObject", () => {
    const m = sphereDots(300)
    expect(JSON.parse(JSON.stringify(m))).toEqual(m)
    expect(Object.keys(m).sort()).toEqual(["data", "n"])
  })
  it("decodes once per model with cloudOf", () => {
    const m = sphereDots(300)
    const cloud = cloudOf(m)
    expect(cloud.n).toBe(300)
    expect(cloudOf({ ...m })).toBe(cloud)
  })
})

describe("procedural spheres", () => {
  const radii = (m: DotCloud) => Array.from({ length: m.n }, (_, i) => Math.hypot(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]))
  it("sphereDots lies on the unit sphere, with flow in 0..1, and is memoised", () => {
    const m = sphereDots(500)
    expect(m.n).toBe(500)
    const cloud = cloudOf(m)
    expect(cloud.n).toBe(500)
    for (const r of radii(cloud)) expect(r).toBeCloseTo(1, 4)
    for (const f of cloud.flow) expect(f >= 0 && f <= 1).toBe(true)
    expect(sphereDots(500)).toBe(m)
  })
  it("sphereDots prefixes cover the whole sphere, not one cap", () => {
    const m = cloudOf(sphereDots(4200))
    const ys = Array.from({ length: 2800 }, (_, i) => m.positions[i * 3 + 1])
    expect(Math.min(...ys)).toBeLessThan(-0.95)
    expect(Math.max(...ys)).toBeGreaterThan(0.95)
  })
  it("sphereLines lies on the unit sphere with plenty of dots", () => {
    const m = sphereLines()
    expect(m.n).toBeGreaterThan(2000)
    for (const r of radii(cloudOf(m))) expect(r).toBeCloseTo(1, 4)
    expect(sphereLines()).toBe(m)
  })
})

describe("baked models", () => {
  it.each([
    ["dragon", () => import("@/components/ui/dot-object-dragon").then((m) => m.dragon), 7000],
    ["brain", () => import("@/components/ui/dot-object-brain").then((m) => m.brain), 5000],
  ] as const)("%s has the expected dots, inside the unit cube, with flow in 0..1", async (_name, load, n) => {
    const m = cloudOf(await load())
    expect(m.n).toBe(n)
    expect(m.positions).toHaveLength(n * 3)
    expect(Math.max(...Array.from(m.positions, Math.abs))).toBeLessThanOrEqual(1)
    expect(Math.min(...m.flow)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...m.flow)).toBeLessThanOrEqual(1)
  })
})
