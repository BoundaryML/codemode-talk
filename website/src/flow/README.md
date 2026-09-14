# Flow

Copy-ported from hatchet-dev/hatchet `frontend/docs/components/flow` (MIT).
Changes: no `"use client"`, `import.meta.env.DEV` instead of `process.env`,
and the design tokens (`--fg`, `--accent`, `--rlh`, ...) live in `src/flow/tokens.css`
under the `flow-scope` class, tuned for light mode.
