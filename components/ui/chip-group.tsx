"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { computeBlocks, type ChipBlock } from "@/components/ui/chip-layout"

/** `compact` joins neighbours on a row; `block` also joins across wrapped rows; `none` never joins. */
type ChipJoin = "compact" | "block" | "none"

/**
 * Joined chips close the gap down to `--chip-seam`, sideways and between wrapped rows, by
 * transform only: the layout (and so the wrapping) never changes. Set the spacing with
 * `--chip-gap` (not `gap-*`), so the join follows it. `--chip-ease` and `--chip-dur` time the
 * check icon growing and the chips moving together, so the two motions add up to one smooth move.
 */

const ITEM = '[data-slot="chip-group-item"]'
/** How long to keep re-measuring after a change: covers the check icon and margin transitions. */
const FOLLOW_MS = 320

function ChipGroup({
  className,
  join = "compact",
  ref,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & { join?: ChipJoin }) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )
  useChipJoins(rootRef, join)

  return (
    <ToggleGroupPrimitive.Root
      ref={setRef}
      data-slot="chip-group"
      data-join={join}
      className={cn("relative flex flex-wrap gap-(--chip-gap) [--chip-gap:--spacing(2)] [--chip-seam:2px] [--chip-ease:cubic-bezier(.2,.8,.2,1)] [--chip-dur:200ms]", className)}
      {...props}
      // Every chip is its own Tab stop; Radix's default makes the group one stop with arrow keys.
      rovingFocus={false}
    />
  )
}

function ChipGroupItem({ className, children, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="chip-group-item"
      className={cn(
        "group/chip inline-flex h-8 shrink-0 items-center rounded-md border border-input bg-transparent px-3 text-sm font-medium whitespace-nowrap shadow-xs outline-none select-none",
        "transition-[translate,border-radius,background-color,color,padding] duration-(--chip-dur) ease-(--chip-ease) motion-reduce:transition-none",
        "hover:bg-accent/50 focus-visible:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=on]:bg-accent data-[state=on]:ps-2 data-[state=on]:text-accent-foreground",
        // Compact join: the hook writes how far this chip moves; touching corners soften to 3px.
        "[translate:var(--chip-x,0px)_var(--chip-y,0px)]",
        "data-[corner-tl]:rounded-tl-[3px] data-[corner-tr]:rounded-tr-[3px] data-[corner-bl]:rounded-bl-[3px] data-[corner-br]:rounded-br-[3px]",
        className
      )}
      {...props}
    >
      <CheckIcon
        aria-hidden="true"
        className="h-4 w-0 shrink-0 opacity-0 transition-[width,margin,opacity] duration-(--chip-dur) ease-(--chip-ease) motion-reduce:transition-none group-data-[state=on]/chip:me-1.5 group-data-[state=on]/chip:w-4 group-data-[state=on]/chip:opacity-100"
      />
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

/**
 * Measures the chips' resting layout and writes join attributes onto them.
 * Reads selection from the DOM (`data-state="on"`), so it works for
 * controlled and uncontrolled groups alike.
 */
function useChipJoins(ref: React.RefObject<HTMLElement | null>, join: ChipJoin) {
  React.useLayoutEffect(() => {
    const root = ref.current
    if (!root || join === "none") return
    let raf = 0
    let until = 0
    const apply = () => {
      const style = getComputedStyle(root)
      // The distance each join closes: the resolved gap minus the seam left between joined chips.
      const pull = (parseFloat(style.columnGap) || 0) - (parseFloat(style.getPropertyValue("--chip-seam")) || 0)
      const rtl = style.direction === "rtl"
      const items = Array.from(root.querySelectorAll<HTMLElement>(ITEM))
      const rects = items.map((el, i) => ({ id: String(i), x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }))
      const selected = new Set(items.flatMap((el, i) => (el.dataset.state === "on" ? [String(i)] : [])))
      const blocks = computeBlocks(rects, selected, { pull, rtl, stack: join === "block" })
      items.forEach((el, i) => writeJoin(el, blocks[String(i)], pull * (rtl ? 1 : -1)))
    }
    const follow = () => {
      apply()
      if (performance.now() < until) raf = requestAnimationFrame(follow)
    }
    const kick = () => {
      until = performance.now() + FOLLOW_MS
      cancelAnimationFrame(raf)
      follow()
    }
    kick()
    const resize = new ResizeObserver(kick)
    resize.observe(root)
    const mutation = new MutationObserver(kick)
    mutation.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state", "dir"] })
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      mutation.disconnect()
      root.querySelectorAll<HTMLElement>(ITEM).forEach((el) => writeJoin(el, undefined))
    }
  }, [ref, join])
}

/** `step` is the signed px one join moves a chip sideways; a row lifts by one `pull` per row. */
function writeJoin(el: HTMLElement, block: ChipBlock | undefined, step = 0) {
  el.toggleAttribute("data-corner-tl", !!block?.corners.tl)
  el.toggleAttribute("data-corner-tr", !!block?.corners.tr)
  el.toggleAttribute("data-corner-bl", !!block?.corners.bl)
  el.toggleAttribute("data-corner-br", !!block?.corners.br)
  setPx(el, "--chip-x", block?.shift && step ? block.shift * step : 0)
  setPx(el, "--chip-y", block?.rows && step ? block.rows * -Math.abs(step) : 0)
}

function setPx(el: HTMLElement, name: string, px: number) {
  if (px) el.style.setProperty(name, `${px}px`)
  else el.style.removeProperty(name)
}

export { ChipGroup, ChipGroupItem, type ChipJoin }
