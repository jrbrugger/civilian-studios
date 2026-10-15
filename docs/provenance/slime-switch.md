# Provenance — Slime switch

Original geometry, material CSS, label composition and motion: Civilian Studios, 2026-10-14. The approved local prototype is archived at `docs/prototypes/slime-toggle/`; reusable source is `components/ui/slime-switch.tsx` and adjacent CSS.

- Interaction: Radix Switch Root/Thumb, `radix-ui` 1.8.1 / `@radix-ui/react-switch` 1.4.1 (MIT), used as dependencies rather than copying internals.
- Starting composition: [shadcn Switch](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/switch.tsx), retrieved 2026-10-14 (MIT, copyright 2023 shadcn). Changes replace surface classes with original material, add liquid SVG, palettes, motion controls and accessible Field composition. The full shadcn MIT notice is retained in the distributed TSX header and prototype notice file.
- The blur/threshold/specular technique builds on this workspace’s existing chips-v2 SlimeLayer, with original smaller switch geometry and pipeline. No third-party images, models or font assets are included.
- [Libraries.dev Gooey](https://libraries.dev/gooey) is visual inspiration for joined liquid silhouettes and elastic motion; no code, packages or assets copied from it.
- Utility: consumer shadcn `utils`; this workspace currently exports `cn` from the `cn` package. The registry resolves the consumer’s own utils dependency.

Dependency licenses remain with their respective packages. Do not remove the bundled shadcn notice when copying source. Public source-repository licensing/publication is a separate owner decision; this local build does not publish a repository or deployment.
