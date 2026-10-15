import { renderToString } from "react-dom/server"
import { createRef } from "react"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SlimeSwitch, SlimeSwitchField } from "@/components/ui/slime-switch"
import { axeViolations } from "./axe"

describe("Slime switch labeling", () => {
  it("uses a visible label and keeps its name stable while Space and Enter toggle it", async () => {
    const user = userEvent.setup()
    render(<SlimeSwitchField label="Remember context" description="Keep context between conversations." />)
    const control = screen.getByRole("switch", { name:"Remember context" })
    expect(control).toHaveAccessibleDescription("Keep context between conversations.")
    await user.click(screen.getByText("Remember context"))
    expect(control).toHaveAttribute("aria-checked","true")
    control.focus()
    await user.keyboard(" ")
    expect(control).toHaveAttribute("aria-checked","false")
    await user.keyboard("{Enter}")
    expect(control).toHaveAttribute("aria-checked","true")
    expect(control).toHaveAccessibleName("Remember context")
  })

  it("navigates forward and backward with Tab while skipping disabled switches", async () => {
    const user = userEvent.setup()
    render(<><SlimeSwitchField label="Memory" defaultChecked /><SlimeSwitchField label="Unavailable" disabled /><SlimeSwitchField label="Search" /><button>Save</button></>)
    const memory = screen.getByRole("switch", { name: "Memory" })
    const search = screen.getByRole("switch", { name: "Search" })
    await user.tab()
    expect(memory).toHaveFocus()
    await user.tab()
    expect(search).toHaveFocus()
    await user.tab({ shift: true })
    expect(memory).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(memory).toHaveAttribute("aria-checked", "false")
    expect(memory).toHaveFocus()
  })

  it("has no internal text by default; opt-in state text does not replace the name", async () => {
    const { rerender } = render(<SlimeSwitchField label="Web access" />)
    expect(screen.queryByText("On")).not.toBeInTheDocument()
    expect(screen.queryByText("Off")).not.toBeInTheDocument()
    rerender(<SlimeSwitchField label="Web access" stateText={{checked:"On",unchecked:"Off"}} />)
    const control = screen.getByRole("switch", {name:"Web access"})
    expect(screen.getByText("On").closest('[aria-hidden="true"]')).not.toBeNull()
    await userEvent.click(control)
    expect(control).toHaveAccessibleName("Web access")
  })

  it("generates independent label associations and preserves external descriptions", async () => {
    render(<><p id="extra">Additional note.</p><SlimeSwitchField label="Memory" description="Keep context." aria-describedby="extra" /><SlimeSwitchField label="Search" /></>)
    const memory=screen.getByRole("switch",{name:"Memory"})
    const search=screen.getByRole("switch",{name:"Search"})
    expect(memory.id).not.toBe(search.id)
    expect(memory).toHaveAccessibleDescription("Keep context. Additional note.")
    await userEvent.click(screen.getByText("Memory"))
    expect(memory).toHaveAttribute("aria-checked","true")
    expect(search).toHaveAttribute("aria-checked","false")
  })

  it("retains controlled state, forwards its button ref, and respects consumer cancellation", async () => {
    const ref=createRef<HTMLButtonElement>()
    const change=vi.fn()
    const {rerender}=render(<SlimeSwitchField ref={ref} label="Approval" checked={false} onCheckedChange={change} />)
    const control=screen.getByRole("switch",{name:"Approval"})
    expect(ref.current).toBe(control)
    await userEvent.click(control)
    expect(change).toHaveBeenCalledExactlyOnceWith(true)
    expect(control).toHaveAttribute("aria-checked","false")
    rerender(<SlimeSwitchField label="Approval" checked={false} onCheckedChange={change} onClick={event=>event.preventDefault()} />)
    change.mockClear()
    await userEvent.click(control)
    expect(change).not.toHaveBeenCalled()
  })

  it("preserves native form submission values and disabled behavior", async () => {
    render(<form data-testid="preferences"><SlimeSwitchField label="Memory" name="memory" value="enabled" defaultChecked required /><SlimeSwitchField label="Background tasks" disabled /></form>)
    const form=screen.getByTestId("preferences") as HTMLFormElement
    expect(new FormData(form).get("memory")).toBe("enabled")
    await userEvent.click(screen.getByText("Memory"))
    expect(new FormData(form).has("memory")).toBe(false)
    await userEvent.click(screen.getByText("Background tasks"))
    expect(screen.getByRole("switch",{name:"Background tasks"})).toBeDisabled()
    expect(screen.getByRole("switch",{name:"Background tasks"})).toHaveAttribute("aria-checked","false")
  })

  it("retains a disabled checked value and restores interaction when re-enabled", async () => {
    const change = vi.fn()
    const { rerender } = render(<SlimeSwitchField label="Memory" checked disabled onCheckedChange={change} />)
    const control = screen.getByRole("switch", { name: "Memory" })
    await userEvent.click(screen.getByText("Memory"))
    expect(control).toHaveAttribute("aria-checked", "true")
    expect(change).not.toHaveBeenCalled()
    rerender(<SlimeSwitchField label="Memory" checked onCheckedChange={change} layout="stretched" />)
    await userEvent.click(screen.getByText("Memory"))
    expect(change).toHaveBeenCalledExactlyOnceWith(false)
    expect(control).toHaveAccessibleName("Memory")
  })

  it("submits through an external form and excludes a disabled checked field", () => {
    render(<><form id="external-preferences" data-testid="external-form" /><SlimeSwitchField label="Memory" form="external-preferences" name="memory" defaultChecked value="enabled" /><SlimeSwitchField label="Search" form="external-preferences" name="search" defaultChecked disabled /></>)
    const data = new FormData(screen.getByTestId("external-form") as HTMLFormElement)
    expect(data.get("memory")).toBe("enabled")
    expect(data.has("search")).toBe(false)
  })

  it("keeps the primitive usable with an external label", async () => {
    render(<><label htmlFor="external-switch">External setting</label><SlimeSwitch id="external-switch" /></>)
    await userEvent.click(screen.getByText("External setting"))
    expect(screen.getByRole("switch",{name:"External setting"})).toHaveAttribute("aria-checked","true")
  })

  it("omits a conditionally absent description without creating an empty association", () => {
    render(<SlimeSwitchField label="Memory" description={false} />)
    const control=screen.getByRole("switch",{name:"Memory"})
    expect(control).not.toHaveAttribute("aria-describedby")
    expect(control).toHaveAccessibleDescription("")
  })

  it("lets consumer keyboard handlers cancel toggling", async () => {
    const change=vi.fn()
    render(<SlimeSwitchField label="Approval" onCheckedChange={change} onKeyDown={event=>event.preventDefault()} />)
    const control=screen.getByRole("switch",{name:"Approval"})
    control.focus()
    await userEvent.keyboard("{Enter} ")
    expect(control).toHaveAttribute("aria-checked","false")
    expect(change).not.toHaveBeenCalled()
  })

  it("restores the uncontrolled initial value on native form reset", async () => {
    render(<form><SlimeSwitchField label="Search" defaultChecked name="search" required /><button type="reset">Reset</button></form>)
    const control=screen.getByRole("switch",{name:"Search"})
    await userEvent.click(control)
    expect(control).toHaveAttribute("aria-checked","false")
    await userEvent.click(screen.getByRole("button",{name:"Reset"}))
    expect(control).toHaveAttribute("aria-checked","true")
  })

  it("pauses offscreen and hidden material and disconnects its observation on unmount", () => {
    let update: IntersectionObserverCallback = () => {}
    const disconnect=vi.fn()
    const hidden=vi.spyOn(document,"hidden","get").mockReturnValue(false)
    vi.stubGlobal("IntersectionObserver",class { constructor(callback:IntersectionObserverCallback){update=callback} observe(){} disconnect=disconnect })
    try {
      const {unmount}=render(<SlimeSwitchField label="Memory" defaultChecked />)
      const control=screen.getByRole("switch",{name:"Memory"})
      expect(control).toHaveAttribute("data-animate","true")
      act(()=>update([{isIntersecting:false} as IntersectionObserverEntry],{} as IntersectionObserver))
      expect(control).toHaveAttribute("data-animate","false")
      act(()=>update([{isIntersecting:true} as IntersectionObserverEntry],{} as IntersectionObserver))
      expect(control).toHaveAttribute("data-animate","true")
      hidden.mockReturnValue(true)
      act(()=>document.dispatchEvent(new Event("visibilitychange")))
      expect(control).toHaveAttribute("data-animate","false")
      hidden.mockReturnValue(false)
      act(()=>document.dispatchEvent(new Event("visibilitychange")))
      expect(control).toHaveAttribute("data-animate","true")
      unmount()
      expect(disconnect).toHaveBeenCalledOnce()
    } finally { hidden.mockRestore();vi.unstubAllGlobals() }
  })

  it("renders deterministic paused SSR markup with unique material and label IDs", () => {
    const markup=renderToString(<><SlimeSwitchField label="Memory" defaultChecked /><SlimeSwitchField label="Search" /></>)
    const ids=Array.from(markup.matchAll(/ id="([^"]+)"/g),match=>match[1])
    expect(new Set(ids).size).toBe(ids.length)
    expect(markup.match(/data-animate="false"/g)).toHaveLength(2)
    expect(markup).toContain('aria-checked="true"')
    expect(markup).toContain('aria-checked="false"')
  })

  it("has no axe violations with labels, description, and decorative state text", async () => {
    const {container}=render(<SlimeSwitchField label="Agent memory" description="Remember preferences." stateText={{checked:"On",unchecked:"Off"}} />)
    expect(await axeViolations(container)).toEqual([])
  })
})
