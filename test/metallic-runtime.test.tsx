import { act, render } from "@testing-library/react"

import { MetallicRuntime, jam, motionScale, reducedMotion } from "@/components/ui/metallic-runtime"

const tick = () => new Promise((r) => setTimeout(r, 0))

function setup(html: string) {
  document.documentElement.setAttribute("data-material", "metallic")
  document.body.innerHTML = html
  return render(<MetallicRuntime />)
}

afterEach(() => {
  document.documentElement.removeAttribute("data-material")
  document.documentElement.removeAttribute("data-rm")
  delete document.documentElement.dataset.modality
  document.body.innerHTML = ""
})

describe("MetallicRuntime", () => {
  it("renders nothing", () => {
    const { container } = setup("")
    expect(container.innerHTML).toBe("")
  })

  it("remembers whether the last input was a pointer or a key, for keyboard-only focus outlines", () => {
    setup('<button id="b">x</button>')
    const b = document.getElementById("b")!
    act(() => void b.dispatchEvent(new Event("pointerdown", { bubbles: true })))
    expect(document.documentElement.dataset.modality).toBe("pointer")
    act(() => void b.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })))
    expect(document.documentElement.dataset.modality).toBe("keyboard")
    act(() => void b.dispatchEvent(new KeyboardEvent("keydown", { key: "c", metaKey: true, bubbles: true })))
    expect(document.documentElement.dataset.modality).toBe("keyboard")
  })

  it("pops a toggle that a person turns on, but not one that was already on at mount", async () => {
    setup('<div data-material="metallic"><button id="t" data-slot="toggle" data-state="off"></button><button id="u" data-slot="toggle" data-state="on"></button></div>')
    const t = document.getElementById("t")!
    expect(t.hasAttribute("data-pop")).toBe(false)
    expect(document.getElementById("u")!.hasAttribute("data-pop")).toBe(false)
    await act(async () => {
      t.setAttribute("data-state", "on")
      await tick()
    })
    expect(t.hasAttribute("data-pop")).toBe(true)
  })

  it("does nothing outside a metallic scope", async () => {
    document.documentElement.removeAttribute("data-material")
    setup('<button id="t" data-slot="toggle" data-state="off"></button>')
    document.documentElement.removeAttribute("data-material")
    await act(async () => {
      document.getElementById("t")!.setAttribute("data-state", "on")
      await tick()
    })
    expect(document.getElementById("t")!.hasAttribute("data-pop")).toBe(false)
  })

  it("stays still under reduced motion", async () => {
    setup('<div data-material="metallic"><button id="t" data-slot="toggle" data-state="off"></button></div>')
    document.documentElement.setAttribute("data-rm", "")
    await act(async () => {
      document.getElementById("t")!.setAttribute("data-state", "on")
      await tick()
    })
    expect(document.getElementById("t")!.hasAttribute("data-pop")).toBe(false)
    expect(reducedMotion()).toBe(true)
  })

  it("lets a slider glide on a click or an arrow key, and follows the pointer exactly while dragging", () => {
    setup('<div data-material="metallic"><div id="s" data-slot="slider"><span id="thumb"></span></div></div>')
    const s = document.getElementById("s")!
    const thumb = document.getElementById("thumb")!
    act(() => void thumb.dispatchEvent(new Event("pointerdown", { bubbles: true })))
    expect(s.hasAttribute("data-glide")).toBe(true)
    const move = new Event("pointermove", { bubbles: true }) as Event & { buttons: number }
    Object.defineProperty(move, "buttons", { value: 1 })
    act(() => void thumb.dispatchEvent(move))
    expect(s.hasAttribute("data-glide")).toBe(false)
    act(() => void thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })))
    expect(s.hasAttribute("data-glide")).toBe(true)
  })

  it("pops only the calendar day that was just picked", async () => {
    const week = (picked: string) =>
      `<div data-material="metallic"><div data-slot="calendar">${["1", "2", "3"].map((d) => `<button data-day="${d}" ${d === picked ? 'data-selected-single="true"' : ""}></button>`).join("")}</div></div>`
    setup(week("1"))
    await act(async () => {
      // react-day-picker rebuilds the grid, so the runtime sees new nodes rather than a changed attribute.
      document.body.innerHTML = week("2")
      await tick()
    })
    const days = [...document.querySelectorAll<HTMLElement>("[data-day]")]
    expect(days.map((d) => d.hasAttribute("data-pop"))).toEqual([false, true, false])
  })
})

describe("helpers", () => {
  it("motionScale falls back to 1 when the theme is not measurable", () => {
    expect(motionScale(document.documentElement)).toBe(1)
  })

  it("jam ignores a missing element and does nothing under reduced motion", () => {
    expect(() => jam(null)).not.toThrow()
    document.documentElement.setAttribute("data-rm", "")
    const el = document.createElement("div")
    const animate = vi.fn()
    el.animate = animate
    jam(el)
    expect(animate).not.toHaveBeenCalled()
  })
})
