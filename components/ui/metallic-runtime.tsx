"use client"

import * as React from "react"

import "./metallic.css"

/*
 * Civilian Studios — Metallic UI 1.0.0
 * A metal skin for shadcn (and any components that expose the same data-slot / state attributes).
 *
 * Turn it on:   <html data-material="metallic">   (or any element: it only styles what is inside it)
 * Then mount:   <MetallicRuntime />               once, anywhere in the app
 * Dark pages:   add the .dark class to the same element or an ancestor (gunmetal steel)
 *
 * Dials: attributes next to data-material, all optional (the first value is not always the default; see "default"):
 *   data-alloy     steel (default) | silver | aluminium | titanium | gold | brass | bronze | copper | blue | red | orange | purple
 *   data-polish    satin | polished (default) | mirror
 *   data-finish    textured (default) | smooth
 *   data-grain     fine (default) | coarse | spun          (textured finish only)
 *   data-depth     flat | bevelled (default) | deep
 *   data-density   compact | default | roomy
 *   data-corners   machined | default | soft
 *   data-motion    crisp | snappy (default) | soft
 *   data-sweep     off | click (default) | ambient
 *   data-rm        forces reduced motion (the OS setting is always respected)
 * Token: --motion-speed multiplies every duration (1 = as designed).
 *
 * The stylesheet (./metallic.css, imported below) does almost everything. This file adds what CSS can't:
 *  - keyboard-only focus outlines (remembers whether the last input was a pointer or a key)
 *  - the light sweep on a steel part that was just turned on by a person (never on load, never on arrow keys)
 *  - travel motion: the tab bar and plates glide between items, sliders glide to a clicked value, small marks pop
 * Every duration and curve is read from the stylesheet's motion tokens, so the Motion dial drives all of it, and
 * everything is skipped under reduced motion.
 */

const SCOPE = '[data-material="metallic"]'
const html = () => document.documentElement

/** The metallic element a node sits in (where the tokens live), or <html> when there is none. */
const scopeOf = (el: Element | null): HTMLElement => (el?.closest<HTMLElement>(SCOPE) ?? html())

export const reducedMotion = () => html().hasAttribute("data-rm") || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)

