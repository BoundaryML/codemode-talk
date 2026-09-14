import { Flow, defineTrack, createSeededRandom } from "../flow";
import "./diagrams.css";

/**
 * Naive codemode: dump every API's docs into the prompt (left) vs give the
 * agent search + describe and let it pull in only what it needs (right).
 */
const W = 320;
const H = 200;
const DURATION = 7000;

const PROMPT = { x: 86, y: 90, w: 112, h: 130 }; // the prompt box
const SOURCE = { x: 268, y: 100 }; // "all the APIs"
const CAP = 30; // chips that fit before overflow
const COLS = 3;
const CELL_W = 34;
const CELL_H = 11.5;
const ORIGIN = { x: PROMPT.x - PROMPT.w / 2 + 16, y: PROMPT.y - PROMPT.h / 2 + 12 };

const slot = (i: number) => ({
  x: ORIGIN.x + (i % COLS) * CELL_W,
  y: ORIGIN.y + Math.floor(i / COLS) * CELL_H,
});

const API_NAMES = [
  "createIssue", "listPRs", "mergePR", "createRelease", "addLabels", "getCommit",
  "createCharge", "refund", "listInvoices", "capturePI", "listPayouts", "subscribe",
  "sendEmail", "searchDocs", "readFile", "writeFile", "querySQL", "slackPost",
  "jiraCreate", "sentryList", "ghSearch", "s3Put", "s3Get", "cronAdd",
  "calendarAdd", "listUsers", "getUser", "deleteUser", "notify", "translate",
  "summarize", "embed", "vectorSearch", "renderPDF", "screenshot", "geocode",
  "weather", "stockQuote", "fxRate", "shorten", "qrCode", "hash", "encrypt",
  "sign", "verify", "upload", "download", "listBuckets",
];

const rnd = createSeededRandom("bloat");
const dumpTracks = API_NAMES.map((name, i) => {
  const t0 = 300 + i * 95 + rnd() * 40;
  const overflow = i >= CAP;
  const s = overflow
    ? { x: 36 + ((i - CAP) % 6) * 29 + rnd() * 6, y: PROMPT.y + PROMPT.h / 2 + 12 + Math.floor((i - CAP) / 6) * 11 + rnd() * 3 }
    : slot(i);
  return {
    name,
    track: defineTrack(`dump-${i}`, [
      { t: t0, x: SOURCE.x - 36, y: SOURCE.y, opacity: 0, scale: 0.6, state: overflow ? "overflow" : "doc" },
      { t: t0 + 120, x: SOURCE.x - 48, y: SOURCE.y, opacity: 1, scale: 1, ease: "out" },
      { t: t0 + 700, ...s, ease: "inOut" },
      { t: DURATION - 300, ...s, ease: "hold" },
      { t: DURATION, ...s, opacity: 0, ease: "linear" },
    ]),
  };
});
const dumpBoxTrack = defineTrack("dump-box", [
  { t: 0, x: PROMPT.x, y: PROMPT.y, state: "idle" },
  { t: 300 + CAP * 95 + 500, x: PROMPT.x, y: PROMPT.y, state: "overflow" },
  { t: DURATION, x: PROMPT.x, y: PROMPT.y, state: "overflow" },
]);

// Right stage: search → describe → 3 chips
const SEARCH = { x: 268, y: 56 };
const DESCRIBE = { x: 268, y: 144 };
const searchTracks = [
  // query out to search
  defineTrack("q1", [
    { t: 400, x: PROMPT.x + 40, y: PROMPT.y - 30, opacity: 0, state: "call" },
    { t: 550, x: PROMPT.x + 60, y: PROMPT.y - 30, opacity: 1, ease: "out" },
    { t: 1100, ...SEARCH, ease: "inOut" },
    { t: 1200, ...SEARCH, opacity: 0 },
  ]),
  // 3 names back
  ...[0, 1, 2].map((i) =>
    defineTrack(`name-${i}`, [
      { t: 1300 + i * 120, ...SEARCH, opacity: 0, scale: 0.6, state: "doc" },
      { t: 1450 + i * 120, x: SEARCH.x - 26, y: SEARCH.y, opacity: 1, scale: 1, ease: "out" },
      { t: 2000 + i * 120, x: PROMPT.x, y: ORIGIN.y + i * 14, ease: "inOut" },
      { t: DURATION - 300, x: PROMPT.x, y: ORIGIN.y + i * 14, ease: "hold" },
      { t: DURATION, x: PROMPT.x, y: ORIGIN.y + i * 14, opacity: 0, ease: "linear" },
    ]),
  ),
  // describe one
  defineTrack("q2", [
    { t: 2700, x: PROMPT.x + 40, y: PROMPT.y + 20, opacity: 0, state: "call" },
    { t: 2850, x: PROMPT.x + 60, y: PROMPT.y + 20, opacity: 1, ease: "out" },
    { t: 3400, ...DESCRIBE, ease: "inOut" },
    { t: 3500, ...DESCRIBE, opacity: 0 },
  ]),
  defineTrack("types", [
    { t: 3600, ...DESCRIBE, opacity: 0, scale: 0.6, state: "doc" },
    { t: 3750, x: DESCRIBE.x - 26, y: DESCRIBE.y, opacity: 1, scale: 1, ease: "out" },
    { t: 4300, x: PROMPT.x, y: ORIGIN.y + 3 * 14 + 10, ease: "inOut" },
    { t: DURATION - 300, x: PROMPT.x, y: ORIGIN.y + 3 * 14 + 10, ease: "hold" },
    { t: DURATION, x: PROMPT.x, y: ORIGIN.y + 3 * 14 + 10, opacity: 0, ease: "linear" },
  ]),
];
const searchBoxTrack = defineTrack("search-box", [
  { t: 0, x: PROMPT.x, y: PROMPT.y, state: "idle" },
  { t: 4300, x: PROMPT.x, y: PROMPT.y, state: "ok" },
  { t: DURATION, x: PROMPT.x, y: PROMPT.y, state: "ok" },
]);

