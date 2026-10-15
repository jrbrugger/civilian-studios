# Metallic

Install one of:

- `npx shadcn@latest add https://civilian.studio/r/metallic-chip.json`
- `npx shadcn@latest add https://civilian.studio/r/metallic-button.json`

Both resolve the shared `metallic` tokens/keyframes registry dependency. Chips also resolve `chip`. Never copy only the wrapper TSX without those dependencies.

## Chips

Imports: `MetallicChipGroup`, `MetallicChipGroupItem`, `MetallicChipList` from `@/components/ui/metallic-chip`. They inherit the APIs in [Chips](chips.md). Use for selections or removable context when a steel appearance is desired; semantics are unchanged. The group supplies a -1px seam and magnetic easing, and selected items use steel with a one-time sheen. `MetallicChipList` applies steel through `itemClassName`.

```tsx
<MetallicChipGroup type="multiple" aria-label="Sources" defaultValue={["documents"]}>
  <MetallicChipGroupItem value="documents">Documents</MetallicChipGroupItem>
  <MetallicChipGroupItem value="web">Web</MetallicChipGroupItem>
</MetallicChipGroup>
```

## Button

Import `MetallicButton` from `@/components/ui/metallic-button`. Inherits native button props, plus `size: "default" | "sm" | "lg" | "icon"` (default `default`) and `asChild: boolean` (default false). Normal button type defaults to `button`; explicitly pass `type="submit"` when intended. Name icon-only buttons with `aria-label`. `asChild` uses Radix Slot; provide one compatible element and retain its native link/action semantics.

```tsx
<MetallicButton onClick={runAnalysis} disabled={pending}>Run analysis</MetallicButton>
```

Do not use an ordinary button as a persistent selection control; use chips/toggle semantics instead.

## Material tokens

`--metallic-steel`, `--metallic-edge`, `--metallic-ink`, `--metallic-shadow`, `--metallic-shadow-pressed`, `--metallic-engrave`, and `--metallic-sheen` are supplied by the shared registry item. Keep `metallic-sheen` keyframes. Customize tokens in a scoped container; avoid changing global brand colors. Reduced motion removes sheen/overshoot; forced colors uses system colors.
