import { Flow, defineTrack, type FlowKeyframe } from "../flow";
import "./diagrams.css";

/**
 * Two stages on one clock:
 *  left  — classic tool calling: every tool result bounces back through the LLM
 *  right — codemode: the LLM writes one script; the sandbox does the bouncing.
 */
const W = 320;
const H = 220;
const DURATION = 6400;

const LLM = { x: 62, y: 100 };
const TOOLS = [
  { x: 268, y: 46, name: "A" },
  { x: 268, y: 100, name: "B" },
  { x: 268, y: 154, name: "C" },
];
const SANDBOX = { x: 165, y: 100 };
const CTX = { x: 22, y: 200, gap: 13 }; // context row (message squares)

// ── Left: tool calling ────────────────────────────────────────────────
const tcTracks: ReturnType<typeof defineTrack>[] = [];
const tcMsgs: ReturnType<typeof defineTrack>[] = [];
const tcThink: FlowKeyframe[] = [{ t: 0, ...LLM, state: "think" }];
{
  const per = 1900; // one round trip
  let msg = 0;
  TOOLS.forEach((tool, i) => {
    const t0 = 200 + i * per;
    // LLM thinks, then emits a tool call
    tcThink.push({ t: t0, ...LLM, state: "idle" });
    tcTracks.push(
      defineTrack(`tc-call-${i}`, [
        { t: t0, ...LLM, opacity: 0, state: "call" },
        { t: t0 + 150, x: LLM.x + 30, y: LLM.y, opacity: 1, ease: "out" },
        { t: t0 + 750, ...tool, ease: "inOut" },
        { t: t0 + 900, ...tool, opacity: 0, ease: "linear" },
      ]),
    );
    // message: assistant tool_use
    tcMsgs.push(
      defineTrack(`tc-msg-${msg}`, [
        { t: t0 + 100, x: CTX.x + msg * CTX.gap, y: CTX.y + 6, opacity: 0, state: "call" },
        { t: t0 + 350, x: CTX.x + msg * CTX.gap, y: CTX.y, opacity: 1, ease: "out" },
        { t: DURATION, x: CTX.x + msg * CTX.gap, y: CTX.y, ease: "hold" },
      ]),
    );
    msg++;
    // tool works, result travels back
    const t1 = t0 + 1000;
    tcTracks.push(
      defineTrack(`tc-res-${i}`, [
        { t: t1, ...tool, opacity: 0, state: "result" },
        { t: t1 + 120, x: tool.x - 20, y: tool.y, opacity: 1, ease: "out" },
        { t: t1 + 700, ...LLM, ease: "inOut" },
        { t: t1 + 800, ...LLM, opacity: 0, ease: "linear" },
      ]),
    );
    // message: tool_result (big — it's the whole payload)
    tcMsgs.push(
      defineTrack(`tc-msg-${msg}`, [
        { t: t1 + 650, x: CTX.x + msg * CTX.gap, y: CTX.y + 6, opacity: 0, state: "result" },
        { t: t1 + 850, x: CTX.x + msg * CTX.gap, y: CTX.y, opacity: 1, ease: "out" },
        { t: DURATION, x: CTX.x + msg * CTX.gap, y: CTX.y, ease: "hold" },
      ]),
    );
    msg++;
    tcThink.push({ t: t1 + 750, ...LLM, state: "think" });
  });
  // final answer
  const tf = 200 + TOOLS.length * per + 100;
  tcThink.push({ t: tf, ...LLM, state: "idle" });
  tcMsgs.push(
    defineTrack(`tc-msg-${msg}`, [
      { t: tf, x: CTX.x + msg * CTX.gap, y: CTX.y + 6, opacity: 0, state: "answer" },
      { t: tf + 250, x: CTX.x + msg * CTX.gap, y: CTX.y, opacity: 1, ease: "out" },
      { t: DURATION, x: CTX.x + msg * CTX.gap, y: CTX.y, ease: "hold" },
    ]),
  );
  tcThink.push({ t: DURATION, ...LLM, state: "idle" });
}
const tcThinkTrack = defineTrack("tc-think", tcThink);

