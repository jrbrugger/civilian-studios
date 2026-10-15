---
name: civilian
description: Install and integrate Civilian Studios React components in product interfaces. Use for choice/removable chips, Metallic controls, Dot Object status indicators, or Slime switches; read the matching API reference before implementation.
---

# Civilian components

Use this skill to consume the library, not to develop or publish it. Follow the user's existing architecture and scope. Components are editable React/TypeScript source delivered through a shadcn registry; no agent service or account is required.

## Choose a component

| User task | Component | Reference |
|---|---|---|
| Select filters, sources, or options | ChipGroup / ChipGroupItem | [Chips](references/chips.md) |
| Remove attachments or selected context | ChipList | [Chips](references/chips.md) |
| Apply a steel material to chip selection or an action | Metallic chips / MetallicButton | [Metallic](references/metallic.md) |
| Change a binary agent preference with liquid material | SlimeSwitch / SlimeSwitchField | [Slime switch](references/slime-switch.md) |
| Show actual agent/background-task state | DotObject / ShimmerText | [Dot Object](references/dot-object.md) |

Read the matching reference before writing code. Never guess an import, prop, model, callback, or installation URL. Slime has a locally built registry item; use the running preview registry until its public release is published. Do not assume its public URL is live.

## Integration workflow

1. Inspect the project for React, TypeScript, Tailwind CSS 4, shadcn configuration, aliases, and existing component files. Reuse an already installed item; do not overwrite consumer changes. These primitives use Radix; mixed Base UI projects need a compatibility check.
2. Install the referenced registry item from the project root. If shadcn is missing, initialize it only within the user's authorized setup scope. The registry delivers CSS and dependencies as well as source. Copying TSX alone is insufficient for material tokens/keyframes.
3. Import using the actual configured alias. Keep `"use client"` at interactive boundaries where required. Connect real values and callbacks to the application's state; put mocked state only in clearly identified demos.
4. Preserve names/labels, Radix semantics, keyboard interaction, removal focus, reduced motion, and fallbacks. Use components only in the supported placement described by their references. Never invent progress or infer task completion from an animation.
5. Customize through props, composition, semantic shadcn tokens, and documented CSS hooks. Civilian and Morpius share semantic roles but use different brand values. Metallic/Slime are material layers, not separate behavior implementations. Do not require a Civilian font, provider, or backend for a primitive. Do not claim brand styles are installed by the chip item.
6. Run relevant project type/build checks and exercise the actual interaction. Check state changes, keyboard and theme behavior; report any verification not performed. A passing install command alone does not prove integration.

Public registry: `https://civilian.studio/r/<item>.json`. Installation failure is not permission to invent a package or silently use stale source. Report the failed dependency/URL and use an explicitly supplied local registry only when appropriate.
