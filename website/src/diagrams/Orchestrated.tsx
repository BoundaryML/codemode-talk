import { useRef, useState } from "react";
import { Flow, defineTrack, useFlowFrame, type FlowKeyframe } from "../flow";
import "./diagrams.css";

/**
 * Two diagrams with one visual grammar: an orchestrator box in the middle
 * (a workflow, or an agent loop) that talks to the LLM above it and to tools
 * on its right. The LLM never calls tools; the box does.
 *
 *  mode="workflow"  — slide 15: the codemode pipeline itself
 *  mode="agent"     — slide 18: codemode() as one tool inside an agent loop
 */
const W = 320;
const H = 220;

type P = { x: number; y: number };
const LLM: P = { x: 120, y: 26 };
const BOX = { x: 72, y: 62, w: 96, h: 128 }; // orchestrator
const BOXC: P = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 };
const PORT_TOP: P = { x: BOXC.x, y: BOX.y };
const PORT_RIGHT = (y: number): P => ({ x: BOX.x + BOX.w, y });
const PORT_LEFT: P = { x: BOX.x, y: 126 };
const YOU: P = { x: 28, y: 126 };
const CTX = { x: BOX.x + 10, y: BOX.y + BOX.h - 14, gap: 10.5 };

type T = ReturnType<typeof defineTrack>;
type Build = { tracks: T[]; msgs: T[]; think: FlowKeyframe[]; stepTimes: number[]; duration: number; times: Record<string, number> };

/** A dot/chip travelling from a to b over `dur` ms, fading at both ends. */
const hop = (id: string, t0: number, a: P, b: P, state: string, dur = 500, chip = false): T =>
  defineTrack(id, [
    { t: t0, ...a, opacity: 0, scale: chip ? 0.6 : 1, state },
    { t: t0 + 100, x: a.x + (b.x - a.x) * 0.12, y: a.y + (b.y - a.y) * 0.12, opacity: 1, scale: 1, ease: "out" },
    { t: t0 + dur, ...b, ease: "inOut" },
    { t: t0 + dur + 80, ...b, opacity: 0, scale: chip ? 0.7 : 1, ease: "linear" },
  ]);

const buildAgent = (): Build => {
  const tracks: T[] = [];
  const msgs: T[] = [];
  const think: FlowKeyframe[] = [];
  const stepTimes: number[] = [];
  const times: Record<string, number> = {};
  let msg = 0;
  const DURATION = 11000;
  const ctx = (t: number, state: string) => {
    const x = CTX.x + msg * CTX.gap;
    msgs.push(defineTrack(`ag-msg-${msg}`, [
      { t, x, y: CTX.y + 5, opacity: 0, state },
      { t: t + 220, x, y: CTX.y, opacity: 1, ease: "out" },
      { t: DURATION, x, y: CTX.y, ease: "hold" },
    ]));
    msg++;
  };
  // an agent→LLM→agent round trip: context up (gray), reply down (state)
  const llmTurn = (id: string, t0: number, reply: string, chip = false) => {
    stepTimes.push(t0);
    think.push({ t: t0 + 500, ...LLM, state: "think" });
    tracks.push(hop(`${id}-up`, t0, PORT_TOP, { x: LLM.x, y: LLM.y + 14 }, "ctx"));
    think.push({ t: t0 + 900, ...LLM, state: "idle" });
    tracks.push(hop(`${id}-down`, t0 + 900, { x: LLM.x, y: LLM.y + 14 }, PORT_TOP, reply, 500, chip));
    ctx(t0 + 1350, reply);
    return t0 + 1500;
  };
  const TOOL_WS: P = { x: 232, y: 72 };
  const CM_IN: P = { x: 190, y: 150 };
  const INNER = ["search", "describe", "write", "check", "run"].map((name, i) => ({ name, x: 205 + i * 24, y: 186 }));

  // 0 · user task
  times.user = 0;
  tracks.push(hop("ag-task", 100, YOU, PORT_LEFT, "user", 600, true));
  ctx(650, "user");
  // 1 · LLM → tool_call web_search
  times.searchCall = 1000;
  let t = llmTurn("ag-t1", 1000, "call");
  // 2 · run web_search
  times.searchResult = t + 100;
  tracks.push(hop("ag-ws-out", t + 100, PORT_RIGHT(TOOL_WS.y), { x: TOOL_WS.x - 38, y: TOOL_WS.y }, "call"));
  tracks.push(hop("ag-ws-back", t + 800, { x: TOOL_WS.x - 38, y: TOOL_WS.y }, PORT_RIGHT(TOOL_WS.y), "result"));
  ctx(t + 1250, "result");
  t += 1500;
  // 3 · LLM → tool_call codemode
  times.codemodeCall = t;
  t = llmTurn("ag-t2", t, "call");
  // 4 · run codemode: chip in, inner walk, result back
  times.codemodeResult = t + 100;
  tracks.push(hop("ag-cm-task", t + 100, PORT_RIGHT(CM_IN.y), CM_IN, "call", 600, true));
  const kf: FlowKeyframe[] = [{ t: t + 780, ...CM_IN, opacity: 0, state: "code" }, { t: t + 900, ...INNER[0], opacity: 1, ease: "out" }];
  INNER.forEach((n, i) => {
    const s0 = t + 900 + i * 340;
    kf.push({ t: s0 + 240, x: n.x, y: n.y, ease: "hold" });
    if (INNER[i + 1]) kf.push({ t: s0 + 340, x: INNER[i + 1].x, y: INNER[i + 1].y, ease: "inOut" });
  });
  const tEnd = t + 900 + (INNER.length - 1) * 340 + 240;
  kf.push({ t: tEnd + 100, x: INNER[INNER.length - 1].x, y: INNER[INNER.length - 1].y, opacity: 0 });
  tracks.push(defineTrack("ag-inner", kf));
  times.innerStart = t + 900;
  tracks.push(hop("ag-cm-result", tEnd + 150, CM_IN, PORT_RIGHT(CM_IN.y), "result", 600, true));
  ctx(tEnd + 700, "result");
  t = tEnd + 950;
  // 5 · LLM → answer, agent → you
  times.answer = t;
  t = llmTurn("ag-t3", t, "answer", true);
  tracks.push(hop("ag-answer", t, PORT_LEFT, YOU, "answer", 600, true));
  times.end = t + 900;
  think.push({ t: DURATION, ...LLM, state: "idle" });
  return { tracks, msgs, think: [{ t: 0, ...LLM, state: "idle" }, ...think], stepTimes, duration: DURATION, times };
};

