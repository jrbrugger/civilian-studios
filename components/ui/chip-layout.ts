export interface ChipRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface ChipCorners {
  tl: boolean
  tr: boolean
  bl: boolean
  br: boolean
}

export interface ChipBlock {
  /** Joined to the chip physically beside it on the same row (left/right follow the layout, so RTL works). */
  left: boolean
  right: boolean
  /** Joins earlier in this chip's row, in reading order. Each one pulls the rest of the row in by `pull` px. */
  shift: number
  /** Joined to a selected chip in the row above / below. */
  up: boolean
  down: boolean
  /** Rows this chip lifts by, so it stays flush with a lifted chip above it. */
  rows: number
  /** Corners that touch a neighbour and square off. */
  corners: ChipCorners
}

/** Minimum shared edge (px) before chips on adjacent rows count as touching. */
export const MIN_OVERLAP = 12
/** Share of a chip's width the selected chips above must cover before it joins them and lifts. */
export const MIN_COVER = 0.5
/** Tolerance (px) when deciding whether a neighbour covers a corner. */
const EDGE = 1.5

export interface BlockOptions {
  /** How far each join pulls the rest of its row in (px). Visual only: layout never changes. */
  pull?: number
  /** The row runs right-to-left, so the previous chip in reading order sits on the right. */
  rtl?: boolean
  /** Also join chips across wrapped rows. Defaults to true; false joins sideways only. */
  stack?: boolean
}

/**
 * Works out how selected chips join, from their resting layout (rects in DOM
 * order). Joins are drawn with transforms, so they never move the resting
 * layout, never change how the row wraps and never feed back into this
 * measurement. Same-row neighbours join sideways; a selected chip mostly
 * covered by selected chips in the row above joins upward and lifts to meet
 * them, stacking across rows. Pure: no DOM.
 */
export function computeBlocks(
  rects: readonly ChipRect[],
  selected: ReadonlySet<string>,
  options: BlockOptions = {}
): Record<string, ChipBlock> {
  // Chips on one row can only stay joined sideways if they end up at the same height. When
  // one lifts to meet the row above and its neighbour doesn't, split them and measure again.
  // Splits only ever accumulate, so this settles within a few passes.
  const split = new Set<string>()
  for (let pass = 0; pass <= rects.length; pass++) {
    const blocks = layout(rects, selected, options, split)
    const before = split.size
    rects.forEach((r, i) => {
      if (i > 0 && blocks[r.id].shift > blocks[rects[i - 1].id].shift && blocks[r.id].rows !== blocks[rects[i - 1].id].rows) split.add(r.id)
    })
    if (split.size === before) return blocks
  }
  return layout(rects, selected, options, split)
}

function layout(
  rects: readonly ChipRect[],
  selected: ReadonlySet<string>,
  { pull = 0, rtl = false, stack = true }: BlockOptions,
  split: ReadonlySet<string>
): Record<string, ChipBlock> {
  const rowTops = [...new Set(rects.map((r) => Math.round(r.y)))].sort((a, b) => a - b)
  const rowOf = (r: ChipRect) => rowTops.indexOf(Math.round(r.y))
  const isOn = (i: number) => i >= 0 && i < rects.length && selected.has(rects[i].id)

  const blocks: Record<string, ChipBlock> = {}
  rects.forEach((r, i) => {
    const on = isOn(i)
    const joinsPrev = on && isOn(i - 1) && rowOf(rects[i - 1]) === rowOf(r) && !split.has(r.id)
    const joinsNext = on && isOn(i + 1) && rowOf(rects[i + 1]) === rowOf(r) && !split.has(rects[i + 1].id)
    // The previous chip sits on the left unless the row runs right-to-left.
    const left = rtl ? joinsNext : joinsPrev
    const right = rtl ? joinsPrev : joinsNext
    const sameRowAsPrev = i > 0 && rowOf(rects[i - 1]) === rowOf(r)
    const shift = (sameRowAsPrev ? blocks[rects[i - 1].id].shift : 0) + (joinsPrev ? 1 : 0)
    blocks[r.id] = { left, right, shift, up: false, down: false, rows: 0, corners: { tl: left, bl: left, tr: right, br: right } }
  })

  // Where each chip actually sits once its row has been pulled in.
  const seen = new Map(rects.map((r) => [r.id, { ...r, x: r.x + (rtl ? 1 : -1) * blocks[r.id].shift * pull }]))
  const shown = rects.map((r) => seen.get(r.id)!)

  const overlap = (a: ChipRect, b: ChipRect) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  // Top row first, so each chip's lift can stack on the lift of the chip above it.
  const chosen = shown.filter((r) => stack && selected.has(r.id)).sort((a, b) => rowOf(a) - rowOf(b) || a.x - b.x)
  for (const r of chosen) {
    const row = rowOf(r)
    const above = chosen.filter((a) => rowOf(a) === row - 1 && overlap(a, r) >= MIN_OVERLAP)
    // A chip only hanging off the edge of the row above stays down, beside its own row.
    if (!above.length || above.reduce((sum, a) => sum + overlap(a, r), 0) < MIN_COVER * r.w) continue
    const me = blocks[r.id]
    me.up = true
    me.rows = 1 + Math.max(...above.map((a) => blocks[a.id].rows))
    if (above.some((a) => a.x <= r.x + EDGE)) me.corners.tl = true
    if (above.some((a) => a.x + a.w >= r.x + r.w - EDGE)) me.corners.tr = true
    for (const a of above) {
      const up = blocks[a.id]
      up.down = true
      if (r.x <= a.x + EDGE) up.corners.bl = true
      if (r.x + r.w >= a.x + a.w - EDGE) up.corners.br = true
    }
  }
  return blocks
}
