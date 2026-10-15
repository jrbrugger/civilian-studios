# Provenance — `dot-object` (Default kit)

**Origin:** original Civilian Studios work (2026-10-13). Look and motion were approved in the throwaway
prototype `docs/prototypes/dot-object/`, then rebuilt test-first for the registry.

| Part | Built on | License | What we changed |
|---|---|---|---|
| `dot-object-engine.ts`, `dot-object-models.ts`, `dot-object-painter.ts`, `dot-object.tsx` | — | — | Original |
| Cursor gravity | Idea from thinking-orbs (Libraries.dev) | MIT | Idea only; the code is written from scratch |
| Styling conventions | shadcn/ui (`cn`, `data-slot`, theme tokens) | MIT | Followed, not copied |
| `scripts/bake-dot-model.ts` | `@gltf-transform/core` (dev only) | MIT | Samples a glTF into a dot cloud |

## Models

| Item | Source | License | Credit |
|---|---|---|---|
| `dot-object-dragon` | Winged Dragon, one of pair, Minneapolis Institute of Art (Sketchfab) | CC0 | Not required; we credit anyway |
| `dot-object-brain` | "Brain" by J-Toastie, via Poly Pizza | CC BY 3.0 | **Required** wherever it ships: "Brain by J-Toastie via Poly Pizza, CC BY 3.0" |

The brain's credit sits in its registry description, in this file, in the model file's header comment and on the `/dot-object` page.
The source models are not in git; re-download them to re-bake (see `docs/prototypes/dot-object/README.md`).

No code from canvasui or any non-permissive source is included.
