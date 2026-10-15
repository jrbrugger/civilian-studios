# Civilian Studios

**Useful React components with a little character.** Free shadcn registry items for AI-native UIs — chips, status dots, a liquid switch, and a brushed-metal skin for shadcn.

There is no single “install everything” package. Each row below is its own registry item. Shared deps install via `registryDependencies`.

Try them on [civilian.studio](https://civilian.studio): live preview, install command, and docs.

## Catalog

| Name | What it does | Install | Preview |
| --- | --- | --- | --- |
| Chip | Joining choice chips and removable chips | `npx shadcn@latest add https://civilian.studio/r/chip.json` | [Library](https://civilian.studio/assets/chip) |
| Metallic UI | Metal skin for shadcn (stylesheet + runtime) | `npx shadcn@latest add https://civilian.studio/r/metallic.json` | [Kit](https://civilian.studio/metallic/ui) |
| Metallic Chip | Chip in brushed steel | `npx shadcn@latest add https://civilian.studio/r/metallic-chip.json` | [Kit](https://civilian.studio/metallic/ui) |
| Metallic Button | Button in brushed steel | `npx shadcn@latest add https://civilian.studio/r/metallic-button.json` | [Kit](https://civilian.studio/metallic/ui) |
| Dot Object | Agent/status presence as animated dots | `npx shadcn@latest add https://civilian.studio/r/dot-object.json` | [Library](https://civilian.studio/assets/dot-object) |
| Dot Object — Dragon | Winged dragon model (CC0) | `npx shadcn@latest add https://civilian.studio/r/dot-object-dragon.json` | [Library](https://civilian.studio/assets/dot-object) |
| Dot Object — Brain | Brain model (CC BY 3.0 — keep credit) | `npx shadcn@latest add https://civilian.studio/r/dot-object-brain.json` | [Library](https://civilian.studio/assets/dot-object) |
| Slime Switch | Radix switch with a liquid surface | `npx shadcn@latest add https://civilian.studio/r/slime-switch.json` | [Library](https://civilian.studio/assets/slime) |

Pattern for any item:

```sh
npx shadcn@latest add https://civilian.studio/r/<name>.json
```

**Metallic UI** — after install, add `data-material="metallic"` and mount `<MetallicRuntime />` once. Dials: [civilian.studio/metallic/ui](https://civilian.studio/metallic/ui).

## Agent skill

Optional skill so Cursor / Claude Code / Codex can install and wire components without guessing props.

1. Download [`civilian.zip`](https://civilian.studio/skills/civilian.zip) (or see [Agent skill](https://civilian.studio/skill) on the site).
2. Extract the `civilian` folder next to your other skills:

```text
Codex:       .agents/skills/civilian/SKILL.md
Claude Code: .claude/skills/civilian/SKILL.md
```

This repo also ships `skills/civilian/` for local use. Components work without the skill.

## Prerequisites

React + TypeScript, Tailwind CSS 4, and shadcn/ui on Radix:

```sh
npx shadcn@latest init -b radix
```

## FAQ

**One command for the whole library?** No. Install the item you need. Metallic Chip also pulls Chip + Metallic automatically.

**npm package?** No. This is a shadcn registry — source is copied into your project.

**Commercial use?** MIT for original Civilian source. Keep model credits: dragon CC0; brain **CC BY 3.0** (J-Toastie via Poly Pizza). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

**Light / dark?** Components follow your app theme tokens. Metallic also respects a `.dark` ancestor.

## Working in this repo

```sh
npm install
npm run typecheck
npm test
npm run registry:build
```

Source/registry only — not the marketing site. See [CONTRIBUTING.md](CONTRIBUTING.md). Brand tokens: `styles/brand-themes.css` (`data-brand="civilian"` | `"morpius"`).

## License

MIT for original source; retain third-party and model notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
