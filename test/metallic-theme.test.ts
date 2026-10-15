import { readFileSync } from "node:fs"
import postcss, { type AtRule, type Rule } from "postcss"

const source = readFileSync("components/ui/metallic.css", "utf8")
const sheet = postcss.parse(source)
const SCOPE = '[data-material="metallic"]'

/** Style rules that are not part of a keyframe animation, with the at-rule they sit in (if any). */
function styleRules() {
  const out: { rule: Rule; media?: string }[] = []
  sheet.walkRules((rule) => {
    const parent = rule.parent as AtRule | undefined
    if (parent?.type === "atrule" && parent.name === "keyframes") return
    out.push({ rule, media: parent?.type === "atrule" ? parent.params : undefined })
  })
  return out
}

describe("metallic theme stylesheet", () => {
  it("only styles things inside data-material=metallic, so skins can share a page", () => {
    for (const { rule } of styleRules()) {
      if (rule.selector === ":root") continue
      for (const selector of rule.selectors) expect(selector, selector).toContain(SCOPE)
    }
  })

  it("gives every focusable steel part a visible 2px focus outline (the steel shadow replaces shadcn's ring)", () => {
    const focus = styleRules().filter(({ rule, media }) => !media && rule.selector.includes(":focus-visible"))
    const outlined = focus.filter(({ rule }) => rule.some((n) => n.type === "decl" && n.prop === "outline" && /^2px solid /.test(n.value)))
    const covered = outlined.map(({ rule }) => rule.selector).join(" ")
    for (const part of ['[data-slot="button"]', '[data-slot="toggle"]', '[data-slot="toggle-group-item"]', '[data-slot="chip-group-item"]', '[data-slot="tabs-trigger"]', '[data-slot="switch"]', '[data-slot="slider-thumb"]', "[data-metal]"]) {
      expect(covered, part).toContain(part)
    }
    // The outline is the theme's ring colour, which the page sets (shadcn's --ring), so it follows light and dark.
    for (const { rule } of outlined) expect(rule.some((n) => n.type === "decl" && n.prop === "outline" && n.value === "2px solid var(--ring)")).toBe(true)
  })

  it("defines every --metallic token it uses", () => {
    const defined = new Set<string>()
    sheet.walkDecls(/^--metallic-/, (d) => void defined.add(d.prop))
    const used = [...source.matchAll(/var\((--metallic-[a-z-]+)\)/g)].map((m) => m[1])
    expect(used.length).toBeGreaterThan(0)
    for (const token of used) expect(defined, token).toContain(token)
  })

  it("keys off both Radix (data-state) and Base UI (data-checked, data-active, data-pressed) markup", () => {
    for (const attribute of ['[data-state="on"]', "[data-pressed]", '[data-state="active"]', "[data-active]", '[data-state="checked"]', "[data-checked]"]) {
      expect(source, attribute).toContain(attribute)
    }
  })

  it("has a reduced-motion and a forced-colours fallback", () => {
    const media = styleRules().flatMap(({ media }) => (media ? [media] : []))
    expect(media.some((m) => m.includes("prefers-reduced-motion"))).toBe(true)
    expect(media.some((m) => m.includes("forced-colors"))).toBe(true)
    const reduced = styleRules().filter(({ media }) => media?.includes("reduced-motion"))
    // One block zeroes every transition and animation (including the pseudo-element layers the theme draws on).
    expect(reduced.some(({ rule }) => rule.selector.includes("*::before") && rule.selector.includes("*::after") && rule.some((n) => n.type === "decl" && n.prop === "animation-duration" && n.value.startsWith("0ms")))).toBe(true)
  })

  it("keeps sidebar menu badges above the active steel plate", () => {
    // The button plate is z-index 1; badge/action are siblings and must paint above it.
    const button = styleRules().find(({ rule, media }) => !media && rule.selector.includes('[data-slot="sidebar-menu-button"]') && rule.some((n) => n.type === "decl" && n.prop === "z-index"))
    const badge = styleRules().find(({ rule, media }) => !media && rule.selector.includes('[data-slot="sidebar-menu-badge"]') && rule.some((n) => n.type === "decl" && n.prop === "z-index"))
    expect(button).toBeTruthy()
    expect(badge).toBeTruthy()
    const buttonZ = button!.rule.nodes.find((n) => n.type === "decl" && n.prop === "z-index") as { value: string }
    const badgeZ = badge!.rule.nodes.find((n) => n.type === "decl" && n.prop === "z-index") as { value: string }
    expect(Number(badgeZ.value)).toBeGreaterThan(Number(buttonZ.value))
  })

  it("keeps the engraved label readable on every steel band (WCAG AA, 4.5:1)", () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const steel = /--metallic-steel:\s*([^;]+);/.exec(source)![1]
    const ink = /--metallic-ink:\s*(#[0-9a-f]{6})/i.exec(source)![1]
    const bands = [...steel.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0])
    expect(bands.length).toBeGreaterThanOrEqual(4)
    for (const band of bands) {
      const [hi, lo] = [luminance(band), luminance(ink)].sort((a, b) => b - a)
      expect((hi + 0.05) / (lo + 0.05), band).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("registry", () => {
  const registry = JSON.parse(readFileSync("registry.json", "utf8"))
  const item = registry.items.find((i: { name: string }) => i.name === "metallic")

  it("ships the stylesheet and the runtime as files, not as inline css (inline merging would reorder the cascade)", () => {
    expect(item.type).toBe("registry:ui")
    expect(item.css).toBeUndefined()
    expect(item.files.map((f: { path: string }) => f.path).sort()).toEqual(["components/ui/metallic-runtime.tsx", "components/ui/metallic.css"])
  })

  it("installs the stylesheet next to the runtime that imports it", () => {
    expect(readFileSync("components/ui/metallic-runtime.tsx", "utf8")).toContain('import "./metallic.css"')
  })
})