/** Reads a motion token as a resolved number by measuring a probe that uses it (the token is a calc of other tokens). */
function measure(scope: HTMLElement, css: string, read: (s: CSSStyleDeclaration) => string) {
  const probe = document.createElement("span")
  probe.setAttribute("aria-hidden", "true")
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;${css}`
  scope.append(probe)
  const value = parseFloat(read(getComputedStyle(probe)))
  probe.remove()
  return value
}

/** The Motion dial's speed factor (1 as designed; 0.8 crisp, 1.35 soft). Use it to time animation done in JavaScript. */
export function motionScale(scope: HTMLElement = scopeOf(document.querySelector(SCOPE))) {
  const px = measure(scope, "width:calc(100px * var(--motion-scale, 1))", (s) => s.width)
  return Number.isFinite(px) && px > 0 ? px / 100 : 1
}

/** Milliseconds of the theme's travel duration, as the browser resolves it. 0 when the theme is not on. */
const travelMs = (scope: HTMLElement) => {
  const s = measure(scope, "transition:left var(--motion-travel, 0s) linear", (c) => c.transitionDuration)
  return Number.isFinite(s) ? s * 1000 : 0
}

/** The motion scale, kept current when the dial changes (0 under reduced motion), for JavaScript-driven animation. */
export function useMotionScale() {
  return React.useSyncExternalStore(
    (notify) => {
      const observer = new MutationObserver(notify)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-rm", "data-motion", "data-material"] })
      return () => observer.disconnect()
    },
    () => (reducedMotion() ? 0 : motionScale()),
    () => 1,
  )
}

/** A failed attempt judders the faulty part 2px, twice, once. Nothing under reduced motion. */
export function jam(el: Element | null) {
  if (!el || reducedMotion() || typeof el.animate !== "function") return
  el.animate([{ translate: "0 0" }, { translate: "-2px 0" }, { translate: "2px 0" }, { translate: "-2px 0" }, { translate: "2px 0" }, { translate: "0 0" }], {
    duration: 160 * motionScale(scopeOf(el)),
    easing: "linear",
  })
}

/** Input modality and the sweep guard. */
function useSheenGuard() {
  React.useEffect(() => {
    const SELECTABLE = '[data-slot="toggle-group-item"], [data-slot="toggle"], [data-slot="chip-group-item"], [data-slot="tabs-trigger"]'
    const arm = (target: EventTarget | null) => {
      const el = (target as Element | null)?.closest?.<HTMLElement>(SELECTABLE)
      // Only steel parts sweep. Line tabs are quiet (and their ::after is the underline).
      if (!el || reducedMotion() || !el.closest(SCOPE) || el.closest('[data-variant="line"]')) return
      // Wait for the component to flip its state, then sweep only if it is now on.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!el.matches('[data-state="on"], [data-state="active"]')) return
          el.removeAttribute("data-sheen")
          void el.offsetWidth
          el.setAttribute("data-sheen", "")
        }),
      )
    }
    // Radix moves focus itself on click (tabs, toggle groups), which browsers report as :focus-visible. Remember how
    // the person is interacting so the focus outline follows the keyboard only.
    const onPointer = (e: PointerEvent) => {
      html().dataset.modality = "pointer"
      arm(e.target)
    }
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) html().dataset.modality = "keyboard"
      if (e.key === "Enter" || e.key === " ") arm(e.target)
    }
    const onEnd = (e: AnimationEvent) => e.animationName === "metallic-sheen" && (e.target as Element).removeAttribute("data-sheen")
    document.addEventListener("pointerdown", onPointer, true)
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("animationend", onEnd)
    return () => {
      document.removeEventListener("pointerdown", onPointer, true)
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("animationend", onEnd)
    }
  }, [])
}

/**
 * Travel motion.
 * - Line tabs: the bar glides from the old tab to the new one. The leading edge moves first and the trailing edge
 *   catches up (--motion-stretch), so in Soft it stretches like a drop of liquid.
 * - Pill tabs and sidebar items: a copy of the new item's plate travels under the labels from the old item.
 * - Toggles, chips, pagination, calendar days: the plate presses in and comes back lit.
 * - Slider: a click on the track or an arrow key glides; dragging stays 1:1 with the pointer.
 */
function useTravelMotion() {
  React.useEffect(() => {
    const TAB = '[data-slot="tabs-trigger"]'
    const LINE_TAB = `[data-slot="tabs-list"][data-variant="line"] > ${TAB}`
    const PILL_TAB = `[data-slot="tabs-list"]:not([data-variant="line"]) > ${TAB}`
    const SIDEBAR_BTN = '[data-slot="sidebar-menu-button"], [data-slot="sidebar-menu-sub-button"]'
    const PLATE = `${PILL_TAB}, ${SIDEBAR_BTN}`
    const POP = `:is([data-slot="toggle"], [data-slot="toggle-group-item"], [data-slot="chip-group-item"], [data-slot="pagination-link"], ${PILL_TAB})`
    const container = (el: Element) => (el.matches(SIDEBAR_BTN) ? el.closest<HTMLElement>('[data-slot="sidebar-content"]') : el.parentElement) as HTMLElement
    const ON = ["on", "active", "checked", "true"]
    const isOn = (v: string | null) => v !== null && ON.includes(v)

    const pop = (el: HTMLElement) => {
      el.removeAttribute("data-pop")
      void el.offsetWidth
      el.setAttribute("data-pop", "")
    }

    // Calendar days: react-day-picker rebuilds the grid on every pick, so there is no attribute change to catch.
    // Compare each calendar's selected days with the last look and pop only the newly picked ones (none on first sight).
    const DAY_ON = 'button:is([data-selected-single="true"], [data-range-start="true"], [data-range-end="true"])'
    const seenDays = new Map<number, Set<string>>()
    const popNewDays = (animate: boolean) =>
      document.querySelectorAll(`${SCOPE} [data-slot="calendar"], ${SCOPE}[data-slot="calendar"]`).forEach((cal, i) => {
        const on = [...cal.querySelectorAll<HTMLElement>(DAY_ON)]
        const before = seenDays.get(i)
        seenDays.set(i, new Set(on.map((b) => b.dataset.day!)))
        if (before && animate) on.filter((b) => !before.has(b.dataset.day!)).forEach(pop)
      })

    type Insets = [number, number]
    type Axis = "x" | "y"
    const SIDES = { x: ["left", "right"], y: ["top", "bottom"] } as const
    // Animate a box's insets from `start` to `end`: the leading edge on time, the trailing edge stretched behind it.
    const glide = (el: Element, start: Insets, end: Insets, forward: boolean, duration: number, pseudoElement?: string, axis: Axis = "x") => {
      if (typeof el.animate !== "function") return Promise.resolve()
      const style = getComputedStyle(scopeOf(el))
      const easing = style.getPropertyValue("--ease-travel").trim() || "ease-out"
      const stretch = Number(style.getPropertyValue("--motion-stretch")) || 1
      const sides = SIDES[axis]
      const run = (i: 0 | 1, d: number) => el.animate([{ [sides[i]]: `${start[i]}px` }, { [sides[i]]: `${end[i]}px` }], { duration: d, easing, pseudoElement }).finished
      const lead = forward ? 1 : 0
      return Promise.all([run(lead, duration), run((1 - lead) as 0 | 1, duration * stretch)]).catch(() => {})
    }

    const glidePlate = (list: HTMLElement, el: HTMLElement, from: DOMRect, axis: Axis, ms: number) => {
      const box = list.getBoundingClientRect()
      const to = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      const ghost = document.createElement("span")
      ghost.setAttribute("data-plate-ghost", "")
      ghost.setAttribute("aria-hidden", "true")
      // Positions inside the container's padding box, scroll included (a sidebar's content scrolls).
      const px = (r: DOMRect) => r.left - box.left - list.clientLeft + list.scrollLeft
      const py = (r: DOMRect) => r.top - box.top - list.clientTop + list.scrollTop
      const insets = (r: DOMRect): Insets => (axis === "x" ? [px(r), list.clientWidth - px(r) - r.width] : [py(r), list.clientHeight - py(r) - r.height])
      const [a, b] = insets(to)
      Object.assign(ghost.style, {
        ...(axis === "x"
          ? { top: `${py(to)}px`, height: `${to.height}px`, left: `${a}px`, right: `${b}px`, width: "auto" }
          : { left: `${px(to)}px`, width: `${to.width}px`, top: `${a}px`, bottom: `${b}px`, height: "auto" }),
        background: s.background,
        boxShadow: s.boxShadow,
        border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
        borderRadius: s.borderRadius,
      })
      list.append(ghost)
      el.setAttribute("data-gliding", "")
      const forward = axis === "x" ? to.left > from.left : to.top > from.top
      glide(ghost, insets(from), insets(to), forward, ms, undefined, axis).then(() => {
        if (!ghost.isConnected) return // superseded by a newer glide, which owns the cleanup
        ghost.remove()
        el.removeAttribute("data-gliding")
      })
    }

    popNewDays(false) // note which days are already picked, so only later picks pop
    const observer = new MutationObserver((records) => {
      const animate = !reducedMotion()
      popNewDays(animate) // keeps its record current even when not animating
      if (!animate) return
      const left = new Map<Element, DOMRect>()
      const arrived: HTMLElement[] = []
      for (const r of records) {
        if (r.type !== "attributes") continue
        const el = r.target as HTMLElement
        if (!el.closest(SCOPE)) continue
        const now = el.getAttribute(r.attributeName!)
        if (isOn(now) === isOn(r.oldValue)) continue
        if (el.matches(`${TAB}, ${SIDEBAR_BTN}`) && isOn(r.oldValue) && !isOn(now)) left.set(container(el), el.getBoundingClientRect())
        else if (isOn(now)) arrived.push(el)
      }
      for (const el of arrived) {
        const list = container(el)
        if (el.matches(LINE_TAB)) {
          const from = left.get(list)
          const ms = parseFloat(getComputedStyle(el, "::after").transitionDuration) * 1000
          if (!from || !ms) continue
          const to = el.getBoundingClientRect()
          glide(el, [from.left - to.left, to.right - from.right], [0, 0], to.left > from.left, ms, "::after")
        } else if (el.matches(PLATE)) {
          // Mid-flight: start from where the travelling plate is now.
          const flying = list.querySelector<HTMLElement>(":scope > [data-plate-ghost]")
          const from = flying?.getBoundingClientRect() ?? left.get(list)
          if (flying) {
            flying.getAnimations?.().forEach((a) => a.cancel())
            flying.remove()
            list.querySelectorAll("[data-gliding]").forEach((g) => g.removeAttribute("data-gliding"))
          }
          const ms = travelMs(scopeOf(el))
          if (from && ms) glidePlate(list, el, from, el.matches(SIDEBAR_BTN) ? "y" : "x", ms)
          else pop(el)
        } else if (el.matches(POP)) pop(el)
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "data-active", "data-selected-single", "data-range-start", "data-range-end"],
      attributeOldValue: true,
    })
    const onPopEnd = (e: AnimationEvent) => e.animationName === "metallic-plate-in" && (e.target as Element).removeAttribute("data-pop")
    document.addEventListener("animationend", onPopEnd)

    const slider = (t: EventTarget | null) => (t as Element | null)?.closest?.<HTMLElement>('[data-slot="slider"]') ?? null
    let dragging: HTMLElement | null = null
    const onDown = (e: PointerEvent) => {
      dragging = slider(e.target)
      dragging?.setAttribute("data-glide", "")
    }
    const onMove = (e: PointerEvent) => {
      if (dragging && e.buttons & 1) dragging.removeAttribute("data-glide")
    }
    const onUp = () => (dragging = null)
    const onKey = (e: KeyboardEvent) => slider(e.target)?.setAttribute("data-glide", "")
    document.addEventListener("pointerdown", onDown, true)
    document.addEventListener("pointermove", onMove, true)
    document.addEventListener("pointerup", onUp, true)
    document.addEventListener("keydown", onKey, true)
    return () => {
      observer.disconnect()
      document.removeEventListener("animationend", onPopEnd)
      document.removeEventListener("pointerdown", onDown, true)
      document.removeEventListener("pointermove", onMove, true)
      document.removeEventListener("pointerup", onUp, true)
      document.removeEventListener("keydown", onKey, true)
    }
  }, [])
}

/** Mount once. Renders nothing. */
export function MetallicRuntime() {
  useSheenGuard()
  useTravelMotion()
  return null
}