const Frame = ({ mode }: { mode: "dump" | "search" }) => (
  <svg viewBox={`0 0 ${W} ${H}`} className="dg-svg">
    <rect className="box muted" x={PROMPT.x - PROMPT.w / 2} y={PROMPT.y - PROMPT.h / 2} width={PROMPT.w} height={PROMPT.h} rx={4} />
    <text className="label" x={PROMPT.x - PROMPT.w / 2} y={PROMPT.y - PROMPT.h / 2 - 5}>system prompt</text>
    {mode === "dump" ? (
      <>
        <rect className="box" x={SOURCE.x - 36} y={SOURCE.y - 22} width={72} height={44} rx={5} />
        <text className="title" x={SOURCE.x} y={SOURCE.y - 1} textAnchor="middle">1,640 tools</text>
        <text className="label" x={SOURCE.x} y={SOURCE.y + 10} textAnchor="middle">~278k tokens</text>
      </>
    ) : (
      <>
        <rect className="box" x={SEARCH.x - 34} y={SEARCH.y - 16} width={68} height={32} rx={5} />
        <text className="title" x={SEARCH.x} y={SEARCH.y + 3} textAnchor="middle">search()</text>
        <rect className="box" x={DESCRIBE.x - 34} y={DESCRIBE.y - 16} width={68} height={32} rx={5} />
        <text className="title" x={DESCRIBE.x} y={DESCRIBE.y + 3} textAnchor="middle">describe()</text>
        <path className="wire" d={`M ${PROMPT.x + PROMPT.w / 2} ${SEARCH.y} L ${SEARCH.x - 34} ${SEARCH.y}`} />
        <path className="wire" d={`M ${PROMPT.x + PROMPT.w / 2} ${DESCRIBE.y} L ${DESCRIBE.x - 34} ${DESCRIBE.y}`} />
      </>
    )}
  </svg>
);

export const ContextBloat = ({ mode }: { mode: "dump" | "search" }) => (
  <div className="cb">
    <div className="cb-tabs">
      <span className="cb-tab" data-on={mode === "dump"}><b>before</b> · inline all 1,640 tools</span>
      <span className="cb-arrow">→</span>
      <span className="cb-tab" data-on={mode === "search"}><b>after</b> · give it search() + describe()</span>
    </div>
    <div key={mode} className="cb-stage">
      <Flow.Root
        duration={DURATION}
        posterTime={mode === "dump" ? 5600 : 4800}
        resetTime={mode === "dump" ? 5600 : 0}
        paused={mode === "dump"}
        controls={mode !== "dump"}
        aria-label={mode === "dump" ? "Dumping every API doc into the prompt" : "Search and describe pull in only what is needed"}
        className="dg-solo"
        pauseWhenOffscreen={false}
      >
        {mode === "dump" ? (
          <Flow.Stage width={W} height={H}>
            <Frame mode="dump" />
            <Flow.Token track={dumpBoxTrack}><div className="prompt-fill" /></Flow.Token>
            {dumpTracks.map((d) => (
              <Flow.Token key={d.track.id} track={d.track}><div className="chip doc">{d.name}</div></Flow.Token>
            ))}
          </Flow.Stage>
        ) : (
          <Flow.Stage width={W} height={H}>
            <Frame mode="search" />
            <Flow.Token track={searchBoxTrack}><div className="prompt-fill" /></Flow.Token>
            {searchTracks.map((t) => (
              <Flow.Token key={t.id} track={t}>
                {t.id.startsWith("q") ? (
                  <div className="dot" />
                ) : t.id === "types" ? (
                  <div className="chip code wide">types.d.ts</div>
                ) : (
                  <div className="chip doc wide">{["github.createIssue", "linear.addLabel", "slack.post"][Number(t.id.slice(-1))]}</div>
                )}
              </Flow.Token>
            ))}
          </Flow.Stage>
        )}
      </Flow.Root>
    </div>
    <div className="dg-caption" style={{ justifyContent: "center", marginTop: 6 }}>
      {mode === "dump" ? <span>the prompt overflows before the agent writes a line</span> : <span>the prompt only holds what this task needs</span>}
    </div>
  </div>
);
