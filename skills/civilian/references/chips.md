# Chips

Install: `npx shadcn@latest add https://civilian.studio/r/chip.json`.

Imports: `ChipGroup`, `ChipGroupItem`, `ChipJoin` from `@/components/ui/chip-group`; `ChipList`, `ChipListProps`, `ChipListItem` from `@/components/ui/chip-list`. Adapt the alias to the consumer project.

## Choice chips

Use for finite selectable options (filters, context sources, preferences). Do not use as navigation links, ordinary action buttons, or a progress indicator.

`ChipGroup` inherits Radix ToggleGroup Root props, including `type`, `value`, `defaultValue`, `onValueChange`, `disabled`, `dir`, `className`, and `ref`. For `type="single"`, value/callback use a string; for `type="multiple"`, a string array. Empty values are possible; if one choice must remain selected, ignore an empty callback value in controlled state. Every item is its own Tab stop (`rovingFocus={false}`).

Additional prop: `join: "compact" | "block" | "none"`, default `compact`. Compact joins adjacent selections in one row; block also joins across wrapped rows; none keeps them separate. `ChipGroupItem` inherits Radix ToggleGroup Item props, requires a unique `value` and meaningful content/accessible name, and renders its own selection check. Disabled items remain disabled.

```tsx
import { ChipGroup, ChipGroupItem } from "@/components/ui/chip-group"

<ChipGroup type="multiple" aria-label="Sources" value={sources} onValueChange={setSources}>
  <ChipGroupItem value="documents">Documents</ChipGroupItem>
  <ChipGroupItem value="web">Web</ChipGroupItem>
</ChipGroup>
```

Styling: semantic shadcn colors; `data-slot="chip-group"` and `chip-group-item`, Radix item `data-state="on" | "off"`. Set `--chip-gap` rather than `gap-*`; defaults include `--chip-gap: --spacing(2)`, `--chip-seam: 2px`, `--chip-dur: 200ms`, and `--chip-ease: cubic-bezier(.2,.8,.2,1)`. Pass `dir="rtl"` for RTL. Preserve focus styles.

## Removable chips

Use for attachments or removable context. `ChipListItem`: `{ value: string; label: string; icon?: ReactNode }`; values must be unique/stable. `ChipList` inherits native `ul` props except children.

| Prop | Type / default | Purpose |
|---|---|---|
| items | ChipListItem[]; required | Current consumer-owned list |
| onRemove | (value: string) => void; required | Remove the value from consumer state |
| removal | fade / collapse / blur; fade | Exit treatment |
| close | overlap / glide / inout / spring; overlap | Gap-closing treatment |
| reducedMotion | boolean; OS preference | Override reduction only with user intent |
| getFallbackFocus | () => HTMLElement \| null; optional | Focus target after last item is removed |
| itemClassName | string; optional | Material/appearance customization |
| messages | { added?: (label) => string; removed?: (label) => string }; optional | Localized announcements |

```tsx
import { ChipList } from "@/components/ui/chip-list"

<ChipList aria-label="Attachments" items={attachments}
  onRemove={value => setAttachments(items => items.filter(item => item.value !== value))}
  getFallbackFocus={() => composerRef.current} />
```

Keep focus in the composer/next item when removing. Announcements occur on item changes after mount. Use the component's removal semantics rather than wrapping it in a competing exit animation.
