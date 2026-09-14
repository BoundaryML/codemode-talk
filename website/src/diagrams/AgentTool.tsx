import { useRef } from "react";
import { Flow, defineTrack, useFlowFrame } from "../flow";
import "./diagrams.css";

/**
 * Codemode as ONE tool inside an ordinary agent loop. The LLM has a small
 * toolbox; codemode() is the box with the whole search→describe→write→check→run
 * pipeline folded inside it. A step counter ticks with the outer loop.
 */
const W = 320;
const H = 220;
const DURATION = 9500;
const MAX_STEPS = 5;

const LLM = { x: 56, y: 100 };
const TOOLS = [
  { x: 200, y: 32, name: "web_search()" },
  { x: 200, y: 68, name: "read_file()" },
];
const CM = { x: 150, y: 108, w: 150, h: 92 }; // codemode box (top-left + size)
const CM_IN = { x: CM.x, y: CM.y + 24 }; // where calls enter
const INNER = ["search", "describe", "write", "check", "run"].map((name, i) => ({
  name,
  x: CM.x + 18 + i * 29,
  y: CM.y + 64,
}));
const CTX = { x: 22, y: 205, gap: 13 };

type T = ReturnType<typeof defineTrack>;
const tracks: T[] = [];
const msgs: T[] = [];
const think: { t: number; x: number; y: number; state: string }[] = [{ t: 0, ...LLM, state: "think" }];
let msg = 0;
const ctxMsg = (t: number, state: string) => {
  const x = CTX.x + msg * CTX.gap;
  msgs.push(defineTrack(`at-msg-${msg}`, [
    { t, x, y: CTX.y + 6, opacity: 0, state },
    { t: t + 250, x, y: CTX.y, opacity: 1, ease: "out" },
    { t: DURATION, x, y: CTX.y, ease: "hold" },
  ]));
  msg++;
};

// step 1: web_search round trip
{
  const t0 = 300;
  think.push({ t: t0, ...LLM, state: "idle" });
  tracks.push(defineTrack("at-ws-out", [
    { t: t0, ...LLM, opacity: 0, state: "call" },
    { t: t0 + 150, x: LLM.x + 30, y: LLM.y, opacity: 1, ease: "out" },
    { t: t0 + 700, x: TOOLS[0].x - 36, y: TOOLS[0].y, ease: "inOut" },
    { t: t0 + 800, x: TOOLS[0].x - 36, y: TOOLS[0].y, opacity: 0 },
  ]));
  ctxMsg(t0 + 100, "call");
  const t1 = t0 + 1000;
  tracks.push(defineTrack("at-ws-back", [
    { t: t1, x: TOOLS[0].x - 36, y: TOOLS[0].y, opacity: 0, state: "result" },
    { t: t1 + 100, x: TOOLS[0].x - 50, y: TOOLS[0].y, opacity: 1, ease: "out" },
    { t: t1 + 700, ...LLM, ease: "inOut" },
    { t: t1 + 800, ...LLM, opacity: 0 },
  ]));
  ctxMsg(t1 + 650, "result");
  think.push({ t: t1 + 750, ...LLM, state: "think" });
}
// step 2: codemode(task)
const TC = 2600;
think.push({ t: TC, ...LLM, state: "idle" });
tracks.push(defineTrack("at-cm-task", [
  { t: TC, ...LLM, opacity: 0, scale: 0.6, state: "call" },
  { t: TC + 200, x: LLM.x + 34, y: LLM.y, opacity: 1, scale: 1, ease: "out" },
  { t: TC + 900, ...CM_IN, ease: "inOut" },
  { t: TC + 1000, ...CM_IN, opacity: 0, scale: 0.7 },
]));
ctxMsg(TC + 100, "call");
// inner pipeline: one dot hops node to node
{
  const kf: { t: number; x: number; y: number; opacity?: number; state?: string; ease?: "out" | "inOut" | "hold" | "linear" }[] = [
    { t: TC + 1000, ...CM_IN, opacity: 0, state: "code" },
    { t: TC + 1150, x: INNER[0].x, y: INNER[0].y, opacity: 1, ease: "out" },
  ];
  INNER.forEach((n, i) => {
    const t = TC + 1150 + i * 420;
    kf.push({ t: t + 300, x: n.x, y: n.y, ease: "hold" });
    const next = INNER[i + 1];
    if (next) kf.push({ t: t + 420, x: next.x, y: next.y, ease: "inOut" });
  });
  const tEnd = TC + 1150 + (INNER.length - 1) * 420 + 300;
  kf.push({ t: tEnd + 150, x: INNER[INNER.length - 1].x, y: INNER[INNER.length - 1].y, opacity: 0 });
  tracks.push(defineTrack("at-inner", kf));
  // result leaves the box back to the LLM
  const tr = tEnd + 150;
  tracks.push(defineTrack("at-cm-result", [
    { t: tr, ...CM_IN, opacity: 0, scale: 0.6, state: "result" },
    { t: tr + 200, x: CM_IN.x - 20, y: CM_IN.y, opacity: 1, scale: 1, ease: "out" },
    { t: tr + 900, ...LLM, ease: "inOut" },
    { t: tr + 1000, ...LLM, opacity: 0, scale: 0.7 },
  ]));
  ctxMsg(tr + 800, "result");
  think.push({ t: tr + 900, ...LLM, state: "think" });
  // step 3: answer
  think.push({ t: tr + 1500, ...LLM, state: "idle" });
  ctxMsg(tr + 1500, "answer");
}
think.push({ t: DURATION, ...LLM, state: "idle" });
const thinkTrack = defineTrack("at-think", think);
const T_RESULT = TC + 1150 + (INNER.length - 1) * 420 + 300 + 150;
const STEP_TIMES = [300, TC, T_RESULT + 1500];
/** Loop times matching each message in the context-window log. */
export const AGENT_TOOL_TIMES = {
  user: 0,
  searchCall: 300,
  searchResult: 1300,
  codemodeCall: TC,
  codemodeResult: T_RESULT,
  answer: T_RESULT + 1500,
};

