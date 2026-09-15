import type { SlideDef } from "./deck";
import { Frag, useStep } from "./deck";
import { Slide, Code } from "./ui";
import { RoundTripsCompare } from "./diagrams/RoundTrips";
import { ContextBloat } from "./diagrams/ContextBloat";
import { TokenBars } from "./diagrams/TokenBars";
import { Orchestrated, AGENT_TIMES } from "./diagrams/Orchestrated";
import { Production } from "./diagrams/Production";

const CodemodeSlide = () => {
  const step = useStep();
  return (
    <Slide kicker="Codemode">
      <h2>Let the agent write a script and skip the intermediate steps</h2>
      <div className="row grow" style={{ alignItems: "center" }}>
        <div className="col" style={{ flex: "0 0 600px" }}>
          <Code title={step === 0 ? "what the LLM wrote" : "running in the sandbox"}>{`
const a = await toolA();
const b = await toolB(a.id);
const c = await toolC(b.items);
return { total: c.length, top: c[0] };
`}</Code>
          <Frag at={1}>
            <p className="small muted" style={{ marginTop: 10 }}>
              The sandbox makes the three calls. The LLM sees only the return value.
            </p>
          </Frag>
        </div>
        <div className="col">
          <RoundTripsCompare
            key={step === 0 ? "paused" : "playing"}
            which="code"
            paused={step === 0}
            posterTime={step === 0 ? 800 : 0}
          />
        </div>
      </div>
    </Slide>
  );
};

const PROMPT_SECTIONS: { note?: string; tone?: string; at?: number; lines: string[] }[] = [
  { note: "instructions", tone: "violet", lines: [
    "You write TypeScript. Return only code.",
    "These APIs are in scope:",
    "",
  ]},
  { note: "injected api 1 · github", tone: "bad", at: 1, lines: [
    "/** Create a GitHub issue. */",
    "declare function createIssue(args: {",
    "  repo: string; title: string; body?: string; labels?: string[];",
    "}): Promise<{ number: number; url: string }>;",
    "/** Merge a pull request. */",
    "declare function mergePullRequest(args: { repo: string; number: number }): Promise<void>;",
    "// … 713 more GitHub functions",
    "",
  ]},
  { note: "injected api 2 · stripe", tone: "bad", at: 2, lines: [
    "/** Create a charge. */",
    "declare function createCharge(args: { customer: string; amount: number; currency: string })",
    "  : Promise<{ id: string; status: string }>;",
    "// … 503 more Stripe functions",
    "",
  ]},
  { note: "injected api 3 · slack", tone: "bad", at: 2, lines: [
    "/** Post a message. */",
    "declare function post(args: { channel: string; text: string }): Promise<{ ts: string }>;",
    "// … 88 more Slack functions",
    "",
  ]},
  { note: "user task", tone: "good", at: 3, lines: [
    "Task: find open p0 bugs in boundaryml/baml, make a Linear",
    "ticket for each, and post a one-line summary to #eng.",
  ]},
];

const AnnotatedPrompt = () => {
  const step = useStep();
  return (
    <div className="ap">
      <div className="ap-doc">
        <div className="code-title">baml_src/codemode.baml · ~278,800 tokens</div>
        <div className="ap-body">
          <div className="ap-sec ap-sig">
            <pre className="ap-pre">{'function GenerateCode() -> string {\n  client: "anthropic/claude-sonnet-5"\n  prompt: `'}</pre>
          </div>
          {PROMPT_SECTIONS.map((sec, i) => {
            const on = step >= (sec.at ?? 0);
            return (
              <div key={i} className={`ap-sec ${on ? "on" : ""}`} data-tone={sec.tone}>
                <pre className="ap-pre">{sec.lines.join("\n")}</pre>
                {sec.note ? <div className="ap-note"><span className={`tag ${sec.tone}`}>{sec.note}</span></div> : null}
              </div>
            );
          })}
          <div className="ap-sec ap-sig">
            <pre className="ap-pre">{'  `\n}'}</pre>
          </div>
        </div>
      </div>
      <Frag at={4} className="ap-foot">
        <p><strong>Context still gets bloated with 1000s of APIs.</strong></p>
      </Frag>
    </div>
  );
};

