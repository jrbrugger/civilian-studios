# Contributing

This repository is the **public allowlisted export** of free Civilian components. The website, prototypes, and private studio work live in a separate private app.

## How releases happen

1. Make changes in the private app (`civilian-studios-app`).
2. Export an empty destination outside that workspace:

```sh
node scripts/export-free-components.mjs /tmp/civilian-studios-release
```

3. Review the tree (`README.md`, `LICENSE`, `docs/RELEASE-MANIFEST.json`, registry JSON).
4. Publish that tree to this repo (replace `main` or open a PR) — never copy private git history, env files, site routes, or Pro content into this repository.

## What belongs here

- Free registry items under `public/r/`
- Component source, tests, provenance, consumer skill
- Brand theme tokens used by free items

## What does not

- Marketing site / Next app
- Prototypes and internal planning docs
- Environment secrets
- Unreleased / Pro collections

Questions about product direction belong on [civilian.studio](https://civilian.studio).
