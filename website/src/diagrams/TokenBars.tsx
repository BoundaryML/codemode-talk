import { useStep } from "../deck";
import "./diagrams.css";

/** One horizontal bar per strategy; each segment is a chunk of the context. */
type Seg = { w: number; kind: "docs" | "sys" | "call" | "result" | "code" | "answer"; label?: string };
const ROWS: { name: string; at: number; total: string; segs: Seg[] }[] = [
  {
    name: "tool calling",
    at: 0,
    total: "~330k",
    segs: [
      { w: 100, kind: "docs", label: "1,640 tool schemas" },
      { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result A" },
      { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result B" },
      { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result C" },
      { w: 6, kind: "answer" },
    ],
  },
  {
    name: "codemode v0",
    at: 1,
    total: "~290k",
    segs: [
      { w: 100, kind: "docs", label: "1,640 API definitions, inlined" },
      { w: 12, kind: "code", label: "script" },
      { w: 8, kind: "answer", label: "result" },
    ],
  },
  {
    name: "codemode + search/describe",
    at: 3,
    total: "~4k",
    segs: [
      { w: 4, kind: "sys" },
      { w: 3, kind: "call" }, { w: 4, kind: "result" },
      { w: 3, kind: "call" }, { w: 6, kind: "result" },
      { w: 12, kind: "code" },
      { w: 8, kind: "answer" },
    ],
  },
];

const KIND_LABEL: Record<Seg["kind"], string> = {
  docs: "API docs in the prompt",
  sys: "system prompt",
  call: "tool call",
  result: "tool result",
  code: "generated script",
  answer: "final answer",
};

/** Tool calling, turn by turn: the whole context is re-sent and grows each time. */
const TURNS: { name: string; at: number; total: string; segs: Seg[] }[] = [
  { name: "turn 1", at: 0, total: "~100k", segs: [
    { w: 100, kind: "docs", label: "system prompt + 1,640 tool schemas" }, { w: 6, kind: "call", label: "A" } ] },
  { name: "turn 2", at: 1, total: "~145k", segs: [
    { w: 100, kind: "docs", label: "same prompt again" }, { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result A" }, { w: 6, kind: "call", label: "B" } ] },
  { name: "turn 3", at: 2, total: "~190k", segs: [
    { w: 100, kind: "docs", label: "same prompt again" }, { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result A" }, { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result B" }, { w: 6, kind: "call", label: "C" } ] },
  { name: "turn 4", at: 3, total: "~235k", segs: [
    { w: 100, kind: "docs", label: "same prompt again" }, { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result A" }, { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result B" }, { w: 6, kind: "call" }, { w: 38, kind: "result", label: "result C" }, { w: 6, kind: "answer" } ] },
];

export const TokenBars = ({ variant = "strategies" }: { variant?: "strategies" | "turns" }) => {
  const step = useStep();
  const rows = variant === "turns" ? TURNS : ROWS;
  const max = Math.max(...rows.map((r) => r.segs.reduce((n, s) => n + s.w, 0)));
  return (
    <div className="tb">
      {rows.map((r) => {
        const on = step >= r.at;
        return (
          <div key={r.name} className="tb-row" data-hidden={!on}>
            <div className="tb-name">{r.name}</div>
            <div className="tb-bar">
              {r.segs.map((s, i) => (
                <div
                  key={i}
                  className={`tb-seg tb-${s.kind} ${variant === "strategies" && step >= 2 && s.kind === "docs" ? "pulse" : ""}`}
                  style={{ width: `${(s.w / max) * 100}%` }}
                  title={KIND_LABEL[s.kind]}
                >
                  {s.label ? <span>{s.label}</span> : null}
                </div>
              ))}
            </div>
            <div className="tb-total">{r.total}</div>
          </div>
        );
      })}
      <div className="dg-legend" style={{ marginTop: 10 }}>
        {(["docs", "call", "result", "code", "answer"] as const).map((k) => (
          <span key={k}><i className={`tb-${k}`} />{KIND_LABEL[k]}</span>
        ))}
      </div>
    </div>
  );
};
