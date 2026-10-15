import { hash } from "@/components/ui/dot-object-engine"

/**
 * What you pass to `DotObject`: plain data (dot count and the dots as base64), so a Server Component can hand
 * it to the client. Typed arrays can't make that trip: React transfers their buffers and leaves them detached.
 */
export interface DotModel {
  n: number
  /** See `encodeModel`. */
  data: string
}

/** A decoded model: positions (x, y, z per dot, within -1..1) and a head-to-tail flow value (0..1) per dot. */
export interface DotCloud {
  n: number
  positions: Float32Array
  flow: Float32Array
}

/** Compact form: base64 of Int16 x, y, z (scaled by 32767) per dot, then Uint8 flow (scaled by 255) per dot. */
export function encodeModel(m: DotCloud): string {
  const bytes = new Uint8Array(m.n * 7)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < m.n * 3; i++) view.setInt16(i * 2, Math.round(Math.max(-1, Math.min(1, m.positions[i])) * 32767), true)
  for (let i = 0; i < m.n; i++) bytes[m.n * 6 + i] = Math.round(m.flow[i] * 255)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function decodeModel(data: string): DotCloud {
  const binary = atob(data)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  const n = bytes.length / 7
  const view = new DataView(bytes.buffer)
  const positions = new Float32Array(n * 3)
  const flow = new Float32Array(n)
  for (let i = 0; i < n * 3; i++) positions[i] = view.getInt16(i * 2, true) / 32767
  for (let i = 0; i < n; i++) flow[i] = bytes[n * 6 + i] / 255
  return { n, positions, flow }
}

/**
 * Order the first `k` dots by farthest-point sampling (starting at index 0), then the rest as they were.
 * Any prefix of the first `k` is an evenly spread sample of the shape, so a small preset keeps the whole silhouette.
 */
export function spreadOrder(positions: Float32Array, k: number): Uint32Array {
  const n = positions.length / 3
  const order = new Uint32Array(n)
  const taken = new Uint8Array(n)
  const near = new Float32Array(n).fill(Infinity)
  const picks = Math.min(k, n)
  let count = 0
  if (n > 0) {
    order[count++] = 0
    taken[0] = 1
  }
  for (let cur = 0; count < picks; ) {
    let best = -1
    let bestDist = -1
    for (let i = 0; i < n; i++) {
      const dx = positions[i * 3] - positions[cur * 3]
      const dy = positions[i * 3 + 1] - positions[cur * 3 + 1]
      const dz = positions[i * 3 + 2] - positions[cur * 3 + 2]
      const d = dx * dx + dy * dy + dz * dz
      if (d < near[i]) near[i] = d
      if (!taken[i] && near[i] > bestDist) {
        bestDist = near[i]
        best = i
      }
    }
    taken[best] = 1
    order[count++] = best
    cur = best
  }
  for (let i = 0; i < n; i++) if (!taken[i]) order[count++] = i
  return order
}

export function reorder(m: DotCloud, order: Uint32Array): DotCloud {
  const positions = new Float32Array(m.n * 3)
  const flow = new Float32Array(m.n)
  order.forEach((from, to) => {
    positions.set(m.positions.subarray(from * 3, from * 3 + 3), to * 3)
    flow[to] = m.flow[from]
  })
  return { n: m.n, positions, flow }
}

const decoded = new Map<string, DotCloud>()

/** The dots of a model, decoded once and shared. Call it on the client, where the dots are drawn. */
export function cloudOf(model: DotModel): DotCloud {
  let cloud = decoded.get(model.data)
  if (!cloud) decoded.set(model.data, (cloud = decodeModel(model.data)))
  return cloud
}

const SPREAD = 600
const cache = new Map<string, DotModel>()

/** Shuffle deterministically, flow top pole to bottom pole, then spread the first dots so any prefix is even. */
function fromPoints(points: [number, number, number][]): DotModel {
  const shuffle = points.map((_, i) => i)
  for (let i = shuffle.length - 1; i > 0; i--) {
    const j = Math.floor(hash(i, 5) * (i + 1))
    ;[shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]]
  }
  const positions = new Float32Array(points.length * 3)
  const flow = new Float32Array(points.length)
  shuffle.forEach((from, to) => {
    positions.set(points[from], to * 3)
    flow[to] = (1 - points[from][1]) / 2
  })
  const cloud = reorder({ n: points.length, positions, flow }, spreadOrder(positions, SPREAD))
  const data = encodeModel(cloud)
  const model = { n: cloud.n, data }
  decoded.set(data, cloud)
  return model
}

function memo(key: string, make: () => DotModel): DotModel {
  let m = cache.get(key)
  if (!m) cache.set(key, (m = make()))
  return m
}

/** An even spiral of dots over a unit sphere. */
export function sphereDots(count = 4200): DotModel {
  return memo(`dots:${count}`, () => {
    const golden = Math.PI * (3 - Math.sqrt(5))
    const points = Array.from({ length: count }, (_, i): [number, number, number] => {
      const y = 1 - (2 * (i + 0.5)) / count
      const r = Math.sqrt(1 - y * y)
      return [Math.cos(i * golden) * r, y, Math.sin(i * golden) * r]
    })
    return fromPoints(points)
  })
}

/** Dots packed along latitude rings and meridians: reads as a wireframe globe. */
export function sphereLines(rings = 11, meridians = 14, perLine = 150): DotModel {
  return memo(`lines:${rings}:${meridians}:${perLine}`, () => {
    const points: [number, number, number][] = []
    for (let k = 1; k < rings; k++) {
      const lat = Math.PI * (k / rings)
      const y = Math.cos(lat)
      const r = Math.sin(lat)
      const m = Math.round(perLine * r)
      for (let i = 0; i < m; i++) {
        const a = (i / m) * Math.PI * 2
        points.push([Math.cos(a) * r, y, Math.sin(a) * r])
      }
    }
    for (let j = 0; j < meridians; j++) {
      const a = (j / meridians) * Math.PI * 2
      for (let i = 0; i <= perLine / 2; i++) {
        const lat = Math.PI * (i / (perLine / 2))
        points.push([Math.cos(a) * Math.sin(lat), Math.cos(lat), Math.sin(a) * Math.sin(lat)])
      }
    }
    return fromPoints(points)
  })
}
