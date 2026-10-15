import { CLOSE_TIMINGS, closeStartMs, removeChip, springEasing } from "@/components/ui/chip-motion"

describe("closeStartMs", () => {
  it("starts the gap close partway through the effect", () => {
    expect(closeStartMs("fade", "overlap")).toBe(100)
    expect(closeStartMs("blur", "glide")).toBeCloseTo(238)
  })
  it("starts immediately for collapse, which is itself a gap close", () => {
    expect(closeStartMs("collapse", "inout")).toBe(0)
  })
})

describe("springEasing", () => {
  it("produces a CSS linear() curve from 0 to exactly 1", () => {
    const easing = springEasing(0.72)
    expect(easing.startsWith("linear(0.0000,")).toBe(true)
    expect(easing.endsWith(", 1)")).toBe(true)
  })
  it("stays finite for undamped and critically damped extremes instead of hanging or giving NaN", () => {
    expect(springEasing(0)).not.toContain("NaN")
    expect(springEasing(1)).not.toContain("NaN")
    expect(springEasing(2)).not.toContain("NaN")
  })
})

describe("removeChip", () => {
  afterEach(() => vi.useRealTimers())
  const chipEl = () => {
    const el = document.createElement("li")
    document.body.append(el)
    return { el, animate: vi.spyOn(el, "animate") }
  }

  it("uses a 120ms fade and an instant close under reduced motion", async () => {
    const { el, animate } = chipEl()
    await removeChip(el, { removal: "blur", reducedMotion: true })
    expect(animate.mock.calls[0][1]).toMatchObject({ duration: 120 })
    expect(animate.mock.calls[1][1]).toMatchObject({ duration: 0 })
  })

  it("plays the effect, then closes the gap on the chosen curve", async () => {
    vi.useFakeTimers()
    const { el, animate } = chipEl()
    const done = removeChip(el, { removal: "fade", close: "glide", reducedMotion: false })
    expect(animate).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(closeStartMs("fade", "glide"))
    expect(animate).toHaveBeenCalledTimes(2)
    expect(animate.mock.calls[1][1]).toMatchObject({ duration: CLOSE_TIMINGS.glide.duration, easing: CLOSE_TIMINGS.glide.easing })
    await done
    expect(el.style.pointerEvents).toBe("none")
  })
})

describe("removeChip without the Web Animations API", () => {
  it("resolves instead of throwing (e.g. in a consumer's jsdom tests)", async () => {
    const el = document.createElement("li")
    Object.defineProperty(el, "animate", { value: undefined })
    await expect(removeChip(el, { removal: "fade", reducedMotion: false })).resolves.toBeUndefined()
  })
})

describe("removeChip when an animation is cancelled", () => {
  it("resolves instead of rejecting (e.g. the page hides or the element is detached)", async () => {
    const el = document.createElement("li")
    Object.defineProperty(el, "animate", {
      value: () => ({ finished: Promise.reject(new DOMException("cancelled", "AbortError")) }),
    })
    await expect(removeChip(el, { removal: "fade", reducedMotion: true })).resolves.toBeUndefined()
  })
})
