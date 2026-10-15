# Slime switch

Use for a binary preference in AI/product settings: experimental output, memory, web access or a background permission. Do not use for submitting an action, destructive confirmation, progress or a tri-state value. Generic behavior has no AI/backend/provider dependency.

## Install and status

Locally built registry item: `slime-switch`. On the running preview, copy setup or run:

```sh
npx shadcn@latest add http://localhost:3105/r/slime-switch.json
```

Use the actual preview URL/port. The future public URL is `https://civilian.studio/r/slime-switch.json`; it is not yet a published/verified release. Never silently install stale source if that URL fails.

The installer delivers `slime-switch.tsx`, adjacent `slime-switch.css`, `radix-ui` and the project's shadcn utils. Keep the CSS import. No site provider or font is required. Import using the actual consumer alias.

```tsx
"use client"
import { useState } from "react"
import { SlimeSwitchField } from "@/components/ui/slime-switch"

export function AgentPreference() {
  const [enabled, setEnabled] = useState(false)
  return <SlimeSwitchField label="Experimental output" checked={enabled} onCheckedChange={setEnabled} />
}
```

For uncontrolled use, replace checked/onCheckedChange with defaultChecked (optional; false initially). Never supply both checked and defaultChecked. An uncontrolled switch can report changes through onCheckedChange. Connect real application state; the gallery's “Agent Slop” is demo text, not a required label.

## API

- `SlimeSwitch`: `checked`, `defaultChecked`, `onCheckedChange(checked:boolean)`, `disabled`, `required`, `name`, `value` (default `on`), `form`, native button attributes/events, ARIA and a forwarded button ref.
- `slimeColor`: green (default), blue, pink, purple.
- `treatment`: slime (default), subtle.
- `animate`: true by default; disables continuous ooze when false. OS reduced motion takes precedence. Material pauses offscreen/hidden and while disabled.
- `stateText?: {checked:string;unchecked:string}`: optional short decorative words (roughly three characters), never the accessible name. Long words clip; omit rather than abbreviate an essential localized name.
- `SlimeSwitchField` adds required stable `label:string`, optional `description:ReactNode`, `layout:"hugged"|"stretched"` (hugged default), and `fieldClassName`. It owns aria-label/labelledby and merges aria-describedby. className/style/ref apply to the button; fieldClassName applies to the field.
- No arbitrary children, asChild or public Thumb API. Slime owns its structure. Primitive use needs an external label/labelledby (aria-label supported for icon-like cases).

## Behavior and styling

Tab/Shift+Tab navigate; Space/Enter toggle; disabled controls are skipped. Keep the 66×44px target. Native checked enabled fields submit name/value; unchecked/disabled do not. Radix owns form reset and validation. Safari follows the platform keyboard-navigation setting; Option+Tab reaches controls. Consumer preventDefault cancellation is respected.

Focus uses host foreground/CanvasText, overridable via --slime-focus. --slime-control-edge sets the shaded color in the subtle gradient thumb rim; --slime-state-ink sets decorative text. Hover/press are decorative and never delay state. Disabled is matte neutral gel with a locked thumb; its position preserves the saved value. Forced colors uses system colors and reduced motion removes nonessential movement.

Namespaced material tokens: --slime-light, --slime-mid, --slime-dark, --slime-ink, --slime-glint. Field/ancestor tokens: --slime-label-font and --slime-description-gap (8px gap after the 36px reserved full-slime envelope). Descriptions are absent by default. Do not reduce clearance without checking the longest animated drop. `data-slot` hooks: switch, switch-thumb, slime-switch-field/row/label/description; Radix data-state/data-disabled and Field data-layout are preserved.

Tested clean consumers include React 18/Vite and React 19/Next.js. Browser checks cover Chrome, Firefox and WebKit. Manual screen-reader review and public publication verification remain release gates. Test any consumer palette/token override for text, control and focus contrast rather than inheriting an accessibility claim.
