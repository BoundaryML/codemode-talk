import { useRef } from "react";
import { Flow, defineTrack, useFlowFrame, type FlowKeyframe } from "../flow";
import "./diagrams.css";

/**
 * A production-shaped agent that uses codemode: static tools, dynamic tools the
 * agent wrote earlier, state persisted to disk, the codemode tool as a subagent
 * that loops on compiler diagnostics with retries, and a human-approval gate.
 */
const W = 460;
const H = 224;
const DURATION = 12000;

type P = { x: number; y: number };
const YOU: P = { x: 24, y: 120 };
const LLM: P = { x: 130, y: 24 };
const BOX = { x: 84, y: 62, w: 92, h: 116 };
const BOXC: P = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 };
const PORT_TOP: P = { x: BOXC.x, y: BOX.y };
const PORT_LEFT: P = { x: BOX.x, y: YOU.y };
const PORT_BOTTOM: P = { x: BOXC.x, y: BOX.y + BOX.h };
const PORT_RIGHT = (y: number): P => ({ x: BOX.x + BOX.w, y });
const CTX = { x: BOX.x + 10, y: BOX.y + BOX.h - 14, gap: 10.5 };
const DISK: P = { x: 130, y: 206 };
const STATIC = [{ x: 232, y: 40, name: "web_search()" }, { x: 232, y: 66, name: "read_file()" }];
const DYN = { x: 196, y: 84, w: 76, h: 44 };
const CM = { x: 196, y: 140, w: 176, h: 72 };
const CM_IN: P = { x: CM.x, y: 160 };
const WRITE: P = { x: 222, y: 190 };
const CHECK: P = { x: 262, y: 190 };
const RUN: P = { x: 302, y: 190 };
const GATE: P = { x: 342, y: 190 };
const HUMAN: P = { x: 422, y: 190 };

type T = ReturnType<typeof defineTrack>;
const hop = (id: string, t0: number, a: P, b: P, state: string, dur = 500, chip = false): T =>
  defineTrack(id, [
    { t: t0, ...a, opacity: 0, scale: chip ? 0.6 : 1, state },
    { t: t0 + 100, x: a.x + (b.x - a.x) * 0.12, y: a.y + (b.y - a.y) * 0.12, opacity: 1, scale: 1, ease: "out" },
    { t: t0 + dur, ...b, ease: "inOut" },
    { t: t0 + dur + 80, ...b, opacity: 0, scale: chip ? 0.7 : 1, ease: "linear" },
  ]);

