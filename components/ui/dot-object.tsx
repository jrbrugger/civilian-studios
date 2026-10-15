"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { SIZES, TERMINAL, clampProgress, type DotSize, type DotState } from "@/components/ui/dot-object-engine"
import { cloudOf, type DotModel } from "@/components/ui/dot-object-models"
import { paintDots } from "@/components/ui/dot-object-painter"

interface ShimmerTextProps extends React.ComponentProps<"span"> {
  /** Sweep a highlight across the text. Static when false, and under reduced motion. */
  busy?: boolean
}

function ShimmerText({ busy = false, className, ...props }: ShimmerTextProps) {
  return (
    <span
      data-slot="shimmer-text"
      data-busy={busy || undefined}
      className={cn(
        "text-sm font-medium whitespace-nowrap text-muted-foreground",
        busy &&
          "bg-[linear-gradient(100deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] bg-[length:250%_100%] bg-[position:100%_0] bg-clip-text text-transparent [animation:dot-shimmer_1.9s_linear_infinite] motion-reduce:bg-none motion-reduce:text-foreground motion-reduce:[animation:none]",
        className,
      )}
      {...props}
    />
  )
}

interface DotObjectProps extends Omit<React.ComponentProps<"div">, "children"> {
  model: DotModel
  /** What the object is doing, in words. Announced when `state` changes; shown when `showLabel` is set. */
  label: string
  state?: DotState
  size?: DotSize
  /** 0 to 1: reveals the shape head to tail while `working` or `thinking`. Omit when the length is unknown. */
  progress?: number
  /** Dots near the mouse lean toward it. Mouse only: off for touch, reduced motion and forced colours. */
  gravity?: boolean
  /** Show `label` as shimmering text: below the object, or beside it at `sm`. */
  showLabel?: boolean
  paused?: boolean
  /** Share of the size's dots to draw (0.2 to 2). Lower is lighter. */
  density?: number
  /** Multiplies animation time. Use above 1 for faster catalog previews. Default: 1. */
  playbackRate?: number
  /** Called once when `success` or `error` has finished playing. */
  onSettled?: (state: "success" | "error") => void
}

/* ── shared loop: one requestAnimationFrame for every instance on the page ─────────────────────── */

type Tick = (now: number) => void

const cursor = { x: 0, y: 0, on: false }
const onPointerMove = (e: PointerEvent) => {
  cursor.x = e.clientX
  cursor.y = e.clientY
  cursor.on = e.pointerType === "mouse"
}
const onPointerOut = (e: PointerEvent) => {
  if (!e.relatedTarget) cursor.on = false
}

const ticks = new Set<Tick>()
let frame = 0

function loop(now: number) {
  frame = 0
  for (const tick of ticks) tick(now)
  if (ticks.size) frame = requestAnimationFrame(loop)
}

function subscribe(tick: Tick): () => void {
  if (!ticks.size) {
    window.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerout", onPointerOut)
  }
  ticks.add(tick)
  if (!frame) frame = requestAnimationFrame(loop)
  return () => {
    ticks.delete(tick)
    if (ticks.size) return
    cancelAnimationFrame(frame)
    frame = 0
    window.removeEventListener("pointermove", onPointerMove)
    document.removeEventListener("pointerout", onPointerOut)
  }
}

/** Per-instance animation state, kept outside React: it changes every frame. */
interface Run {
  last: number
  /** Seconds since mount, and since the current state began (both stop while paused). */
  t: number
  st: number
  settled: boolean
  /** The next tick must redraw even if the picture is otherwise still. */
  dirty: boolean
  visible: boolean
  look: number
  /** Frames left to keep drawing after gravity stops, so dots can spring back. */
  hot: number
  lastDraw: number
  colorCheck: number
  color: string
  ctx: CanvasRenderingContext2D | null
  offsets: { x: Float32Array; y: Float32Array }
}

