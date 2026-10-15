# Dot Object

Use for agent presence, background-task feedback, and sparse status/empty-state layouts. Not dense toolbars or the only signal of progress. Always provide a meaningful label; actual task state comes from the application.

Install `npx shadcn@latest add https://civilian.studio/r/dot-object.json`.
Optional model items: `dot-object-dragon.json` and `dot-object-brain.json` at the same registry base URL.

Imports: `DotObject`, `ShimmerText` from `@/components/ui/dot-object`; `sphereDots`, `sphereLines`, `DotModel` from `@/components/ui/dot-object-models`; `dragon` from `@/components/ui/dot-object-dragon`; `brain` from `@/components/ui/dot-object-brain`. Install the matching optional model before importing it.

| Prop | Type / default | Meaning |
|---|---|---|
| model | DotModel; required | Baked cloud or generated model |
| label | string; required | Accessible text; announced when state changes after mount |
| state | idle / thinking / working / success / error / lost; idle | Real task state |
| size | sm / md / lg; md | 64 / 120 / 340px box |
| progress | number 0–1; omitted | Known progress while thinking/working; never fabricate it |
| gravity | boolean; true | Mouse interaction, disabled for touch/reduced motion/forced colors |
| showLabel | boolean; false | Render visible shimmering status text |
| paused | boolean; false | Pause object rendering |
| density | number 0.2–2; optional | Relative quality/cost; omission uses size preset |
| onSettled | (state: "success" \| "error") => void; optional | Terminal animation completion, not task completion |

Also accepts native div props except children. Color follows CSS `color`; theme controls foreground. The registry supplies `dot-shimmer` keyframes. `ShimmerText` accepts native span props and `busy: boolean` (false); do not duplicate live announcements around DotObject.

```tsx
import { DotObject } from "@/components/ui/dot-object"
import { dragon } from "@/components/ui/dot-object-dragon"

<DotObject model={dragon} state={taskState} label={taskLabel} size="md" showLabel />
```

Generated shapes: keep `sphereDots()` / `sphereLines()` models stable outside a frequently rendered component or memoize them. Limit simultaneous instances and use `sm`/lower density where appropriate. Reduced motion renders a still frame; unavailable canvas preserves status text.

Dragon: Winged Dragon, one of pair, Minneapolis Institute of Art, CC0. Brain: **Brain by J-Toastie via Poly Pizza, CC BY 3.0**. Preserve brain attribution wherever distributed. Do not assume custom model assets are permissively licensed.
