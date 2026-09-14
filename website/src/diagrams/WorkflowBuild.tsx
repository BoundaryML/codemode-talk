import { useRef } from "react";
import { Flow, defineTrack, useFlowFrame } from "../flow";
import "./diagrams.css";

/**
 * "Wow" demo sketch: as the agent streams a BAML workflow, the graph on the
 * right grows node by node. Code lines and nodes are tokens; edges are SVG
 * paths whose opacity is driven by useFlowFrame.
 */
const W = 320;
const H = 200;
const DURATION = 8000;

const LINES: { text: React.ReactNode; node?: string }[] = [
  { text: <><span className="k">function</span> <span className="f">triage</span>(q: string) {"{"}</> },
  { text: <>  <span className="k">let</span> tools = <span className="f">search_tools</span>(q);</>, node: "search" },
  { text: <>  <span className="k">let</span> spec = <span className="f">describe</span>(tools);</>, node: "describe" },
  { text: <>  <span className="k">let</span> code = <span className="f">WriteScript</span>(q, spec);</>, node: "write" },
  { text: <>  <span className="k">let</span> out = <span className="f">run</span>(code) <span className="k">catch</span> ...</>, node: "run" },
  { text: <>  <span className="f">Summarize</span>(out)</>, node: "summarize" },
  { text: <>{"}"}</> },
];
const NODES: Record<string, { x: number; y: number; cls: string; label: string }> = {
  search:    { x: 236, y: 30,  cls: "tool", label: "search_tools" },
  describe:  { x: 236, y: 64,  cls: "tool", label: "describe" },
  write:     { x: 236, y: 98,  cls: "llm",  label: "WriteScript" },
  run:       { x: 236, y: 132, cls: "tool", label: "run (sandbox)" },
  summarize: { x: 236, y: 166, cls: "llm",  label: "Summarize" },
};
const ORDER = ["search", "describe", "write", "run", "summarize"];
const STEP = 900;
const T0 = 600;
const nodeTime = (id: string) => T0 + ORDER.indexOf(id) * STEP + 350;

const lineTracks = LINES.map((_l, i) => {
  const t0 = i === 0 ? 200 : i === LINES.length - 1 ? T0 + ORDER.length * STEP : T0 + (i - 1) * STEP;
  const y = 28 + i * 20;
  return defineTrack(`line-${i}`, [
    { t: t0, x: 12, y, opacity: 0 },
    { t: t0 + 250, x: 12, y, opacity: 1, ease: "out" },
    { t: DURATION - 400, x: 12, y, ease: "hold" },
    { t: DURATION, x: 12, y, opacity: 0, ease: "linear" },
  ]);
});
const nodeTracks = ORDER.map((id) => {
  const n = NODES[id];
  const t0 = nodeTime(id);
  return defineTrack(`node-${id}`, [
    { t: t0, x: n.x, y: n.y + 6, opacity: 0, scale: 0.8 },
    { t: t0 + 300, x: n.x, y: n.y, opacity: 1, scale: 1, ease: "out" },
    { t: DURATION - 400, x: n.x, y: n.y, ease: "hold" },
    { t: DURATION, x: n.x, y: n.y, opacity: 0, ease: "linear" },
  ]);
});

const Edges = () => {
  const ref = useRef<SVGGElement | null>(null);
  useFlowFrame((t) => {
    const g = ref.current;
    if (!g) return;
    ORDER.slice(1).forEach((id, i) => {
      const el = g.children[i] as SVGPathElement | undefined;
      if (!el) return;
      const t0 = nodeTime(id) + 150;
      const p = t >= DURATION - 400 ? 1 - (t - (DURATION - 400)) / 400 : Math.min(Math.max((t - t0) / 250, 0), 1);
      el.style.opacity = String(p);
    });
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dg-svg">
      <line x1={196} y1={8} x2={196} y2={192} className="wire" />
      <text className="label" x={12} y={14}>agent streams a workflow…</text>
      <text className="label" x={214} y={14}>…the graph grows</text>
      <g ref={ref}>
        {ORDER.slice(1).map((id, i) => {
          const a = NODES[ORDER[i]];
          const b = NODES[id];
          return (
            <path
              key={id}
              className="wire"
              style={{ opacity: 0, stroke: "var(--fg)" }}
              d={`M ${a.x} ${a.y + 8} L ${b.x} ${b.y - 8}`}
              markerEnd="url(#arrow)"
            />
          );
        })}
      </g>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--fg)" />
        </marker>
      </defs>
    </svg>
  );
};

export const WorkflowBuild = () => (
  <Flow.Root duration={DURATION} posterTime={5200} aria-label="A BAML workflow graph growing as code streams in" pauseWhenOffscreen={false}>
    <Flow.Stage width={W} height={H}>
      <Edges />
      {lineTracks.map((t, i) => (
        <Flow.Token key={t.id} track={t} className="dg-left">
          <div className="codeline" style={{ transform: "translateX(50%)" }}>{LINES[i].text}</div>
        </Flow.Token>
      ))}
      {nodeTracks.map((t, i) => {
        const n = NODES[ORDER[i]];
        return (
          <Flow.Token key={t.id} track={t}>
            <div className={`node ${n.cls}`}>{n.label}</div>
          </Flow.Token>
        );
      })}
    </Flow.Stage>
  </Flow.Root>
);
