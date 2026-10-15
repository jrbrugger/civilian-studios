"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { prefersReducedMotion, removeChip, type ChipClose, type ChipRemoval } from "@/components/ui/chip-motion"

interface ChipListItem {
  value: string
  label: string
  icon?: React.ReactNode
}

interface ChipListProps extends Omit<React.ComponentProps<"ul">, "children"> {
  items: ChipListItem[]
  onRemove: (value: string) => void
  removal?: ChipRemoval
  close?: ChipClose
  /** Defaults to the OS "reduce motion" setting. */
  reducedMotion?: boolean
  /** Where focus goes when the last chip is removed (e.g. the composer). */
  getFallbackFocus?: () => HTMLElement | null
  /** Classes for each chip, so a kit can restyle them. */
  itemClassName?: string
  messages?: { added?: (label: string) => string; removed?: (label: string) => string }
}

/**
 * A rendered chip. `leaving` chips are playing their exit; they keep their
 * place and key until it ends. A chip re-added while its old element is still
 * leaving gets a new key, so React builds a fresh element beside the spent one.
 */
interface Entry {
  item: ChipListItem
  key: string
  leaving: boolean
}

const toEntry = (item: ChipListItem): Entry => ({ item, key: item.value, leaving: false })
const added = (label: string) => `Added ${label}`
const removed = (label: string) => `Removed ${label}`

/** Live chips follow `items` (current label, icon and order); leaving chips are spliced back where they were. */
function mergeEntries(shown: Entry[], items: ChipListItem[]): Entry[] {
  const liveKey = new Map(shown.filter((s) => !s.leaving).map((s) => [s.item.value, s.key]))
  const freshKey = (value: string) => {
    let key = value
    while (shown.some((s) => s.key === key)) key += "\u0000"
    return key
  }
  const next: Entry[] = items.map((item) => ({ item, key: liveKey.get(item.value) ?? freshKey(item.value), leaving: false }))
  shown.forEach((s, index) => {
    if (s.leaving || !items.some((i) => i.value === s.item.value)) next.splice(Math.min(index, next.length), 0, { ...s, leaving: true })
  })
  return next
}

function ChipList({
  items,
  onRemove,
  removal = "fade",
  close = "overlap",
  reducedMotion,
  getFallbackFocus,
  itemClassName,
  messages,
  className,
  ...props
}: ChipListProps) {
  // What's on screen, in order: current items plus any still playing their exit.
  const [shown, setShown] = React.useState(() => items.map(toEntry))
  const [prevItems, setPrevItems] = React.useState(items)
  // `count` makes each announcement a real DOM change, even when the text repeats.
  const [announcement, setAnnouncement] = React.useState({ text: "", count: 0 })
  const elements = React.useRef(new Map<string, HTMLLIElement>())
  const started = React.useRef(new Set<string>())

  // When `items` changes, adjust state during render (no effect, no cascade)
  // and announce the change. Never runs on first mount, so nothing is announced then.
  if (items !== prevItems) {
    setPrevItems(items)
    setShown(mergeEntries(shown, items))
    const parts = [
      ...items.filter((i) => !prevItems.some((p) => p.value === i.value)).map((i) => (messages?.added ?? added)(i.label)),
      ...prevItems.filter((p) => !items.some((i) => i.value === p.value)).map((p) => (messages?.removed ?? removed)(p.label)),
    ]
    if (parts.length) setAnnouncement((a) => ({ text: parts.join(". "), count: a.count + 1 }))
  }

  React.useLayoutEffect(() => {
    for (const entry of shown) {
      if (!entry.leaving || started.current.has(entry.key)) continue
      const el = elements.current.get(entry.key)
      if (!el) continue
      started.current.add(entry.key)
      if (el.contains(document.activeElement)) {
        // Next live chip, else previous, else the fallback, else the list itself — never <body>.
        const order = shown.filter((s) => s.key === entry.key || !s.leaving)
        const at = order.findIndex((s) => s.key === entry.key)
        const target = order[at + 1] ?? order[at - 1]
        const next = target ? elements.current.get(target.key)?.querySelector("button") : (getFallbackFocus?.() ?? el.parentElement)
        next?.focus()
      }
      el.inert = true
      removeChip(el, { removal, close, reducedMotion: reducedMotion ?? prefersReducedMotion() }).then(() => {
        started.current.delete(entry.key)
        setShown((s) => s.filter((x) => x.key !== entry.key))
      })
    }
  }, [shown, removal, close, reducedMotion, getFallbackFocus])

  return (
    <>
      {/* tabIndex -1: focus lands here when the last chip goes and there's no fallback. */}
      <ul data-slot="chip-list" tabIndex={-1} className={cn("flex min-h-7 flex-wrap gap-1.5 outline-none", className)} {...props}>
        {shown.map(({ item, key }) => (
          <li
            key={key}
            data-slot="chip-list-item"
            ref={(el) => {
              if (!el) return
              elements.current.set(key, el)
              return () => {
                elements.current.delete(key)
              }
            }}
            className={cn(
              "inline-flex h-7 shrink-0 rounded-md border bg-secondary text-secondary-foreground",
              !reducedMotion && "motion-safe:animate-[chip-in_160ms_cubic-bezier(.2,.8,.2,1)]",
              itemClassName
            )}
          >
            <button
              type="button"
              aria-label={`Remove ${item.label}`}
              onClick={() => onRemove(item.value)}
              className="group/chip inline-flex h-full shrink-0 items-center gap-1 rounded-[inherit] pr-1.5 pl-2.5 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {item.icon}
              <span>{item.label}</span>
              <XIcon aria-hidden="true" className="size-3.5 text-muted-foreground transition-colors group-hover/chip:text-foreground" />
            </button>
          </li>
        ))}
      </ul>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement.text}
        {announcement.count % 2 ? "\u200b" : ""}
      </span>
    </>
  )
}

export { ChipList, type ChipListItem, type ChipListProps }