const buildWorkflow = (): Build => {
  const tracks: T[] = [];
  const msgs: T[] = [];
  const think: FlowKeyframe[] = [];
  const times: Record<string, number> = {};
  let msg = 0;
  const DURATION = 14000;
  const ctx = (t: number, state: string) => {
    const x = CTX.x + msg * CTX.gap;
    msgs.push(defineTrack(`wf-msg-${msg}`, [
      { t, x, y: CTX.y + 5, opacity: 0, state },
      { t: t + 220, x, y: CTX.y, opacity: 1, ease: "out" },
      { t: DURATION, x, y: CTX.y, ease: "hold" },
    ]));
    msg++;
  };
  const llmTurn = (id: string, t0: number, reply: string, chip = false) => {
    think.push({ t: t0 + 500, ...LLM, state: "think" });
    tracks.push(hop(`${id}-up`, t0, PORT_TOP, { x: LLM.x, y: LLM.y + 14 }, "ctx"));
    think.push({ t: t0 + 900, ...LLM, state: "idle" });
    tracks.push(hop(`${id}-down`, t0 + 900, { x: LLM.x, y: LLM.y + 14 }, PORT_TOP, reply, 500, chip));
    ctx(t0 + 1350, reply);
    return t0 + 1500;
  };
  const tool = (id: string, t0: number, at: P) => {
    tracks.push(hop(`${id}-out`, t0, PORT_RIGHT(at.y), { x: at.x - 38, y: at.y }, "call"));
    tracks.push(hop(`${id}-back`, t0 + 700, { x: at.x - 38, y: at.y }, PORT_RIGHT(at.y), "result"));
    ctx(t0 + 1150, "result");
    return t0 + 1400;
  };
  const SEARCH: P = { x: 232, y: 72 };
  const DESCRIBE: P = { x: 232, y: 108 };
  const RUN: P = { x: 232, y: 160 };
  const SUB = [{ x: 296, y: 140 }, { x: 296, y: 160 }, { x: 296, y: 180 }];

  tracks.push(hop("wf-task", 100, YOU, PORT_LEFT, "user", 600, true));
  ctx(650, "user");
  let t = 1000;
  t = llmTurn("wf-plan", t, "answer");        // PlanSearch → queries
  t = tool("wf-search", t, SEARCH);            // search()
  t = llmTurn("wf-pick", t, "answer");        // pick the tools
  t = tool("wf-describe", t, DESCRIBE);        // describe()
  t = llmTurn("wf-write", t, "code", true);   // WriteScript → myScript
  // run(myScript): script chip out, fan to A/B/C, result back
  tracks.push(hop("wf-run-out", t, PORT_RIGHT(RUN.y), { x: RUN.x - 38, y: RUN.y }, "code", 600, true));
  SUB.forEach((s, i) => {
    const s0 = t + 700 + i * 300;
    tracks.push(hop(`wf-sub-${i}-out`, s0, { x: RUN.x + 38, y: RUN.y }, { x: s.x - 14, y: s.y }, "call", 220));
    tracks.push(hop(`wf-sub-${i}-back`, s0 + 250, { x: s.x - 14, y: s.y }, { x: RUN.x + 38, y: RUN.y }, "result", 220));
  });
  const tr = t + 700 + SUB.length * 300 + 100;
  tracks.push(hop("wf-run-back", tr, { x: RUN.x - 38, y: RUN.y }, PORT_RIGHT(RUN.y), "result", 600, true));
  ctx(tr + 550, "result");
  tracks.push(hop("wf-answer", tr + 900, PORT_LEFT, YOU, "answer", 600, true));
  times.end = tr + 1700;
  think.push({ t: DURATION, ...LLM, state: "idle" });
  return { tracks, msgs, think: [{ t: 0, ...LLM, state: "idle" }, ...think], stepTimes: [], duration: DURATION, times };
};

