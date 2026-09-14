import { Flow, defineTrack } from "../flow";
import "./diagrams.css";

/**
 * The codemode agent loop as it really is: the LLM is consulted several times
 * (pick a query, pick tools, write the script), each tool is a round trip,
 * and only the sandbox run is the "big" step. Context grows, but slowly.
 */
const W = 320;
const H = 220;
const DURATION = 10500;

const LLM = { x: 62, y: 100 };
const TOOLS = [
  { x: 210, y: 40, name: "search()", w: 70 },
  { x: 210, y: 100, name: "describe()", w: 70 },
  { x: 210, y: 160, name: "run()", w: 70 },
];
const SUB = [
  { x: 288, y: 136, name: "toolA()" },
  { x: 288, y: 160, name: "toolB()" },
  { x: 288, y: 184, name: "toolC()" },
];
const CTX = { x: 22, y: 200, gap: 13 };

type T = ReturnType<typeof defineTrack>;
const tracks: T[] = [];
const msgs: T[] = [];
const think: { t: number; x: number; y: number; state: string }[] = [{ t: 0, ...LLM, state: "think" }];
let msg = 0;
const ctxMsg = (t: number, state: string) => {
  const x = CTX.x + msg * CTX.gap;
  msgs.push(
    defineTrack(`al-msg-${msg}`, [
      { t, x, y: CTX.y + 6, opacity: 0, state },
      { t: t + 250, x, y: CTX.y, opacity: 1, ease: "out" },
      { t: DURATION, x, y: CTX.y, ease: "hold" },
    ]),
  );
  msg++;
};
const roundTrip = (id: string, t0: number, to: { x: number; y: number }, outState: string, backState: string, dwell = 300) => {
  think.push({ t: t0, ...LLM, state: "idle" });
  tracks.push(
    defineTrack(`al-${id}-out`, [
      { t: t0, ...LLM, opacity: 0, state: outState },
      { t: t0 + 150, x: LLM.x + 30, y: LLM.y, opacity: 1, ease: "out" },
      { t: t0 + 650, ...to, ease: "inOut" },
      { t: t0 + 750, ...to, opacity: 0, ease: "linear" },
    ]),
  );
  ctxMsg(t0 + 100, outState);
  const t1 = t0 + 750 + dwell;
  tracks.push(
    defineTrack(`al-${id}-back`, [
      { t: t1, ...to, opacity: 0, state: backState },
      { t: t1 + 120, x: to.x - 25, y: to.y, opacity: 1, ease: "out" },
      { t: t1 + 650, ...LLM, ease: "inOut" },
      { t: t1 + 750, ...LLM, opacity: 0, ease: "linear" },
    ]),
  );
  ctxMsg(t1 + 600, backState);
  think.push({ t: t1 + 700, ...LLM, state: "think" });
  return t1 + 750;
};

