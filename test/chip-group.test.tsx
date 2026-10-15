import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChipGroup, ChipGroupItem } from "@/components/ui/chip-group"
import { axeViolations } from "@/test/axe"

const SOURCES = [
  ["brief", "Brief"],
  ["brand", "Brand guide"],
  ["figma", "Figma"],
  ["code", "Codebase"],
] as const

function Sources(props: Partial<React.ComponentProps<typeof ChipGroup>>) {
  return (
    <ChipGroup type="multiple" aria-label="Sources" {...(props as object)}>
      {SOURCES.map(([value, label]) => (
        <ChipGroupItem key={value} value={value}>
          {label}
        </ChipGroupItem>
      ))}
    </ChipGroup>
  )
}

describe("ChipGroup", () => {
  it("toggles chips and reports the selection", async () => {
    const onValueChange = vi.fn()
    render(<Sources onValueChange={onValueChange} />)
    const brief = screen.getByRole("button", { name: "Brief" })
    expect(brief).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(brief)
    expect(brief).toHaveAttribute("aria-pressed", "true")
    expect(onValueChange).toHaveBeenLastCalledWith(["brief"])
  })

  it("makes every chip its own Tab stop", async () => {
    render(<Sources defaultValue={["figma"]} />)
    for (const [, label] of SOURCES) {
      await userEvent.tab()
      expect(screen.getByRole("button", { name: label })).toHaveFocus()
    }
  })

  it("joins selected neighbours when uncontrolled", () => {
    render(<Sources defaultValue={["brief", "brand"]} />)
    expect(screen.getByRole("button", { name: "Brand guide" })).toHaveAttribute("data-corner-tl")
    expect(screen.getByRole("button", { name: "Brief" })).not.toHaveAttribute("data-corner-tl")
    expect(screen.getByRole("button", { name: "Brief" })).toHaveAttribute("data-corner-tr")
  })

  it("pulls the rest of the row in by the gap minus the seam, with transforms only", () => {
    render(<Sources defaultValue={["brief", "brand"]} style={{ columnGap: "8px", "--chip-seam": "2px" } as React.CSSProperties} />)
    // Brand joins Brief (one join), so Brand and everything after it moves 6px left.
    expect(screen.getByRole("button", { name: "Brief" }).style.getPropertyValue("--chip-x")).toBe("")
    expect(screen.getByRole("button", { name: "Brand guide" }).style.getPropertyValue("--chip-x")).toBe("-6px")
    expect(screen.getByRole("button", { name: "Figma" }).style.getPropertyValue("--chip-x")).toBe("-6px")
  })

  it("removes the pull again when the chip is deselected", async () => {
    render(<Sources defaultValue={["brief", "brand"]} style={{ columnGap: "8px", "--chip-seam": "2px" } as React.CSSProperties} />)
    await userEvent.click(screen.getByRole("button", { name: "Brand guide" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Figma" }).style.getPropertyValue("--chip-x")).toBe(""))
  })

  it("does not join when join is none", () => {
    render(<Sources join="none" defaultValue={["brief", "brand"]} />)
    expect(screen.getByRole("button", { name: "Brand guide" })).not.toHaveAttribute("data-corner-tl")
  })

  it("supports single selection", async () => {
    render(<Sources type="single" defaultValue="brief" />)
    const brief = screen.getByRole("radio", { name: "Brief" })
    await userEvent.click(screen.getByRole("radio", { name: "Figma" }))
    expect(brief).toHaveAttribute("aria-checked", "false")
    expect(screen.getByRole("radio", { name: "Figma" })).toHaveAttribute("aria-checked", "true")
  })

  it("has no axe violations", async () => {
    const { container } = render(<Sources defaultValue={["brief", "brand"]} />)
    expect(await axeViolations(container)).toEqual([])
  })
})
