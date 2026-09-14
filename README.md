# codemode-talk

Slides + demo code for **"Codemode: the only tool your agent needs"**
(Avery Townsend & Aaron Villalpando, Boundary).

```
website/   Vite + React slide deck (light mode). Animated diagrams use a copy of
           hatchet's Flow engine (website/src/flow, MIT).
baml/      A working codemode agent in BAML v1 (nightly toolchain):
           search → describe → model writes a script → node runs it.
```

## Slides

```sh
cd website && pnpm install && pnpm dev     # http://localhost:5173
```

Keys: `→`/`space` next step, `←` back, `shift+→` skip a slide, `f` fullscreen.
Slides are addressable by hash (`#/12`, `#/12.2` for step 2).

## BAML demo

```sh
cd baml
baml toolchain use nightly                 # or prefix commands with BAML_VERSION=nightly
baml test                                  # offline: sandbox + approval-gate tests
ANTHROPIC_API_KEY=... baml run main        # the full loop with a default task
ANTHROPIC_API_KEY=... baml run main -- --task "Email avery the open invoices for cus_42" --approve-all
```
