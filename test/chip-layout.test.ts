import { computeBlocks, type ChipRect } from "@/components/ui/chip-layout"

const chip = (id: string, x: number, y: number, w = 80): ChipRect => ({ id, x, y, w, h: 32 })
const on = (...ids: string[]) => new Set(ids)

describe("computeBlocks", () => {
  it("leaves unselected chips untouched", () => {
    const b = computeBlocks([chip("a", 0, 0), chip("b", 88, 0)], on())
    expect(b.a).toMatchObject({ left: false, right: false, up: false, down: false, rows: 0 })
  })

  it("joins selected neighbours on the same row and squares their inner corners", () => {
    const b = computeBlocks([chip("a", 0, 0), chip("b", 88, 0)], on("a", "b"))
    expect(b.a).toMatchObject({ right: true, corners: { tl: false, bl: false, tr: true, br: true } })
    expect(b.b).toMatchObject({ left: true, corners: { tl: true, bl: true, tr: false, br: false } })
  })

  it("mirrors the corners when the row runs right-to-left", () => {
    // Reading order is a then b; in RTL a sits on the right.
    const b = computeBlocks([chip("a", 88, 0), chip("b", 0, 0)], on("a", "b"), { rtl: true })
    expect(b.a).toMatchObject({ left: true, right: false, corners: { tl: true, bl: true, tr: false, br: false } })
    expect(b.b).toMatchObject({ left: false, right: true, corners: { tl: false, bl: false, tr: true, br: true } })
  })

  it("counts the joins before each chip, so the whole rest of the row shifts, not just joined chips", () => {
    const b = computeBlocks(
      [chip("a", 0, 0), chip("b", 88, 0), chip("c", 176, 0), chip("d", 264, 0), chip("e", 352, 0)],
      on("a", "b", "d", "e")
    )
    expect([b.a, b.b, b.c, b.d, b.e].map((x) => x.shift)).toEqual([0, 1, 1, 1, 2])
  })

  it("restarts the count on each row", () => {
    const b = computeBlocks([chip("a", 0, 0), chip("b", 88, 0), chip("c", 0, 40)], on("a", "b"))
    expect(b.c.shift).toBe(0)
  })

  it("judges stacking by where the pulled-in chips actually sit", () => {
    // c sits under b at rest, but b is pulled 60px left by its join with a, which leaves c barely covered.
    const rects = [chip("a", 0, 0), chip("b", 88, 0), chip("c", 100, 40)]
    expect(computeBlocks(rects, on("a", "b", "c"), { pull: 0 }).c.up).toBe(true)
    expect(computeBlocks(rects, on("a", "b", "c"), { pull: 60 }).c.up).toBe(false)
  })

  it("does not join through an unselected chip", () => {
    const b = computeBlocks([chip("a", 0, 0), chip("b", 88, 0), chip("c", 176, 0)], on("a", "c"))
    expect(b.a.right).toBe(false)
    expect(b.c.left).toBe(false)
  })

  it("never joins list neighbours across a line break", () => {
    const b = computeBlocks([chip("a", 300, 0), chip("b", 0, 40)], on("a", "b"))
    expect(b.a.right).toBe(false)
    expect(b.b.left).toBe(false)
  })

  it("lifts a selected chip to meet an overlapping selected chip in the row above", () => {
    const b = computeBlocks([chip("a", 0, 0, 100), chip("b", 120, 0), chip("c", 0, 40, 60)], on("a", "c"))
    expect(b.c).toMatchObject({ up: true, rows: 1, corners: { tl: true, tr: true } })
    expect(b.a).toMatchObject({ down: true, corners: { bl: true, br: false } })
  })

  it("leaves a chip down when the row above only barely reaches it", () => {
    // 30 of 100px covered: it stays beside its own row instead of hanging off the edge of the row above.
    const b = computeBlocks([chip("a", 0, 0, 100), chip("c", 70, 40, 100)], on("a", "c"))
    expect(b.c.up).toBe(false)
    expect(b.a.down).toBe(false)
  })

  it("joins when several selected chips above together cover most of it", () => {
    const b = computeBlocks([chip("a", 0, 0, 60), chip("b", 60, 0, 60), chip("c", 20, 40, 80)], on("a", "b", "c"))
    expect(b.c.up).toBe(true)
  })

  it("splits a sideways join when only one of the two lifts to the row above", () => {
    // c sits under a and lifts; d is c's neighbour but has nothing above it, so it would hang at a different height.
    const b = computeBlocks([chip("a", 0, 0, 135), chip("c", 0, 40, 100), chip("d", 108, 40, 120)], on("a", "c", "d"))
    expect(b.c).toMatchObject({ up: true, right: false })
    expect(b.d).toMatchObject({ up: false, left: false, shift: 0 })
  })

  it("keeps a sideways join when both lift together", () => {
    const b = computeBlocks([chip("a", 0, 0, 100), chip("b", 108, 0, 100), chip("c", 0, 40, 100), chip("d", 108, 40, 100)], on("a", "b", "c", "d"))
    expect(b.c.right).toBe(true)
    expect(b.d.left).toBe(true)
  })

  it("joins sideways only when stacking is off", () => {
    const b = computeBlocks(
      [chip("a", 0, 0, 100), chip("b", 108, 0, 100), chip("c", 0, 40, 100)],
      on("a", "b", "c"),
      { stack: false }
    )
    expect(b.b.left).toBe(true)
    expect(b.c).toMatchObject({ up: false, rows: 0 })
    expect(b.a.down).toBe(false)
  })

  it("needs at least MIN_OVERLAP px of shared edge to join rows", () => {
    const b = computeBlocks([chip("a", 0, 0, 100), chip("c", 90, 40, 80)], on("a", "c"))
    expect(b.c.up).toBe(false)
    expect(b.a.down).toBe(false)
  })

  it("stacks lifts across three rows", () => {
    const b = computeBlocks([chip("a", 0, 0), chip("b", 0, 40), chip("c", 0, 80)], on("a", "b", "c"))
    expect(b.b.rows).toBe(1)
    expect(b.c.rows).toBe(2)
  })

  it("treats chips within a pixel of the same top as one row", () => {
    const b = computeBlocks([chip("a", 0, 0), chip("b", 88, 0.4)], on("a", "b"))
    expect(b.b.left).toBe(true)
  })
})
