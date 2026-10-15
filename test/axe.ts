import axe from "axe-core"

/** Rule ids axe reports as violations (page-level "region" rule off: tests render fragments). */
export async function axeViolations(container: Element): Promise<string[]> {
  const result = await axe.run(container, { rules: { region: { enabled: false } } })
  return result.violations.map((v) => v.id)
}
