import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChipGroup, ChipGroupItem } from "@/components/ui/chip-group"
import { ChipList } from "@/components/ui/chip-list"
import { MetallicChipGroup, MetallicChipGroupItem, MetallicChipList } from "@/components/ui/metallic-chip"
import { MetallicButton } from "@/components/ui/metallic-button"
import { axeViolations } from "@/test/axe"

describe("ChipList itemClassName", () => {
  it("styles each chip", () => {
    render(<ChipList aria-label="x" items={[{ value: "a", label: "A" }]} onRemove={() => {}} itemClassName="kit-chip" />)
    expect(screen.getByRole("listitem")).toHaveClass("kit-chip")
  })
})

describe("ChipGroup spacing", () => {
  it("drives the gap and the join pull from one variable, so they cannot drift apart", () => {
    render(
      <ChipGroup type="multiple" aria-label="x" data-testid="g">
        <ChipGroupItem value="a">A</ChipGroupItem>
      </ChipGroup>
    )
    const group = screen.getByTestId("g").className
    expect(group).toContain("gap-(--chip-gap)")
    expect(group).toContain("[--chip-gap:")
  })
})

describe("Metallic chips", () => {
  it("is the same ChipGroup underneath: toggles, announces state, joins", async () => {
    render(
      <MetallicChipGroup type="multiple" aria-label="Sources" defaultValue={["a", "b"]}>
        <MetallicChipGroupItem value="a">A</MetallicChipGroupItem>
        <MetallicChipGroupItem value="b">B</MetallicChipGroupItem>
        <MetallicChipGroupItem value="c">C</MetallicChipGroupItem>
      </MetallicChipGroup>
    )
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("data-corner-tl")
    await userEvent.click(screen.getByRole("button", { name: "C" }))
    expect(screen.getByRole("button", { name: "C" })).toHaveAttribute("aria-pressed", "true")
  })

  it("overlaps joined chips by their shared 1px border", () => {
    render(
      <MetallicChipGroup type="multiple" aria-label="x" data-testid="g">
        <MetallicChipGroupItem value="a">A</MetallicChipGroupItem>
      </MetallicChipGroup>
    )
    expect(screen.getByTestId("g").className).toContain("[--chip-seam:-1px]")
  })

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <MetallicChipGroup type="multiple" aria-label="Sources" defaultValue={["a"]}>
          <MetallicChipGroupItem value="a">A</MetallicChipGroupItem>
          <MetallicChipGroupItem value="b">B</MetallicChipGroupItem>
        </MetallicChipGroup>
        <MetallicChipList aria-label="Context" items={[{ value: "a", label: "A" }]} onRemove={() => {}} />
      </>
    )
    expect(await axeViolations(container)).toEqual([])
  })
})

describe("MetallicButton", () => {
  it("is a real button that fires onClick and honours disabled", async () => {
    const onClick = vi.fn()
    const { rerender } = render(<MetallicButton onClick={onClick}>Run</MetallicButton>)
    await userEvent.click(screen.getByRole("button", { name: "Run" }))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(
      <MetallicButton onClick={onClick} disabled>
        Run
      </MetallicButton>
    )
    await userEvent.click(screen.getByRole("button", { name: "Run" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<MetallicButton>Run</MetallicButton>)
    expect(screen.getByRole("button")).toHaveAttribute("type", "button")
  })

  it("can render as a link", () => {
    render(
      <MetallicButton asChild>
        <a href="/docs">Docs</a>
      </MetallicButton>
    )
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs")
  })

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <MetallicButton>Run</MetallicButton>
        <MetallicButton size="icon" aria-label="Add">
          +
        </MetallicButton>
      </>
    )
    expect(await axeViolations(container)).toEqual([])
  })
})
