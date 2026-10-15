import { act, render, screen } from "@testing-library/react"

import { DotObject, ShimmerText } from "@/components/ui/dot-object"
import { sphereDots } from "@/components/ui/dot-object-models"
import { axeViolations } from "./axe"

const model = sphereDots(600)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout", "performance", "Date"] })
  // jsdom prints "not implemented" for canvas; the component must cope with having no context.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const seconds = (s: number) => act(() => void vi.advanceTimersByTime(s * 1000))

describe("DotObject", () => {
  it("renders a silent status region on mount and announces state changes", () => {
    const { rerender } = render(<DotObject model={model} label="Ready" />)
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("")
    rerender(<DotObject model={model} label="Thinking…" state="thinking" />)
    expect(status).toHaveTextContent("Thinking…")
  })

  it("does not announce a label change that keeps the same state", () => {
    const { rerender } = render(<DotObject model={model} label="Searching…" state="working" />)
    rerender(<DotObject model={model} label="Reading 3 files…" state="working" />)
    expect(screen.getByRole("status")).toHaveTextContent("")
  })

  it("hides the canvas and the visible label from assistive technology", () => {
    const { container, rerender } = render(<DotObject model={model} label="Thinking…" state="thinking" showLabel />)
    expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true")
    const text = container.querySelector('[data-slot="shimmer-text"]')!
    expect(text).toHaveAttribute("aria-hidden", "true")
    expect(text).toHaveAttribute("data-busy")
    rerender(<DotObject model={model} label="Done" state="idle" showLabel />)
    expect(container.querySelector('[data-slot="shimmer-text"]')).not.toHaveAttribute("data-busy")
  })

  it("sizes the box from the preset", () => {
    const { container, rerender } = render(<DotObject model={model} label="Ready" size="sm" />)
    expect(container.querySelector("canvas")!.parentElement).toHaveStyle({ width: "64px", height: "64px" })
    rerender(<DotObject model={model} label="Ready" size="lg" />)
    expect(container.querySelector("canvas")!.parentElement).toHaveStyle({ width: "340px" })
  })

  it("renders and runs frames without a canvas context", () => {
    render(<DotObject model={model} label="Ready" state="thinking" />)
    expect(() => seconds(1)).not.toThrow()
  })

  it("draws one frame while paused instead of staying blank", () => {
    const clearRect = vi.fn()
    const ctx = { setTransform() {}, clearRect, fill() {}, fillStyle: "", globalAlpha: 1 }
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    vi.stubGlobal("Path2D", class { rect() {} })
    render(<DotObject model={model} label="Ready" state="thinking" paused />)
    seconds(1)
    expect(clearRect).toHaveBeenCalledTimes(1)
  })

  it("does not settle while paused", () => {
    const onSettled = vi.fn()
    render(<DotObject model={model} label="Done" state="success" paused onSettled={onSettled} />)
    seconds(5)
    expect(onSettled).not.toHaveBeenCalled()
  })

  it("renders where matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined)
    expect(() => render(<DotObject model={model} label="Ready" />)).not.toThrow()
  })

  it("calls onSettled once after a success finishes", () => {
    const onSettled = vi.fn()
    render(<DotObject model={model} label="Done" state="success" onSettled={onSettled} />)
    seconds(1)
    expect(onSettled).not.toHaveBeenCalled()
    seconds(2)
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledWith("success")
    seconds(5)
    expect(onSettled).toHaveBeenCalledTimes(1)
  })

  it("starts a new state from its beginning and never settles the old one", () => {
    const onSettled = vi.fn()
    const { rerender } = render(<DotObject model={model} label="Done" state="success" onSettled={onSettled} />)
    seconds(1.5)
    rerender(<DotObject model={model} label="Failed" state="error" onSettled={onSettled} />)
    seconds(1.5)
    expect(onSettled).not.toHaveBeenCalled()
    seconds(1.5)
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledWith("error")
  })

  it("settles again when a finished state is followed by another one", () => {
    const onSettled = vi.fn()
    const { rerender } = render(<DotObject model={model} label="Done" state="success" onSettled={onSettled} />)
    seconds(3)
    rerender(<DotObject model={model} label="Failed" state="error" onSettled={onSettled} />)
    seconds(3)
    expect(onSettled.mock.calls.map((c) => c[0])).toEqual(["success", "error"])
  })

  it("settles right away under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList)
    const onSettled = vi.fn()
    render(<DotObject model={model} label="Done" state="success" onSettled={onSettled} />)
    seconds(0.1)
    expect(onSettled).toHaveBeenCalledWith("success")
  })

  it("stops its loop when the last instance unmounts", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame")
    const a = render(<DotObject model={model} label="A" />)
    const b = render(<DotObject model={model} label="B" />)
    a.unmount()
    expect(cancel).not.toHaveBeenCalled()
    b.unmount()
    expect(cancel).toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    vi.useRealTimers() // axe schedules with setTimeout
    const plain = render(<DotObject model={model} label="Ready" />)
    expect(await axeViolations(plain.container)).toEqual([])
    plain.unmount()
    const labelled = render(<DotObject model={model} label="Thinking…" state="thinking" showLabel />)
    expect(await axeViolations(labelled.container)).toEqual([])
  })
})

describe("ShimmerText", () => {
  it("sweeps only while busy", () => {
    const { rerender } = render(<ShimmerText busy>Thinking…</ShimmerText>)
    expect(screen.getByText("Thinking…")).toHaveAttribute("data-busy")
    rerender(<ShimmerText>Thinking…</ShimmerText>)
    expect(screen.getByText("Thinking…")).not.toHaveAttribute("data-busy")
  })
})