const Boxes = () => {
  const stepRef = useRef<SVGTextElement | null>(null);
  const innerRefs = useRef<(SVGRectElement | null)[]>([]);
  useFlowFrame((t) => {
    const n = STEP_TIMES.filter((s) => t >= s).length;
    if (stepRef.current) stepRef.current.textContent = `step ${n} / ${MAX_STEPS}`;
    // light up the inner node the dot is sitting on
    INNER.forEach((_, i) => {
      const t0 = TC + 1150 + i * 420;
      const on = t >= t0 && t < t0 + 420;
      innerRefs.current[i]?.setAttribute("data-on", on ? "true" : "false");
    });
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dg-svg">
      {TOOLS.map((tl) => (
        <path key={tl.name} className="wire" d={`M ${LLM.x + 40} ${LLM.y} L ${tl.x - 36} ${tl.y}`} />
      ))}
      <path className="wire" d={`M ${LLM.x + 40} ${LLM.y} L ${CM_IN.x} ${CM_IN.y}`} />
      <rect className="box" x={LLM.x - 40} y={LLM.y - 30} width={80} height={60} rx={6} />
      <text className="title" x={LLM.x} y={LLM.y + 3} textAnchor="middle">LLM</text>
      <text ref={stepRef} className="label" x={LLM.x} y={LLM.y - 38} textAnchor="middle">step 0 / {MAX_STEPS}</text>
      {TOOLS.map((tl) => (
        <g key={tl.name}>
          <rect className="box" x={tl.x - 36} y={tl.y - 13} width={72} height={26} rx={5} />
          <text x={tl.x} y={tl.y + 2.5} textAnchor="middle" style={{ fontSize: 6.5 }}>{tl.name}</text>
        </g>
      ))}
      {/* codemode tool: the whole pipeline lives inside */}
      <rect className="box sandbox" x={CM.x} y={CM.y} width={CM.w} height={CM.h} rx={6} />
      <text className="title" x={CM.x + 10} y={CM.y + 14}>codemode(task)</text>
      <path className="wire" d={`M ${INNER[0].x} ${INNER[0].y} L ${INNER[INNER.length - 1].x} ${INNER[INNER.length - 1].y}`} />
      {INNER.map((n, i) => (
        <g key={n.name}>
          <rect
            ref={(el) => { innerRefs.current[i] = el; }}
            className="box inner"
            x={n.x - 13} y={n.y - 8} width={26} height={16} rx={3}
          />
          <text x={n.x} y={n.y + 2} textAnchor="middle" style={{ fontSize: 5 }}>{n.name}</text>
        </g>
      ))}
      <text className="label" x={CTX.x - 6} y={CTX.y - 12}>context window</text>
      <rect className="box ctx" x={CTX.x - 8} y={CTX.y - 8} width={110} height={16} rx={3} />
    </svg>
  );
};

export const AgentTool = ({ startAt = 0 }: { startAt?: number }) => (
  <div>
    <Flow.Root duration={DURATION} posterTime={startAt} resetTime={startAt} aria-label="Codemode as one tool inside an agent loop" className="dg-solo" pauseWhenOffscreen={false}>
      <Flow.Stage width={W} height={H}>
        <Boxes />
        <Flow.Token track={thinkTrack}><div className="llm-ring" /></Flow.Token>
        {tracks.map((tk) => (
          <Flow.Token key={tk.id} track={tk}>
            {tk.id === "at-cm-task" ? (
              <div className="chip code">task</div>
            ) : tk.id === "at-cm-result" ? (
              <div className="chip result">result</div>
            ) : (
              <div className="dot" />
            )}
          </Flow.Token>
        ))}
        {msgs.map((tk) => (
          <Flow.Token key={tk.id} track={tk}><div className="msg" /></Flow.Token>
        ))}
      </Flow.Stage>
    </Flow.Root>
    <div className="dg-legend" style={{ marginTop: 14 }}>
      <span><i style={{ background: "var(--accent-3)" }} />tool call</span>
      <span><i style={{ background: "var(--accent-2)" }} />tool result</span>
      <span><i style={{ background: "var(--accent)" }} />LLM output</span>
    </div>
  </div>
);
