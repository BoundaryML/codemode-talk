import "./diagrams.css";

/**
 * Anthropic's programmatic tool calling, as a static diagram. `step` picks
 * which hop is highlighted; the slide shows the matching request/response
 * next to it.
 *
 *   0  your server → Claude      tools (+ allowed_callers) and the task
 *   1  Claude → container        Python that calls your tools; container
 *      container → your server   pauses, API returns tool_use { caller }
 *   2  your server → container   tool_result blocks only, same container id
 *   3  container → Claude        stdout; Claude → your server: the answer
 */
const HOPS: { id: string; at: number; d: string; label: string; lx: number; ly: number; anchor?: "start" | "middle" | "end" }[] = [
  { id: "req", at: 0, d: "M 172 128 L 298 86", label: "① tools + allowed_callers, task", lx: 236, ly: 96, anchor: "middle" },
  { id: "code", at: 1, d: "M 400 140 L 400 198", label: "② python", lx: 392, ly: 172, anchor: "end" },
  { id: "pause", at: 1, d: "M 298 232 L 172 200", label: "③ tool_use { caller }  · paused", lx: 236, ly: 205, anchor: "middle" },
  { id: "result", at: 2, d: "M 172 236 L 298 276", label: "④ tool_result only", lx: 236, ly: 268, anchor: "middle" },
  { id: "stdout", at: 3, d: "M 480 198 L 480 140", label: "⑤ stdout", lx: 488, ly: 172, anchor: "start" },
  { id: "answer", at: 3, d: "M 298 122 L 172 162", label: "⑥ answer", lx: 236, ly: 152, anchor: "middle" },
];

export const ProgrammaticToolCalling = ({ step }: { step: number }) => (
  <svg className="dg-svg ptc" viewBox="0 0 640 360" width="100%" style={{ display: "block" }}>
    <defs>
      <marker id="ptc-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--fg-border)" />
      </marker>
      <marker id="ptc-head-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
      </marker>
    </defs>

    {/* Anthropic side */}
    <rect className="box muted" x="262" y="28" width="360" height="316" rx="10" />
    <text className="label" x="272" y="44" style={{ fontSize: 8 }}>ANTHROPIC API</text>

    <rect className="box llm" x="300" y="60" width="280" height="80" rx="8" />
    <text className="title" x="314" y="82">Claude</text>
    <text className="label" x="314" y="100">writes Python that calls your tools</text>
    <text className="label" x="314" y="114">owns the loop</text>

    <rect className="box sandbox" x="300" y="198" width="280" height="122" rx="8" />
    <text className="title" x="314" y="220">code execution container</text>
    <g className="ptc-code" transform="translate(314 236)">
      <text y="0"><tspan className="k">import</tspan> json</text>
      <text y="14">rows = json.loads(<tspan className="k">await</tspan> <tspan className="f">query_database</tspan>({"{"}<tspan className="s">"sql"</tspan>: …{"}"}))</text>
      <text y="28">top = sorted(rows, key=…)[:5]</text>
      <text y="42"><tspan className="f">print</tspan>(top)</text>
      <text y="62" className="label">pauses on every tool call · resumes on your tool_result</text>
    </g>

    {/* Your side */}
    <rect className="box you" x="20" y="100" width="152" height="196" rx="8" />
    <text className="title" x="34" y="122">your server</text>
    <text className="label" x="34" y="142">receives tool_use</text>
    <text className="label" x="34" y="156">runs the tool</text>
    <text className="label" x="34" y="170">returns tool_result</text>
    <text className="label" x="34" y="196" style={{ fill: "var(--accent-1)" }}>no loop</text>
    <text className="label" x="34" y="210" style={{ fill: "var(--accent-1)" }}>no sandbox</text>
    <text className="label" x="34" y="224" style={{ fill: "var(--accent-1)" }}>no code</text>
    <text className="label" x="34" y="238" style={{ fill: "var(--accent-1)" }}>never sees the script</text>

    {/* Hops */}
    {HOPS.map((h) => {
      const on = step === h.at;
      return (
        <g key={h.id} className="ptc-hop" data-on={on}>
          <path d={h.d} markerEnd={on ? "url(#ptc-head-on)" : "url(#ptc-head)"} />
          <text x={h.lx} y={h.ly} textAnchor={h.anchor ?? "middle"}>{h.label}</text>
        </g>
      );
    })}
  </svg>
);