/** Shows "Simple, right?" only at step 3, then hides it as code comes in. */
const SimpleRight = () => {
  const step = useStep();
  return (
    <div className="frag" data-hidden={step !== 3} style={{ position: "absolute", left: 120, bottom: 110 }}>
      <p className="lead">Simple, right?</p>
    </div>
  );
};

/**
 * Numbered steps where each title sits directly above its own code.
 * Titles reveal at `revealAt[i]`; the code (and sub text) expands in at `codeAt[i]`.
 */
const CodeSteps = ({
  items,
  revealAt,
  codeAt,
  dense,
}: {
  items: { title: React.ReactNode; sub?: React.ReactNode; code: string }[];
  revealAt: number[];
  codeAt: number[];
  dense?: boolean;
}) => {
  const step = useStep();
  const anyCode = step >= Math.min(...codeAt);
  return (
    <div className="cs" data-compact={!anyCode} data-dense={dense}>
      {items.map((it, i) => {
        const shown = step >= revealAt[i];
        const open = step >= codeAt[i];
        const active = open && (i === items.length - 1 ? true : step < codeAt[i + 1]);
        const state = !shown ? "hidden" : active ? "on" : open ? "done" : anyCode ? "off" : "plain";
        return (
          <div key={i} className="cs-item" data-state={state}>
            <div className="cs-head">
              <span className="cs-num">{i + 1}</span>
              <span className="cs-title">{it.title}</span>
              {it.sub ? <span className="cs-sub" data-open={open}>{it.sub}</span> : null}
            </div>
            <div className="cs-code" data-open={open}>
              <div><Code small>{it.code}</Code></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GROWN: { text: string; kids: { text: string; at: number }[] }[] = [
  { text: "Make an LLM generate code", kids: [
    { text: "search() for the tools you need", at: 1 },
    { text: "describe() them to get the types", at: 2 },
    { text: "type-check / lint the string it gave you", at: 3 },
  ]},
  { text: "Run it", kids: [
    { text: "put the APIs in scope, in a sandbox", at: 4 },
    { text: "gate the dangerous calls behind approval", at: 5 },
    { text: "log calls, generate an audit trail", at: 6 },
  ]},
  { text: "Save $$$$", kids: [] },
];

const StepsGrow = () => {
  const step = useStep();
  return (
    <Slide kicker="Let's build codemode, step by step">
      <h2>Remember when this was three steps?</h2>
      <ol className="sg2">
        {GROWN.map((g, i) => (
          <li key={i} className="sg2-item">
            <div className="sg2-head"><span className="sg2-num">{i + 1}</span>{g.text}</div>
            {g.kids.length ? (
              <ul className="sg2-kids">
                {g.kids.map((k) => (
                  <li key={k.text} className="sg2-kid" data-open={step >= k.at} data-new={step === k.at}>
                    <div><span className="sg2-kidin"><span className="tag violet">added</span>{k.text}</span></div>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </Slide>
  );
};

const SearchDescribeSlide = () => {
  const step = useStep();
  return (
    <Slide kicker="Making the LLM generate code, efficiently">
      <h2>Let's give the LLM <em>search()</em> and <em>describe()</em> tools</h2>
      <ContextBloat mode={step === 0 ? "dump" : "search"} />
    </Slide>
  );
};

const LOG: { role: "user" | "tool_call" | "tool_result" | "assistant"; text: string; at: number; t: number }[] = [
  { role: "user", at: 0, t: AGENT_TIMES.user,
    text: "File a Linear ticket for each p0 bug in boundaryml/baml, then tell #eng." },
  { role: "tool_call", at: 1, t: AGENT_TIMES.searchCall,
    text: 'web_search({ q: "boundaryml/baml open issues label:p0" })' },
  { role: "tool_result", at: 2, t: AGENT_TIMES.searchResult,
    text: "3 open issues: #812 Parser panics, #815 Streaming drops last token, #819 …" },
  { role: "tool_call", at: 3, t: AGENT_TIMES.codemodeCall,
    text: 'codemode({ task: "for issues 812, 815, 819: create a Linear ticket each, then post a one-line summary to #eng" })' },
  { role: "tool_result", at: 4, t: AGENT_TIMES.codemodeResult,
    text: '{ tickets: ["ENG-1001", "ENG-1002", "ENG-1003"], posted: true }' },
  { role: "assistant", at: 5, t: AGENT_TIMES.answer,
    text: "Filed ENG-1001, ENG-1002 and ENG-1003 and posted the summary to #eng." },
];

const AgentToolSlide = () => {
  const step = useStep();
  const showCode = step >= 6;
  const shown = LOG.filter((m) => m.at <= step);
  const startAt = showCode ? 0 : (LOG.find((m) => m.at === step)?.t ?? 0);
  // play just this message's segment, then freeze until the next press
  const endAt = showCode ? undefined : (LOG.find((m) => m.at === step + 1)?.t ?? AGENT_TIMES.end);
  return (
    <Slide kicker="Let's build codemode, step by step">
      <h2>Make it a tool. Give it to an agent.</h2>
      <div className="row grow">
        <div className="col" style={{ flex: "0 0 640px" }}>
          {showCode ? (
            <>
              <Code title="agent.ts" small>{`
const tools = {
  web_search: (q: string) => search(q),
  read_file:  (path: string) => fs.readFile(path, "utf8"),
  codemode:   (task: string) => codemode(task),   // search → describe → write → check → run
};

for (let step = 0; step < MAX_STEPS; step++) {
  const turn = await llm(messages, tools);
  if (!turn.toolCall) return turn.text;
  messages.push(await run(turn.toolCall));
}
`}</Code>
              <p className="small muted" style={{ marginTop: 10 }}>
                codemode(task) is just another tool. The search → describe → write → check → run
                pipeline is folded inside it.
              </p>
            </>
          ) : (
            <div className="log">
              <div className="log-head">
                <span>context window</span>
                <span>{shown.length} message{shown.length === 1 ? "" : "s"}</span>
              </div>
              {shown.map((m, i) => (
                <div key={i} className="log-msg" data-role={m.role} data-new={m.at === step}>
                  <span className="log-role">{m.role}</span>
                  <span className="log-text">{m.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col">
          <Orchestrated mode="agent" key={`${step}`} startAt={startAt} endAt={endAt} />
        </div>
      </div>
    </Slide>
  );
};

export const slides: SlideDef[] = [
  // 1 ── Title
  {
    render: () => (
      <Slide className="center">
        <div className="kicker">Foundations · Talk 2</div>
        <h1>
          Codemode
          <br />
          <span style={{ color: "var(--accent)" }}>the only tool your agent needs</span>
        </h1>
        <p className="lead" style={{ marginTop: 24 }}>
          Avery Townsend &amp; Aaron Villalpando
        </p>
        <p className="muted">Boundary · creators of BAML</p>
      </Slide>
    ),
  },

  // 2 ── Show of hands
  {
    steps: 1,
    render: () => (
      <Slide className="center">
        <h2>Quick show of hands</h2>
        <p className="lead">
          Who has heard of <em>codemode</em>?
        </p>
        <Frag at={1}>
          <p className="lead">
            What about <code>eval()</code>?
          </p>
        </Frag>
      </Slide>
    ),
  },

  // 3 ── The problem with tool calling
  {
    steps: 1,
    render: () => (
      <Slide kicker="The problem with tool calling (and MCP)">
        <div className="row grow">
          <div className="col" style={{ flex: "0 0 560px" }}>
            <h2>Every tool result is a round trip through the LLM</h2>
            <p>
              Call <code>A</code>, then <code>B</code> with the output of{" "}
              <code>A</code>, then <code>C</code> with the output of <code>B</code>?
            </p>
            <Frag at={1}>
              <p className="small muted">
                MCP makes this worse: the whole tool catalog is in the prompt too.
              </p>
            </Frag>
          </div>
          <div className="col">
            <RoundTripsCompare which="tools" />
          </div>
        </div>
      </Slide>
    ),
  },

  // 4 ── Expensive: the context is re-sent and grows every turn
  {
    steps: 4,
    render: () => (
      <Slide kicker="The problem with tool calling (and MCP)">
        <h2>This gets expensive.</h2>
        <TokenBars variant="turns" />
        <Frag at={4}>
          <p className="lead" style={{ marginTop: 6 }}>
            Imagine reporting <em>every keystroke</em> to your manager, and waiting for approval before the next one.
          </p>
        </Frag>
      </Slide>
    ),
  },

  // 5 ── Codemode definition: the script, then run it
  {
    steps: 1,
    render: () => <CodemodeSlide />,
  },

  // 6 ── Why
  {
    steps: 3,
    render: () => (
      <Slide kicker="Why use codemode?">
        <h2>Cheaper, and faster.</h2>
        <div className="row" style={{ marginTop: 12 }}>
          <Frag at={1} className="card good">
            <span className="tag good">faster</span>
            <h3>One LLM turn instead of N</h3>
            <p>No waiting on the model between tool calls. The sandbox runs at machine speed, and loops, retries and <code>Promise.all</code> are just code.</p>
          </Frag>
          <Frag at={2} className="card good">
            <span className="tag good">cheaper</span>
            <h3>Results never enter the context</h3>
            <p>Filter, fan out, aggregate a 50k-row payload in code. The model only ever sees the summary.</p>
          </Frag>
          <Frag at={3} className="card accent">
            <span className="tag violet">anthropic's numbers</span>
            <div className="row" style={{ gap: 28, marginTop: 4 }}>
              <div className="stat"><span className="n" style={{ fontSize: 72, color: "var(--accent)" }}>24%</span><span className="l">fewer input tokens</span></div>
              <div className="stat"><span className="n" style={{ fontSize: 72, color: "var(--accent)" }}>+11%</span><span className="l">accuracy</span></div>
            </div>
            <p className="small muted">Programmatic tool calling on top of basic search tools, vs. plain tool calling.<sup>[1]</sup></p>
          </Frag>
        </div>
        <div className="footnote">
          [1] <a href="https://claude.com/blog/improved-web-search-with-dynamic-filtering">claude.com/blog/improved-web-search-with-dynamic-filtering</a>
        </div>
      </Slide>
    ),
  },

  // 7 ── Section: in the wild
  {
    render: () => (
      <Slide className="center">
        <div className="kicker">Part 2</div>
        <h1>Codemode in the wild</h1>
        <p className="lead muted">Who's already doing this?</p>
      </Slide>
    ),
  },

  // 8 ── In the wild: Claude workflows
  {
    render: () => (
      <Slide kicker="Codemode in the wild">
        <div className="row grow">
          <div className="col" style={{ flex: "0 0 520px" }}>
            <h2>Claude Code workflows</h2>
            <p>
              Claude writes a JavaScript orchestration script. <code>agent()</code>,{" "}
              <code>parallel()</code>, <code>phase()</code> are the "tools".
            </p>
            <p>
              Bun rewrote itself in Rust with one of these, running for <strong>11 days</strong>.
            </p>
          </div>
          <div className="col">
            <img className="img" src="/img/claude-workflow.png" alt="A Claude Code workflow script" />
          </div>
        </div>
      </Slide>
    ),
  },

  // 8 ── In the wild: coding harnesses
  {
    steps: 1,
    render: () => (
      <Slide kicker="Codemode in the wild">
        <h2>Coding harnesses take your query and execute code</h2>
        <p>Sometimes in ridiculous ways. From Armin Ronacher:</p>
        <Frag at={1} className="grow" style={{ display: "flex", alignItems: "center" }}>
          <img className="img" src="/img/armin-powershell.png" alt="Bash runs Python runs Node runs PowerShell" style={{ maxHeight: 420 }} />
        </Frag>
        <div className="row">
          <p className="small muted">"Since it was already doing that, it used Bash to run Python to then run Node.js to then use Node.js to invoke PowerShell."</p>
        </div>
      </Slide>
    ),
  },

  // Section: let's build it
  {
    render: () => (
      <Slide className="center">
        <div className="kicker">Part 3</div>
        <h1>Let's build codemode</h1>
        <p className="lead muted">Step by step</p>
      </Slide>
    ),
  },

  // Let's build it: three steps, then the code gets injected in place
  {
    steps: 6,
    render: () => (
      <Slide kicker="Let's build codemode, step by step">
        <h2>The flow</h2>
        <CodeSteps
          revealAt={[0, 1, 2]}
          codeAt={[4, 5, 6]}
          items={[
            {
              title: "Make an LLM generate code",
              sub: "+ a gazillion API docs in the prompt",
              code: `
const apis = { github, stripe, slack, linear /* … */ };

const prompt: string = \`
  You write TypeScript. These APIs are in scope:
  \${Object.entries(apis).map(([k, v]) => describe(k, v)).join("\\n")}
\`;

const code: string = await llm(prompt, userQuery);
`,
            },
            {
              title: "Run it",
              sub: "put the APIs in scope, then eval() the string",
              code: `
const { github, stripe, slack, linear } = apis;
const result = await eval(\`(async () => { \${code} })()\`);
`,
            },
            {
              title: "Save $$$$",
              sub: "…?",
              code: `
return result; // 🤑
`,
            },
          ]}
        />
        <SimpleRight />
      </Slide>
    ),
  },

  // The prompt, rendered
  {
    steps: 4,
    render: () => (
      <Slide kicker="Let's build codemode, step by step">
        <h2>The LLM prompt for generating code</h2>
        <AnnotatedPrompt />
      </Slide>
    ),
  },

  // 11 ── Problem: API definitions are still expensive
  {
    steps: 3,
    render: () => (
      <Slide kicker="Problem">
        <h2>API definitions are still expensive</h2>
        <TokenBars />
      </Slide>
    ),
  },

  // 12 ── Search + describe (animated)
  {
    steps: 1,
    render: () => <SearchDescribeSlide />,
  },

  // The agent loop, as it really is now
  {
    render: () => (
      <Slide kicker="Making the LLM generate code, efficiently">
        <h2>Wait. This is a whole workflow now.</h2>
        <Orchestrated mode="workflow" wide />
      </Slide>
    ),
  },

  // Callback: remember when it was three steps?
  {
    steps: 6,
    render: () => <StepsGrow />,
  },

  // The whole loop, concretely
  {
    steps: 4,
    render: () => (
      <Slide kicker="Let's build codemode, step by step">
        <h2>The codemode flow</h2>
        <CodeSteps
          dense
          revealAt={[0, 1, 2, 3, 4]}
          codeAt={[0, 1, 2, 3, 4]}
          items={[
            {
              title: "search()",
              sub: "names only, the catalog never enters the prompt",
              code: `
const names = await tools.search({ query: task });
// ["github.listIssues", "linear.createTicket", "slack.post"]
`,
            },
            {
              title: "describe()",
              sub: "the .d.ts for exactly those tools",
              code: `
const spec = await tools.describe({ names });
`,
            },
            {
              title: "write the script",
              sub: "the LLM sees ~1k tokens of types, not 278k",
              code: `
let code = await llm(\`Write JS using only: \${spec}. Task: \${task}\`);
`,
            },
            {
              title: "check it",
              sub: "it's a string from a language model; type-check before you trust it",
              code: `
const errors = typecheck(code, spec);
if (errors.length) code = await llm(\`Fix: \${errors}\`, code);
`,
            },
            {
              title: "run it in a sandbox",
              sub: "only the picked tools are in scope; only the result comes back",
              code: `
const result = await sandbox.run(code, { tools: pick(tools, names) });
return result;
`,
            },
          ]}
        />
      </Slide>
    ),
  },

  // Wrap it as a tool inside an agent: the context window, message by message
  {
    steps: 6,
    render: () => <AgentToolSlide />,
  },

  // Punchline
  {
    render: () => (
      <Slide className="center" style={{ padding: 40 }}>
        <img className="img plain" src="/img/i-just-wanted-a-function.png" alt="I just wanted it to call a function" style={{ maxHeight: 780 }} />
      </Slide>
    ),
  },

  // Live demo
  {
    render: () => (
      <Slide className="center">
        <h1>Live demo</h1>
      </Slide>
    ),
  },

  // After the demo: production shapes
  {
    render: () => (
      <Slide kicker="Productionizing it">
        <h2>There are many ways to build this</h2>
        <Production />
        <div className="dg-legend" style={{ justifyContent: "center", flexWrap: "wrap", gap: 18 }}>
          <span className="tag blue">static tools</span>
          <span className="tag blue">dynamic tools the agent wrote</span>
          <span className="tag blue">state on disk</span>
          <span className="tag violet">codemode as a subagent · compiler diagnostics · retries</span>
          <span className="tag good">human approval gates</span>
        </div>
      </Slide>
    ),
  },

  // Thanks
  {
    render: () => (
      <Slide className="center">
        <h1>Thanks</h1>
        <p className="lead" style={{ marginTop: 24 }}>Aaron Villalpando &amp; Avery Townsend</p>
        <p className="muted" style={{ marginTop: 32, display: "flex", gap: 48, fontSize: 30 }}>
          <a href="https://boundaryml.com">boundaryml.com</a>
          <a href="https://github.com/boundaryml/baml">github.com/boundaryml/baml</a>
        </p>
      </Slide>
    ),
  },
];
