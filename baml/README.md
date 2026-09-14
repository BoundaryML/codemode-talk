# codemode (BAML)

A minimal codemode agent in BAML v1: search tools → describe them → have the
model write one script → run it in a child process with fake tools.

Uses the **nightly** toolchain. Either select it globally or per command:

```sh
baml toolchain use nightly          # or: BAML_VERSION=nightly baml ...
baml check
baml test                           # pure-code tests, no API key needed
ANTHROPIC_API_KEY=... baml run main -- --task "Find p0 bugs in boundaryml/baml and post a summary to #eng"
ANTHROPIC_API_KEY=... baml run main -- --task "Email avery a list of open invoices for cus_42" --approve-all
```

Files:
- `baml_src/tools.baml` — the tool catalog, `search_tools`, `describe_tools`
- `baml_src/codemode.baml` — `PlanSearch`, `WriteScript`, `run_script`, `main`
- `sandbox/runtime.mjs` — fake tool implementations + approval gate; the
  generated script is written to `sandbox/.run/script.mjs`
