import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { ChipList } from "@/components/ui/chip-list"
import { axeViolations } from "@/test/axe"

type Item = { value: string; label: string }
const ITEMS: Item[] = [
  { value: "brief", label: "Brief" },
  { value: "brand", label: "Brand guide" },
  { value: "code", label: "Codebase" },
]

function Harness({ initial = ITEMS, reducedMotion = true }: { initial?: Item[]; reducedMotion?: boolean }) {
  const [items, setItems] = useState(initial)
  return (
    <>
      <ChipList
        aria-label="Context"
        items={items}
        reducedMotion={reducedMotion}
        onRemove={(v) => setItems((xs) => xs.filter((x) => x.value !== v))}
        getFallbackFocus={() => document.getElementById("composer")}
      />
      <button type="button" onClick={() => setItems((xs) => [...xs, { value: "figma", label: "Figma" }])}>
        add figma
      </button>
      <button type="button" onClick={() => setItems((xs) => [...xs, ITEMS[0]])}>
        re-add brief
      </button>
      <textarea id="composer" aria-label="Message" />
    </>
  )
}

const removeButton = (label: string) => screen.getByRole("button", { name: `Remove ${label}` })
const status = () => screen.getByRole("status")

describe("ChipList", () => {
  it("renders a labelled list of removable chips", () => {
    render(<Harness />)
    expect(screen.getByRole("list", { name: "Context" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(removeButton("Brief")).toBeInTheDocument()
  })

  it("removes a chip after its exit and announces it", async () => {
    render(<Harness />)
    expect(status()).toHaveTextContent("")
    await userEvent.click(removeButton("Brief"))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove Brief" })).not.toBeInTheDocument())
    expect(status()).toHaveTextContent("Removed Brief")
  })

  it("announces added chips", async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "add figma" }))
    expect(status()).toHaveTextContent("Added Figma")
  })

  it("moves focus to the next chip when the focused chip is removed", async () => {
    render(<Harness />)
    removeButton("Brief").focus()
    await userEvent.keyboard("{Enter}")
    expect(removeButton("Brand guide")).toHaveFocus()
  })

  it("moves focus to the previous chip when the last chip is removed", async () => {
    render(<Harness />)
    removeButton("Codebase").focus()
    await userEvent.keyboard("{Enter}")
    expect(removeButton("Brand guide")).toHaveFocus()
  })

  it("falls back to the composer when the only chip is removed", async () => {
    render(<Harness initial={[ITEMS[0]]} />)
    removeButton("Brief").focus()
    await userEvent.keyboard("{Enter}")
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveFocus()
  })

  it("keeps focus on a live chip through rapid removals", async () => {
    render(<Harness />)
    removeButton("Brief").focus()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard("{Enter}")
    expect(removeButton("Codebase")).toHaveFocus()
  })

  it("handles values with special characters", async () => {
    render(<Harness initial={[{ value: 'say "hi" there', label: "Quote" }, ITEMS[1]]} />)
    await userEvent.click(removeButton("Quote"))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove Quote" })).not.toBeInTheDocument())
    expect(removeButton("Brand guide")).toBeInTheDocument()
  })

  it("shows a chip again when it is re-added while still leaving", async () => {
    render(<Harness reducedMotion={false} />)
    await userEvent.click(removeButton("Brief"))
    await userEvent.click(screen.getByRole("button", { name: "re-add brief" }))
    // Let the original exit finish (fade/overlap closes at ~100ms; jsdom animations end instantly).
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getAllByRole("button", { name: "Remove Brief" })).toHaveLength(1)
    expect((removeButton("Brief").closest("li") as HTMLElement).inert).toBeFalsy()
  })

  it("has no axe violations", async () => {
    const { container } = render(<Harness />)
    await act(async () => {})
    expect(await axeViolations(container)).toEqual([])
  })
})

describe("ChipList (review fixes)", () => {
  const list = (items: Item[], extra: Partial<React.ComponentProps<typeof ChipList>> = {}) => (
    <ChipList aria-label="Context" items={items} reducedMotion onRemove={() => {}} {...extra} />
  )
  const order = () => screen.getAllByRole("listitem").map((li) => li.textContent)

  it("updates a chip's label when its item changes", () => {
    const { rerender } = render(list([{ value: "f", label: "Uploading" }]))
    rerender(list([{ value: "f", label: "report.pdf" }]))
    expect(removeButton("report.pdf")).toBeInTheDocument()
  })

  it("follows the order of items, including inserts at the front", () => {
    const { rerender } = render(list([ITEMS[0], ITEMS[1]]))
    rerender(list([ITEMS[1], ITEMS[0]]))
    expect(order()).toEqual(["Brand guide", "Brief"])
    rerender(list([ITEMS[2], ITEMS[1], ITEMS[0]]))
    expect(order()).toEqual(["Codebase", "Brand guide", "Brief"])
  })

  it("keeps focus inside the list when the last chip goes and there is no fallback", async () => {
    function NoFallback() {
      const [items, setItems] = useState([ITEMS[0]])
      return <ChipList aria-label="Context" items={items} reducedMotion onRemove={() => setItems([])} />
    }
    render(<NoFallback />)
    removeButton("Brief").focus()
    await userEvent.keyboard("{Enter}")
    expect(screen.getByRole("list", { name: "Context" })).toHaveFocus()
  })

  it("announces a second removal even when its message is identical", async () => {
    const twins = [
      { value: "1", label: "image.png" },
      { value: "2", label: "image.png" },
    ]
    const { rerender } = render(list(twins))
    rerender(list([twins[1]]))
    const first = status().textContent
    rerender(list([]))
    expect(status()).toHaveTextContent("Removed image.png")
    expect(status().textContent).not.toBe(first)
  })
})