// ── Right: codemode ───────────────────────────────────────────────────
const cmTracks: ReturnType<typeof defineTrack>[] = [];
const cmMsgs: ReturnType<typeof defineTrack>[] = [];
{
  // the LLM writes a script
  cmTracks.push(
    defineTrack("cm-script", [
      { t: 200, ...LLM, opacity: 0, scale: 0.6, state: "code" },
      { t: 500, x: LLM.x + 34, y: LLM.y, opacity: 1, scale: 1, ease: "out" },
      { t: 1200, ...SANDBOX, ease: "inOut" },
      { t: 1350, ...SANDBOX, opacity: 0, scale: 0.7, ease: "linear" },
    ]),
  );
  cmMsgs.push(
    defineTrack("cm-msg-0", [
      { t: 300, x: CTX.x, y: CTX.y + 6, opacity: 0, state: "code" },
      { t: 550, x: CTX.x, y: CTX.y, opacity: 1, ease: "out" },
      { t: DURATION, x: CTX.x, y: CTX.y, ease: "hold" },
    ]),
  );
  // sandbox bounces to A, B, C — fast, nothing goes back to the LLM
  const per = 620;
  TOOLS.forEach((tool, i) => {
    const t0 = 1400 + i * per;
    cmTracks.push(
      defineTrack(`cm-call-${i}`, [
        { t: t0, ...SANDBOX, opacity: 0, state: "call" },
        { t: t0 + 80, x: SANDBOX.x + 20, y: SANDBOX.y, opacity: 1, ease: "out" },
        { t: t0 + 300, ...tool, ease: "inOut" },
        { t: t0 + 340, ...tool, opacity: 0, ease: "linear" },
      ]),
    );
    cmTracks.push(
      defineTrack(`cm-res-${i}`, [
        { t: t0 + 340, ...tool, opacity: 0, state: "result" },
        { t: t0 + 400, x: tool.x - 16, y: tool.y, opacity: 1, ease: "out" },
        { t: t0 + 600, ...SANDBOX, ease: "inOut" },
        { t: t0 + 640, ...SANDBOX, opacity: 0, ease: "linear" },
      ]),
    );
  });
  // single result back to the LLM
  const tr = 1400 + TOOLS.length * per + 100;
  cmTracks.push(
    defineTrack("cm-final", [
      { t: tr, ...SANDBOX, opacity: 0, scale: 0.6, state: "result" },
      { t: tr + 250, x: SANDBOX.x - 30, y: SANDBOX.y, opacity: 1, scale: 1, ease: "out" },
      { t: tr + 900, ...LLM, ease: "inOut" },
      { t: tr + 1050, ...LLM, opacity: 0, scale: 0.7, ease: "linear" },
    ]),
  );
  cmMsgs.push(
    defineTrack("cm-msg-1", [
      { t: tr + 800, x: CTX.x + CTX.gap, y: CTX.y + 6, opacity: 0, state: "result" },
      { t: tr + 1050, x: CTX.x + CTX.gap, y: CTX.y, opacity: 1, ease: "out" },
      { t: DURATION, x: CTX.x + CTX.gap, y: CTX.y, ease: "hold" },
    ]),
  );
  cmMsgs.push(
    defineTrack("cm-msg-2", [
      { t: tr + 1200, x: CTX.x + 2 * CTX.gap, y: CTX.y + 6, opacity: 0, state: "answer" },
      { t: tr + 1450, x: CTX.x + 2 * CTX.gap, y: CTX.y, opacity: 1, ease: "out" },
      { t: DURATION, x: CTX.x + 2 * CTX.gap, y: CTX.y, ease: "hold" },
    ]),
  );
}
const cmThinkTrack = defineTrack("cm-think", [
  { t: 0, ...LLM, state: "think" },
  { t: 200, ...LLM, state: "idle" },
  { t: 1400 + TOOLS.length * 620 + 1000, ...LLM, state: "think" },
  { t: 1400 + TOOLS.length * 620 + 1300, ...LLM, state: "idle" },
  { t: DURATION, ...LLM, state: "idle" },
]);