const AGENT = buildAgent();
const WORKFLOW = buildWorkflow();
export const AGENT_TIMES = AGENT.times;
const agentThink = defineTrack("ag-think", AGENT.think);
const wfThink = defineTrack("wf-think", WORKFLOW.think);

const Boxes = ({ mode }: { mode: "agent" | "workflow" }) => {
  const stepRef = useRef<SVGTextElement | null>(null);
  const innerRefs = useRef<(SVGRectElement | null)[]>([]);
  const INNER = ["search", "describe", "write", "check", "run"].map((name, i) => ({ name, x: 205 + i * 24, y: 186 }));
  useFlowFrame((t) => {
    if (mode !== "agent") return;
    const n = AGENT.stepTimes.filter((s) => t >= s).length;
    if (stepRef.current) stepRef.current.textContent = `agent · step ${n} / 5`;
    INNER.forEach((_, i) => {
      const t0 = AGENT.times.innerStart + i * 340;
      innerRefs.current[i]?.setAttribute("data-on", t >= t0 && t < t0 + 340 ? "true" : "false");
    });
  });
  const tools = mode === "agent"
    ? [{ x: 232, y: 72, name: "web_search()" }, { x: 232, y: 104, name: "read_file()" }]
    : [{ x: 232, y: 72, name: "search()" }, { x: 232, y: 108, name: "describe()" }, { x: 232, y: 160, name: "run(myScript)" }];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dg-svg">
      {/* wires */}
      <path className="wire" d={`M ${PORT_TOP.x} ${PORT_TOP.y} L ${LLM.x} ${LLM.y + 14}`} />
      {tools.map((tl) => (
        <path key={tl.name} className="wire" d={`M ${BOX.x + BOX.w} ${tl.y} L ${tl.x - 38} ${tl.y}`} />
      ))}
      <path className="wire" d={`M ${YOU.x + 18} ${YOU.y} L ${BOX.x} ${PORT_LEFT.y}`} />
      {mode === "agent" ? (
        <path className="wire" d={`M ${BOX.x + BOX.w} 150 L 190 150`} />
      ) : (
        [140, 160, 180].map((y) => <path key={y} className="wire" d={`M 270 160 L 282 ${y}`} />)
      )}
      {/* LLM */}
      <rect className="box" x={LLM.x - 40} y={LLM.y - 14} width={80} height={28} rx={6} />
      <text className="title" x={LLM.x} y={LLM.y + 3} textAnchor="middle">LLM</text>
      {/* orchestrator */}
      <rect className={`box ${mode === "workflow" ? "sandbox" : ""}`} x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={6} />
      <text ref={stepRef} className="title" x={BOXC.x} y={BOX.y + 15} textAnchor="middle" style={{ fontSize: 6.5 }}>
        {mode === "agent" ? "agent · step 0 / 5" : "codemode(task)"}
      </text>
      <text className="label" x={BOXC.x} y={BOX.y + 26} textAnchor="middle">
        {mode === "agent" ? "for (step < MAX_STEPS)" : "the workflow"}
      </text>
      <text className="label" x={CTX.x - 2} y={CTX.y - 11}>context</text>
      <rect className="box ctx" x={CTX.x - 6} y={CTX.y - 7} width={BOX.w - 8} height={14} rx={3} />
      {/* you */}
      <rect className="box" x={YOU.x - 18} y={YOU.y - 14} width={36} height={28} rx={6} />
      <text className="title" x={YOU.x} y={YOU.y + 3} textAnchor="middle">you</text>
      {/* tools */}
      {tools.map((tl) => (
        <g key={tl.name}>
          <rect className={`box ${tl.name.startsWith("run") ? "sandbox" : ""}`} x={tl.x - 38} y={tl.y - 12} width={76} height={24} rx={5} />
          <text x={tl.x} y={tl.y + 2.5} textAnchor="middle" style={{ fontSize: 6.5 }}>{tl.name}</text>
        </g>
      ))}
      {mode === "agent" ? (
        <>
          <rect className="box sandbox" x={190} y={128} width={124} height={78} rx={6} />
          <text className="title" x={200} y={142} style={{ fontSize: 6.5 }}>codemode(task)</text>
          <path className="wire" d={`M ${INNER[0].x} ${INNER[0].y} L ${INNER[INNER.length - 1].x} ${INNER[INNER.length - 1].y}`} />
          {INNER.map((n, i) => (
            <g key={n.name}>
              <rect ref={(el) => { innerRefs.current[i] = el; }} className="box inner" x={n.x - 11} y={n.y - 7} width={22} height={14} rx={3} />
              <text x={n.x} y={n.y + 2} textAnchor="middle" style={{ fontSize: 4.6 }}>{n.name}</text>
            </g>
          ))}
        </>
      ) : (
        ["toolA()", "toolB()", "toolC()"].map((name, i) => (
          <g key={name}>
            <rect className="box muted" x={282} y={140 + i * 20 - 7} width={34} height={14} rx={3} />
            <text x={299} y={140 + i * 20 + 2} textAnchor="middle" style={{ fontSize: 5 }}>{name}</text>
          </g>
        ))
      )}
    </svg>
  );
};