const tracks: T[] = [];
const msgs: T[] = [];
const think: FlowKeyframe[] = [{ t: 0, ...LLM, state: "idle" }];
let msg = 0;
const ctx = (t: number, state: string) => {
  const x = CTX.x + msg * CTX.gap;
  msgs.push(defineTrack(`pr-msg-${msg}`, [
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

// timeline
tracks.push(hop("pr-task", 100, YOU, PORT_LEFT, "user", 600, true));
ctx(650, "user");
let t = llmTurn("pr-t1", 1000, "call");
// into the codemode subagent
tracks.push(hop("pr-cm-task", t, PORT_RIGHT(CM_IN.y), CM_IN, "call", 500, true));
const T_WRITE1 = t + 700;
const T_CHECK_FAIL = T_WRITE1 + 500;
const T_WRITE2 = T_CHECK_FAIL + 700;
const T_CHECK_OK = T_WRITE2 + 500;
const T_RUN = T_CHECK_OK + 500;
const T_GATE = T_RUN + 500;
const T_HUMAN = T_GATE + 300;
const T_APPROVED = T_HUMAN + 700;
const T_DONE = T_APPROVED + 500;
tracks.push(defineTrack("pr-inner", [
  { t: t + 500, ...CM_IN, opacity: 0, state: "code" },
  { t: T_WRITE1, ...WRITE, opacity: 1, ease: "out" },
  { t: T_WRITE1 + 250, ...WRITE, ease: "hold" },
  { t: T_CHECK_FAIL, ...CHECK, ease: "inOut", state: "call" },
  { t: T_CHECK_FAIL + 250, ...CHECK, ease: "hold" },
  { t: T_WRITE2, x: WRITE.x, y: WRITE.y - 14, ease: "inOut", state: "fail" },   // retry: back to write
  { t: T_WRITE2 + 250, x: WRITE.x, y: WRITE.y - 14, ease: "hold" },
  { t: T_CHECK_OK, ...CHECK, ease: "inOut", state: "code" },
  { t: T_CHECK_OK + 250, ...CHECK, ease: "hold" },
  { t: T_RUN, ...RUN, ease: "inOut", state: "result" },
  { t: T_RUN + 250, ...RUN, ease: "hold" },
  { t: T_GATE, ...GATE, ease: "inOut", state: "call" },
  { t: T_GATE + 100, ...GATE, opacity: 0 },
]));
tracks.push(hop("pr-ask", T_HUMAN, { x: GATE.x + 12, y: GATE.y }, { x: HUMAN.x - 26, y: HUMAN.y }, "call", 350));
tracks.push(hop("pr-ok", T_APPROVED, { x: HUMAN.x - 26, y: HUMAN.y }, { x: GATE.x + 12, y: GATE.y }, "result", 350));
tracks.push(hop("pr-cm-result", T_DONE, CM_IN, PORT_RIGHT(CM_IN.y), "result", 500, true));
ctx(T_DONE + 450, "result");
// persist state
const T_SAVE = T_DONE + 800;
tracks.push(hop("pr-save", T_SAVE, PORT_BOTTOM, { x: DISK.x, y: DISK.y - 9 }, "ctx", 400));
// answer
t = llmTurn("pr-t2", T_SAVE + 700, "answer", true);
tracks.push(hop("pr-answer", t, PORT_LEFT, YOU, "answer", 600, true));
think.push({ t: DURATION, ...LLM, state: "idle" });
const thinkTrack = defineTrack("pr-think", think);

const Boxes = () => {
  const checkRef = useRef<SVGRectElement | null>(null);
  const humanRef = useRef<SVGRectElement | null>(null);
  const diskRef = useRef<SVGRectElement | null>(null);
  const retryRef = useRef<SVGTextElement | null>(null);
  useFlowFrame((tt) => {
    const st = tt >= T_CHECK_FAIL && tt < T_WRITE2 ? "fail" : tt >= T_CHECK_OK && tt < T_RUN + 300 ? "ok" : "";
    checkRef.current?.setAttribute("data-state", st);
    humanRef.current?.setAttribute("data-state", tt >= T_HUMAN + 200 && tt < T_APPROVED + 200 ? "ask" : "");
    diskRef.current?.setAttribute("data-state", tt >= T_SAVE + 300 && tt < T_SAVE + 1000 ? "ok" : "");
    if (retryRef.current) retryRef.current.style.opacity = tt >= T_CHECK_FAIL && tt < T_CHECK_OK ? "1" : "0.35";
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dg-svg">
      {/* wires */}
      <path className="wire" d={`M ${PORT_TOP.x} ${PORT_TOP.y} L ${LLM.x} ${LLM.y + 14}`} />
      <path className="wire" d={`M ${YOU.x + 18} ${YOU.y} L ${BOX.x} ${PORT_LEFT.y}`} />
      <path className="wire" d={`M ${PORT_BOTTOM.x} ${PORT_BOTTOM.y} L ${DISK.x} ${DISK.y - 9}`} />
      {STATIC.map((s) => <path key={s.name} className="wire" d={`M ${BOX.x + BOX.w} ${s.y} L ${s.x - 36} ${s.y}`} />)}
      <path className="wire" d={`M ${BOX.x + BOX.w} 107 L ${DYN.x} 107`} />
      <path className="wire" d={`M ${BOX.x + BOX.w} ${CM_IN.y} L ${CM.x} ${CM_IN.y}`} />
      <path className="wire" d={`M ${GATE.x + 12} ${GATE.y} L ${HUMAN.x - 26} ${HUMAN.y}`} />
      <defs>
        <marker id="pr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-1)" />
        </marker>
      </defs>
      {/* LLM, you, agent */}
      <rect className="box" x={LLM.x - 40} y={LLM.y - 14} width={80} height={28} rx={6} />
      <text className="title" x={LLM.x} y={LLM.y + 3} textAnchor="middle">LLM</text>
      <rect className="box" x={YOU.x - 18} y={YOU.y - 14} width={36} height={28} rx={6} />
      <text className="title" x={YOU.x} y={YOU.y + 3} textAnchor="middle">you</text>
      <rect className="box" x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={6} />
      <text className="title" x={BOXC.x} y={BOX.y + 15} textAnchor="middle" style={{ fontSize: 6.5 }}>agent</text>
      <text className="label" x={BOXC.x} y={BOX.y + 26} textAnchor="middle">for (step &lt; MAX_STEPS)</text>
      <text className="label" x={CTX.x - 2} y={CTX.y - 11}>context</text>
      <rect className="box ctx" x={CTX.x - 6} y={CTX.y - 7} width={BOX.w - 8} height={14} rx={3} />
      {/* disk */}
      <rect ref={diskRef} className="box inner" x={DISK.x - 30} y={DISK.y - 9} width={60} height={18} rx={3} />
      <text x={DISK.x} y={DISK.y + 2.5} textAnchor="middle" style={{ fontSize: 5.5 }}>state.json · on disk</text>
      {/* static tools */}
      <text className="label" x={STATIC[0].x - 36} y={STATIC[0].y - 16}>static tools</text>
      {STATIC.map((s) => (
        <g key={s.name}>
          <rect className="box" x={s.x - 36} y={s.y - 10} width={72} height={20} rx={4} />
          <text x={s.x} y={s.y + 2.5} textAnchor="middle" style={{ fontSize: 6 }}>{s.name}</text>
        </g>
      ))}
      {/* dynamic tools */}
      <rect className="box muted" x={DYN.x} y={DYN.y} width={DYN.w} height={DYN.h} rx={4} strokeDasharray="2 2" />
      <text className="label" x={DYN.x + 5} y={DYN.y + 9}>dynamic tools</text>
      <text className="label" x={DYN.x + 5} y={DYN.y + 16} style={{ fontSize: 4.5 }}>written by the agent, last run</text>
      {["fetch_p0s()", "triage()"].map((n, i) => (
        <g key={n}>
          <rect className="box muted" x={DYN.x + 5 + i * 32} y={DYN.y + 22} width={30} height={12} rx={3} />
          <text x={DYN.x + 20 + i * 32} y={DYN.y + 30.5} textAnchor="middle" style={{ fontSize: 4.6 }}>{n}</text>
        </g>
      ))}
      {/* codemode subagent */}
      <rect className="box sandbox" x={CM.x} y={CM.y} width={CM.w} height={CM.h} rx={6} />
      <text className="title" x={CM.x + 8} y={CM.y + 13} style={{ fontSize: 6.5 }}>codemode(task) · subagent</text>
      <path className="wire" d={`M ${WRITE.x + 12} ${WRITE.y} L ${GATE.x - 12} ${GATE.y}`} />
      {/* retry loop: check → write */}
      <path className="wire" style={{ stroke: "var(--accent-1)" }} d={`M ${CHECK.x} ${CHECK.y - 8} C ${CHECK.x} ${CHECK.y - 26}, ${WRITE.x} ${WRITE.y - 26}, ${WRITE.x} ${WRITE.y - 8}`} markerEnd="url(#pr-arrow)" />
      <text ref={retryRef} className="label" x={(WRITE.x + CHECK.x) / 2} y={WRITE.y - 23} textAnchor="middle" style={{ fill: "var(--accent-1)" }}>retry ×3</text>
      {[
        { p: WRITE, name: "write", sub: "LLM" },
        { p: CHECK, name: "check", sub: "tsc" },
        { p: RUN, name: "run", sub: "sandbox" },
        { p: GATE, name: "gate", sub: "approve?" },
      ].map((n) => (
        <g key={n.name}>
          <rect ref={n.name === "check" ? checkRef : undefined} className="box inner" x={n.p.x - 12} y={n.p.y - 8} width={24} height={16} rx={3} />
          <text x={n.p.x} y={n.p.y + 2} textAnchor="middle" style={{ fontSize: 5 }}>{n.name}</text>
          <text className="label" x={n.p.x} y={n.p.y + 17} textAnchor="middle" style={{ fontSize: 4.5 }}>{n.sub}</text>
        </g>
      ))}
      {/* human */}
      <rect ref={humanRef} className="box inner" x={HUMAN.x - 26} y={HUMAN.y - 12} width={52} height={24} rx={5} />
      <text className="title" x={HUMAN.x} y={HUMAN.y + 2.5} textAnchor="middle" style={{ fontSize: 6 }}>human</text>
      <text className="label" x={HUMAN.x} y={HUMAN.y - 16} textAnchor="middle">email.send? ⏸</text>
    </svg>
  );
};

export const Production = () => (
  <Flow.Root duration={DURATION} posterTime={T_CHECK_FAIL + 100} aria-label="A production agent that uses codemode" className="dg-xwide" pauseWhenOffscreen={false}>
    <Flow.Stage width={W} height={H}>
      <Boxes />
      <Flow.Token track={thinkTrack}><div className="llm-ring sm" /></Flow.Token>
      {tracks.map((tk) => (
        <Flow.Token key={tk.id} track={tk}>
          {tk.id === "pr-task" ? <div className="chip code" style={{ borderColor: "var(--fg-secondary)", color: "var(--fg-secondary)", background: "var(--bg)" }}>task</div>
            : tk.id === "pr-answer" || tk.id === "pr-t2-down" ? <div className="chip code">answer</div>
            : tk.id === "pr-cm-result" ? <div className="chip result">result</div>
            : <div className="dot" />}
        </Flow.Token>
      ))}
      {msgs.map((tk) => (
        <Flow.Token key={tk.id} track={tk}><div className="msg sm" /></Flow.Token>
      ))}
    </Flow.Stage>
  </Flow.Root>
);
