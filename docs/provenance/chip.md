# Provenance — `chip` (Default kit)

**Origin:** original Civilian Studios work (2026-10-13). Behaviour and timings were designed in the
throwaway spikes `active/prototypes/context-chips` (rejected: too much motion) and
`active/prototypes/chips-v2` (approved), then rebuilt test-first for the registry.

| Part | Built on | License | What we changed |
|---|---|---|---|
| `chip-group.tsx` | Radix `ToggleGroup` (`radix-ui`) | MIT | Every chip is its own Tab stop (`rovingFocus={false}`); block-join layout written onto items |
| `chip-list.tsx` | — (plain `ul`/`button`) | — | — |
| `chip-layout.ts`, `chip-motion.ts` | — | — | Original |
| Styling conventions | shadcn/ui (`cn`, `data-slot`, theme tokens) | MIT | Followed, not copied |
| Icons | lucide-react (`CheckIcon`, `XIcon`) | ISC | Used as-is |

No code from canvasui or any non-permissive source is included.