const StopAt = ({ startAt, endAt, onStop }: { startAt: number; endAt: number; onStop: () => void }) => {
  useFlowFrame((t) => {
    if (t >= endAt || t < startAt - 50) onStop();
  });
  return null;
};

const Visual = ({ id }: { id: string }) =>
  id.endsWith("-task") || id.endsWith("-answer") ? (
    <div className="chip code" style={id.endsWith("-answer") ? undefined : { borderColor: "var(--fg-secondary)", color: "var(--fg-secondary)", background: "var(--bg)" }}>
      {id.endsWith("-answer") ? "answer" : "task"}
    </div>
  ) : id === "ag-cm-result" || id === "wf-run-back" ? (
    <div className="chip result">result</div>
  ) : id === "wf-write-down" || id === "wf-run-out" ? (
    <div className="chip code">myScript</div>
  ) : id === "ag-t3-down" ? (
    <div className="chip code">answer</div>
  ) : (
    <div className="dot" />
  );

export const Orchestrated = ({
  mode,
  startAt = 0,
  endAt,
  wide = false,
}: {
  mode: "agent" | "workflow";
  startAt?: number;
  endAt?: number;
  /** Fill the slide width instead of the half-column default. */
  wide?: boolean;
}) => {
  const b = mode === "agent" ? AGENT : WORKFLOW;
  const [stopped, setStopped] = useState(false);
  return (
    <div>
      <Flow.Root
        duration={b.duration}
        posterTime={startAt}
        resetTime={startAt}
        paused={stopped}
        controls={endAt === undefined}
        aria-label={mode === "agent" ? "Codemode as one tool inside an agent loop" : "The codemode workflow"}
        className={wide ? "dg-wide" : "dg-solo"}
        pauseWhenOffscreen={false}
      >
        <Flow.Stage width={W} height={H}>
          {endAt !== undefined ? <StopAt startAt={startAt} endAt={endAt} onStop={() => setStopped(true)} /> : null}
          <Boxes mode={mode} />
          <Flow.Token track={mode === "agent" ? agentThink : wfThink}><div className="llm-ring sm" /></Flow.Token>
          {b.tracks.map((tk) => (
            <Flow.Token key={tk.id} track={tk}><Visual id={tk.id} /></Flow.Token>
          ))}
          {b.msgs.map((tk) => (
            <Flow.Token key={tk.id} track={tk}><div className="msg sm" /></Flow.Token>
          ))}
        </Flow.Stage>
      </Flow.Root>
      <div className="dg-legend" style={{ marginTop: 14 }}>
        <span><i style={{ background: "var(--fg-tertiary)" }} />context → LLM</span>
        <span><i style={{ background: "var(--accent-3)" }} />tool call</span>
        <span><i style={{ background: "var(--accent-2)" }} />tool result</span>
        <span><i style={{ background: "var(--accent)" }} />LLM output</span>
      </div>
    </div>
  );
};