const newRun = (): Run => ({
  last: 0,
  t: 0,
  st: 0,
  settled: false,
  dirty: true,
  visible: true,
  look: 0,
  hot: 0,
  lastDraw: 0,
  colorCheck: -Infinity,
  color: "",
  ctx: null,
  offsets: { x: new Float32Array(0), y: new Float32Array(0) },
})

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function DotObject({
  model,
  label,
  state = "idle",
  size = "md",
  progress,
  gravity = true,
  showLabel = false,
  paused = false,
  density,
  playbackRate = 1,
  onSettled,
  className,
  ...props
}: DotObjectProps) {
  const preset = SIZES[size]
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [initialRun] = React.useState(newRun)
  const run = React.useRef(initialRun)

  // Announce only changes after mount: remember the state we last saw and compare while rendering.
  const [seen, setSeen] = React.useState(state)
  const [announcement, setAnnouncement] = React.useState("")
  if (seen !== state) {
    setSeen(state)
    setAnnouncement(label)
  }

  // The loop reads the latest props without re-subscribing.
  const latest = React.useRef({ model, state, size, progress, gravity, paused, density, playbackRate, onSettled })
  React.useEffect(() => {
    latest.current = { model, state, size, progress, gravity, paused, density, playbackRate, onSettled }
    run.current.dirty = true
  })

  // A new state starts from its beginning; a pending `onSettled` for the old one can no longer fire.
  React.useEffect(() => {
    run.current.st = 0
    run.current.settled = false
    run.current.dirty = true
  }, [run, state])

  // Size the canvas for the preset and the screen.
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = canvas.height = Math.round(preset.px * dpr)
    const ctx = canvas.getContext("2d")
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    run.current.ctx = ctx
    run.current.dirty = true
  }, [run, preset.px])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const r = run.current
    // matchMedia is missing in some test environments and old browsers: treat as "no preference".
    const media = (query: string) => window.matchMedia?.(query) ?? { matches: false }
    const reduce = media("(prefers-reduced-motion: reduce)")
    const coarse = media("(pointer: coarse)")
    const forced = media("(forced-colors: active)")
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([e]) => (r.visible = e.isIntersecting))
    observer?.observe(canvas)

    const unsubscribe = subscribe((now) => {
      const p = latest.current
      const dt = r.last ? Math.min((now - r.last) / 1000, 0.1) : 0
      r.last = now
      if (!p.paused) {
        const step = dt * Math.max(0.1, p.playbackRate ?? 1)
        r.t += step
        r.st += step
      }
      const end = TERMINAL[p.state]
      const rm = reduce.matches
      // Reduced motion shows one still frame: the final one for a state that has an ending.
      const t = rm ? 0 : r.t
      const st = rm ? (end ?? 0) : end === undefined ? r.st : Math.min(r.st, end)

      if (end !== undefined && st >= end && !r.settled && !p.paused) {
        r.settled = true
        p.onSettled?.(p.state as "success" | "error")
      }

      // Dark mode and forced colours change the element's colour without a prop change.
      if (now - r.colorCheck > 500) {
        r.colorCheck = now
        const color = getComputedStyle(canvas).color
        if (color !== r.color) {
          r.color = color
          r.dirty = true
        }
      }

      const ctx = r.ctx
      // A paused instance still draws once per change, so it never sits blank.
      if (!ctx || !r.visible || (p.paused && !r.dirty)) return

      const settledFrame = rm || (end !== undefined && st >= end)
      const gravityOn = p.gravity && !rm && !coarse.matches && !forced.matches
      const cursorOn = gravityOn && cursor.on
      const box = cursorOn ? canvas.getBoundingClientRect() : null
      const cx = box ? cursor.x - box.left : 0
      const cy = box ? cursor.y - box.top : 0
      const lookTarget = box ? clamp((cx - SIZES[p.size].px / 2) / 400, -1, 1) : 0
      r.look += (lookTarget - r.look) * 0.06
      r.hot = gravityOn && (cursorOn || Math.abs(r.look) > 0.002) ? 90 : Math.max(0, r.hot - 1)

      if (settledFrame && !r.dirty && r.hot === 0) return
      const fps = SIZES[p.size].fps
      if (!r.dirty && now - r.lastDraw < 1000 / fps - 4) return
      r.lastDraw = now
      r.dirty = false

      const cloud = cloudOf(p.model)
      if (r.offsets.x.length < cloud.n) r.offsets = { x: new Float32Array(cloud.n), y: new Float32Array(cloud.n) }
      paintDots(ctx, {
        model: cloud,
        preset: SIZES[p.size],
        state: p.state,
        t,
        st,
        progress: clampProgress(p.progress),
        look: r.look,
        cursor: box ? { x: cx, y: cy } : null,
        offsets: r.offsets,
        color: r.color,
        density: p.density,
      })
    })
    return () => {
      unsubscribe()
      observer?.disconnect()
    }
  }, [run])

  const busy = state === "thinking" || state === "working"
  return (
    <div
      data-slot="dot-object"
      data-state={state}
      data-size={size}
      className={cn("inline-flex items-center gap-2.5 text-foreground", size === "sm" ? "flex-row gap-2" : "flex-col", className)}
      {...props}
    >
      <div className="relative flex-none" style={{ width: preset.px, height: preset.px }}>
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block" style={{ width: preset.px, height: preset.px }} />
      </div>
      {showLabel && (
        <ShimmerText busy={busy} aria-hidden="true">
          {label}
        </ShimmerText>
      )}
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

export { DotObject, ShimmerText }
export type { DotObjectProps, ShimmerTextProps }