const Boxes = ({ sandbox }: { sandbox?: boolean }) => (
  <svg viewBox={`0 0 ${W} ${H}`} className="dg-svg">
    {/* wires */}
    {TOOLS.map((t) => (
      <path
        key={t.name}
        className="wire"
        d={
          sandbox
            ? `M ${SANDBOX.x + 30} ${SANDBOX.y} L ${t.x - 30} ${t.y}`
            : `M ${LLM.x + 40} ${LLM.y} L ${t.x - 30} ${t.y}`
        }
      />
    ))}
    {sandbox ? (
      <path className="wire" d={`M ${LLM.x + 40} ${LLM.y} L ${SANDBOX.x - 30} ${SANDBOX.y}`} />
    ) : null}
    {/* LLM */}
    <rect className="box" x={LLM.x - 40} y={LLM.y - 30} width={80} height={60} rx={6} />
    <text className="title" x={LLM.x} y={LLM.y + 3} textAnchor="middle">LLM</text>
    {/* sandbox */}
    {sandbox ? (
      <>
        <rect className="box sandbox" x={SANDBOX.x - 30} y={SANDBOX.y - 22} width={60} height={44} rx={6} />
        <text className="title" x={SANDBOX.x} y={SANDBOX.y + 3} textAnchor="middle">sandbox</text>
      </>
    ) : null}
    {/* tools */}
    {TOOLS.map((t) => (
      <g key={t.name}>
        <rect className="box" x={t.x - 30} y={t.y - 16} width={60} height={32} rx={5} />
        <text x={t.x} y={t.y + 3} textAnchor="middle">tool {t.name}</text>
      </g>
    ))}
    {/* context row */}
    <text className="label" x={CTX.x - 6} y={CTX.y - 12}>context window</text>
    <rect className="box ctx" x={CTX.x - 8} y={CTX.y - 8} width={130} height={16} rx={3} />
  </svg>
);

export const RoundTripsCompare = ({
  which = "both",
  paused = false,
  posterTime = 4000,
}: {
  which?: "both" | "tools" | "code";
  /** Freeze the clock on the poster frame (e.g. "the script is about to run"). */
  paused?: boolean;
  posterTime?: number;
}) => (
  <div>
    <Flow.Root
      duration={DURATION}
      posterTime={posterTime}
      resetTime={paused ? posterTime : 0}
      paused={paused}
      controls={!paused}
      aria-label="Tool calling versus codemode round trips"
      className={which === "both" ? "dg-grid2" : "dg-solo"}
      pauseWhenOffscreen={false}
    >
      {which !== "code" ? (
        <Flow.Stage width={W} height={H}>
          <Boxes />
          <Flow.Token track={tcThinkTrack}><div className="llm-ring" /></Flow.Token>
          {tcTracks.map((t) => (
            <Flow.Token key={t.id} track={t}><div className="dot" /></Flow.Token>
          ))}
          {tcMsgs.map((t) => (
            <Flow.Token key={t.id} track={t}><div className="msg" /></Flow.Token>
          ))}
        </Flow.Stage>
      ) : null}
      {which !== "tools" ? (
        <Flow.Stage width={W} height={H}>
          <Boxes sandbox />
          <Flow.Token track={cmThinkTrack}><div className="llm-ring" /></Flow.Token>
          {cmTracks.map((t) => (
            <Flow.Token key={t.id} track={t}>
              {t.id === "cm-script" ? (
                <div className="chip code">script.ts</div>
              ) : t.id === "cm-final" ? (
                <div className="chip result">result</div>
              ) : (
                <div className="dot" />
              )}
            </Flow.Token>
          ))}
          {cmMsgs.map((t) => (
            <Flow.Token key={t.id} track={t}><div className="msg" /></Flow.Token>
          ))}
        </Flow.Stage>
      ) : null}
    </Flow.Root>
    {which === "both" ? (
      <div className="dg-caption">
        <span><b>tool calling</b> · 7 messages, 3 LLM turns</span>
        <span><b>codemode</b> · 3 messages, 1 LLM turn</span>
      </div>
    ) : null}
    <div className="dg-legend" style={{ marginTop: 14 }}>
      <span><i style={{ background: "var(--accent-3)" }} />tool call</span>
      <span><i style={{ background: "var(--accent-2)" }} />tool result</span>
      <span><i style={{ background: "var(--accent)" }} />LLM output</span>
    </div>
  </div>
);
