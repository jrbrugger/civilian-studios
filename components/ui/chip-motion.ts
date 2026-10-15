export type ChipRemoval = "fade" | "collapse" | "blur"
export type ChipClose = "overlap" | "glide" | "inout" | "spring"

export interface RemoveChipOptions {
  removal?: ChipRemoval
  close?: ChipClose
  reducedMotion?: boolean
}

const CALM = "cubic-bezier(.2,.8,.2,1)"

/** A damped spring (ζ < 1 settles with a tiny overshoot) sampled into a CSS `linear()` easing. */
export function springEasing(zeta: number, points = 40): string {
  // Undamped never settles and critically damped has no oscillation to sample; keep both out.
  zeta = Math.min(Math.max(zeta, 0.1), 0.95)
  const w = 12
  const wd = w * Math.sqrt(1 - zeta * zeta)
  const x = (t: number) => 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))
  let end = 0.1
  while (Math.abs(1 - x(end)) > 0.002 || Math.abs(1 - x(end + 0.05)) > 0.002) end += 0.02
  const values = Array.from({ length: points + 1 }, (_, i) => x((i / points) * end).toFixed(4))
  values[points] = "1"
  return `linear(${values.join(", ")})`
}

/**
 * When and how neighbours slide into the gap. `start` is the share of the
 * removal effect that plays before the gap starts closing: overlapping the
 * two (instead of waiting, then snapping) is what keeps it smooth.
 */
export const CLOSE_TIMINGS: Record<ChipClose, { start: number; duration: number; easing: string }> = {
  overlap: { start: 0.5, duration: 440, easing: "cubic-bezier(.45,0,.25,1)" },
  glide: { start: 0.85, duration: 380, easing: "cubic-bezier(.4,0,.2,1)" },
  inout: { start: 0.8, duration: 480, easing: "cubic-bezier(.65,0,.35,1)" },
  spring: { start: 0.75, duration: 560, easing: springEasing(0.72) },
}

const EFFECTS: Record<ChipRemoval, { duration: number; keyframes: Keyframe[] }> = {
  fade: { duration: 200, keyframes: [{ opacity: 1, scale: "1" }, { opacity: 0, scale: "0.92" }] },
  collapse: { duration: 160, keyframes: [{ opacity: 1 }, { opacity: 0 }] },
  blur: {
    duration: 280,
    keyframes: [
      { opacity: 1, filter: "blur(0)", scale: "1" },
      { opacity: 0, filter: "blur(6px)", scale: "1.03" },
    ],
  },
}

/** Milliseconds into the removal effect at which the gap starts closing. */
export function closeStartMs(removal: ChipRemoval, close: ChipClose): number {
  return removal === "collapse" ? 0 : EFFECTS[removal].duration * CLOSE_TIMINGS[close].start
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/** Plays a chip's exit, then collapses its width so neighbours slide in. Resolves when both finish. */
export async function removeChip(
  el: HTMLElement,
  { removal = "fade", close = "overlap", reducedMotion = prefersReducedMotion() }: RemoveChipOptions = {}
): Promise<void> {
  el.style.pointerEvents = "none"
  if (reducedMotion) {
    await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" })
    await collapseWidth(el, 0, CALM)
    return
  }
  const effect = EFFECTS[removal]
  const timing = CLOSE_TIMINGS[close]
  const played = play(el, effect.keyframes, { duration: effect.duration, easing: CALM, fill: "forwards" })
  await wait(closeStartMs(removal, close))
  await Promise.all([collapseWidth(el, timing.duration, timing.easing), played])
}

/** `el.animate`, resolving straight away where the Web Animations API is missing (e.g. jsdom) or the animation is cancelled. */
function play(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  if (typeof el.animate !== "function") return Promise.resolve()
  return el.animate(keyframes, options).finished.then(
    () => undefined,
    () => undefined
  )
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Shrinks the chip to zero width and eats the flex gap; content stays centred while it narrows. */
function collapseWidth(el: HTMLElement, duration: number, easing: string): Promise<void> {
  const gap = el.parentElement ? parseFloat(getComputedStyle(el.parentElement).columnGap) || 0 : 0
  const width = el.getBoundingClientRect().width
  el.style.overflow = "hidden"
  el.style.justifyContent = "center"
  return play(
    el,
    [
      { width: `${width}px`, marginRight: "0px" },
      { width: "0px", marginRight: `${-gap}px`, borderWidth: "0px" },
    ],
    { duration, easing, fill: "forwards" }
  )
}