let t = 300;
t = roundTrip("search", t, TOOLS[0], "call", "result");
t = roundTrip("describe", t + 400, TOOLS[1], "call", "result");
// write the script: the LLM thinks longer, then a script travels to run()
think.push({ t: t + 400, ...LLM, state: "idle" });
const ts = t + 900;
tracks.push(
  defineTrack("al-script", [
    { t: ts, ...LLM, opacity: 0, scale: 0.6, state: "code" },
    { t: ts + 250, x: LLM.x + 34, y: LLM.y, opacity: 1, scale: 1, ease: "out" },
    { t: ts + 900, ...TOOLS[2], ease: "inOut" },
    { t: ts + 1000, ...TOOLS[2], opacity: 0, scale: 0.7 },
  ]),
);
ctxMsg(ts + 100, "code");
// sandbox fans out to A, B, C
SUB.forEach((s, i) => {
  const t0 = ts + 1050 + i * 380;
  tracks.push(
    defineTrack(`al-sub-${i}-out`, [
      { t: t0, ...TOOLS[2], opacity: 0, state: "call" },
      { t: t0 + 60, x: TOOLS[2].x + 30, y: TOOLS[2].y, opacity: 1, ease: "out" },
      { t: t0 + 220, ...s, ease: "inOut" },
      { t: t0 + 250, ...s, opacity: 0 },
    ]),
  );
  tracks.push(
    defineTrack(`al-sub-${i}-back`, [
      { t: t0 + 250, ...s, opacity: 0, state: "result" },
      { t: t0 + 300, x: s.x - 20, y: s.y, opacity: 1, ease: "out" },
      { t: t0 + 380, ...TOOLS[2], ease: "inOut" },
      { t: t0 + 400, ...TOOLS[2], opacity: 0 },
    ]),
  );
});
const tr = ts + 1050 + SUB.length * 380 + 100;
tracks.push(
  defineTrack("al-result", [
    { t: tr, ...TOOLS[2], opacity: 0, scale: 0.6, state: "result" },
    { t: tr + 200, x: TOOLS[2].x - 35, y: TOOLS[2].y, opacity: 1, scale: 1, ease: "out" },
    { t: tr + 900, ...LLM, ease: "inOut" },
    { t: tr + 1000, ...LLM, opacity: 0, scale: 0.7 },
  ]),
);
ctxMsg(tr + 800, "result");
think.push({ t: tr + 950, ...LLM, state: "think" });
think.push({ t: tr + 1500, ...LLM, state: "idle" });
ctxMsg(tr + 1500, "answer");
think.push({ t: DURATION, ...LLM, state: "idle" });
const thinkTrack = defineTrack("al-think", think);

const Boxes = () => (
  <svg viewBox={`0 0 ${W} ${H}`} className="dg-svg">
    {TOOLS.map((tl) => (
      <path key={tl.name} className="wire" d={`M ${LLM.x + 40} ${LLM.y} L ${tl.x - tl.w / 2} ${tl.y}`} />
    ))}
    {SUB.map((s) => (
      <path key={s.name} className="wire" d={`M ${TOOLS[2].x + 35} ${TOOLS[2].y} L ${s.x - 22} ${s.y}`} />
    ))}
    <rect className="box" x={LLM.x - 40} y={LLM.y - 30} width={80} height={60} rx={6} />
    <text className="title" x={LLM.x} y={LLM.y + 3} textAnchor="middle">LLM</text>
    {TOOLS.map((tl, i) => (
      <g key={tl.name}>
        <rect className={`box ${i === 2 ? "sandbox" : ""}`} x={tl.x - tl.w / 2} y={tl.y - 16} width={tl.w} height={32} rx={5} />
        <text className="title" x={tl.x} y={tl.y + 3} textAnchor="middle">{tl.name}</text>
      </g>
    ))}
    {SUB.map((s) => (
      <g key={s.name}>
        <rect className="box muted" x={s.x - 22} y={s.y - 8} width={44} height={16} rx={3} />
        <text x={s.x} y={s.y + 2.5} textAnchor="middle" style={{ fontSize: 5.5 }}>{s.name}</text>
      </g>
    ))}
    <text className="label" x={CTX.x - 6} y={CTX.y - 12}>context window</text>
    <rect className="box ctx" x={CTX.x - 8} y={CTX.y - 8} width={130} height={16} rx={3} />
  </svg>
);

export const AgentLoop = () => (
  <div>
    <Flow.Root duration={DURATION} posterTime={6800} aria-label="The codemode agent loop" className="dg-solo" pauseWhenOffscreen={false}>
      <Flow.Stage width={W} height={H}>
        <Boxes />
        <Flow.Token track={thinkTrack}><div className="llm-ring" /></Flow.Token>
        {tracks.map((tk) => (
          <Flow.Token key={tk.id} track={tk}>
            {tk.id === "al-script" ? (
              <div className="chip code">script.ts</div>
            ) : tk.id === "al-result" ? (
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
