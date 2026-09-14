import type { SlideDef } from "./deck";
import { Frag, useStep } from "./deck";
import { Slide, Code } from "./ui";
import { RoundTripsCompare } from "./diagrams/RoundTrips";
import { ContextBloat } from "./diagrams/ContextBloat";
import { WorkflowBuild } from "./diagrams/WorkflowBuild";
import { TokenBars } from "./diagrams/TokenBars";

const Steps = ({
  items,
  activeFrom = 0,
}: {
  items: { title: React.ReactNode; sub?: React.ReactNode; at?: number; bad?: boolean }[];
  /** step index at which highlighting starts (before that everything is neutral) */
  activeFrom?: number;
}) => {
  const step = useStep();
  return (
    <ol className="steps" style={{ listStyle: "none", padding: 0 }}>
      {items.map((it, i) => {
        const at = it.at ?? 0;
        const hidden = step < at;
        const on = step >= activeFrom && step >= at;
        return (
          <li
            key={i}
            className={`step ${on ? "on" : ""} ${hidden ? "dim" : ""}`}
            style={hidden ? { opacity: 0.18 } : undefined}
          >
            <div>
              <span className={it.bad ? "bad" : ""}>{it.title}</span>
              {it.sub ? <span className="sub">{it.sub}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const CodemodeSlide = () => {
  const step = useStep();
  return (
    <Slide kicker="Codemode">
      <h2>Let the agent write a script and skip the intermediate steps</h2>
      {step === 0 ? (
        <RoundTripsCompare key="code" which="code" />
      ) : (
        <RoundTripsCompare key="both" which="both" />
      )}
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
        <div className="code-title">prompt (string) · ~278,800 tokens</div>
        <div className="ap-body">
          {PROMPT_SECTIONS.map((sec, i) => {
            const on = step >= (sec.at ?? 0);
            return (
              <div key={i} className={`ap-sec ${on ? "on" : ""}`} data-tone={sec.tone}>
                <pre className="ap-pre">{sec.lines.join("\n")}</pre>
                {sec.note ? <div className="ap-note"><span className={`tag ${sec.tone}`}>{sec.note}</span></div> : null}
              </div>
            );
          })}
        </div>
      </div>
      <Frag at={4} className="ap-foot">
        <p><strong>Three integrations in, and we're already at 1,300+ function signatures.</strong> The agent reads all of it on every turn, before it writes a single line.</p>
      </Frag>
    </div>
  );
};

/** Numbered steps where each title sits directly above its own code. */
const CodeSteps = ({
  items,
}: {
  items: { title: React.ReactNode; sub?: React.ReactNode; code: string }[];
}) => {
  const step = useStep();
  return (
    <div className="cs">
      {items.map((it, i) => {
        const state = i === step ? "on" : i < step ? "done" : "off";
        return (
          <div key={i} className="cs-item" data-state={state}>
            <div className="cs-head">
              <span className="cs-num">{i + 1}</span>
              <span className="cs-title">{it.title}</span>
              {it.sub ? <span className="cs-sub">{it.sub}</span> : null}
            </div>
            <Code small>{it.code}</Code>
          </div>
        );
      })}
    </div>
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
    steps: 2,
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
              <p>
                That's <strong>three or four LLM turns</strong>. Every intermediate
                result lands in the context window whether you need it or not.
              </p>
            </Frag>
            <Frag at={2}>
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

  // 4 ── Expensive
  {
    steps: 1,
    render: () => (
      <Slide className="center">
        <h2>This gets expensive.</h2>
        <Frag at={1}>
          <p className="lead" style={{ maxWidth: 1100 }}>
            Imagine you had to report <em>every keystroke</em> you wanted to make to
            your manager, and wait for approval before the next one.
          </p>
        </Frag>
      </Slide>
    ),
  },

  // 5 ── Codemode definition: alone first, then side by side
  {
    steps: 1,
    render: () => <CodemodeSlide />,
  },

  // 6 ── Why
  {
    steps: 3,
    render: () => (
      <Slide kicker="Why does codemode exist?">
        <h2>At the end of the day we care about two things: latency and cost.</h2>
        <div className="row" style={{ marginTop: 12 }}>
          <Frag at={1} className="card good">
            <span className="tag good">round trips</span>
            <h3>One LLM turn instead of N</h3>
            <p>No waiting on the model between tool calls. The sandbox runs at machine speed.</p>
          </Frag>
          <Frag at={2} className="card good">
            <span className="tag good">context</span>
            <h3>Results never enter the context</h3>
            <p>Filter, fan out, aggregate a 50k-row payload in code. The model sees only the summary.</p>
          </Frag>
          <Frag at={3} className="card accent">
            <span className="tag violet">bonus</span>
            <h3>Loops, retries, branches for free</h3>
            <p>It's just code. <code>for</code>, <code>try/catch</code>, <code>Promise.all</code> are better than another prompt.</p>
          </Frag>
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

  // Let's build it: the naive flow
  {
    steps: 3,
    render: () => (
      <Slide kicker="Let's build codemode, step by step">
        <h2>The flow</h2>
        <Steps
          items={[
            { title: "Make an LLM generate code" },
            { title: "Run it", at: 1 },
            { title: "Save $$$$", at: 2 },
          ]}
        />
        <Frag at={3}>
          <p className="lead">Simple, right?</p>
        </Frag>
      </Slide>
    ),
  },

  // 10 ── Actually: steps inline with the code they correspond to
  {
    steps: 2,
    render: () => (
      <Slide kicker="Let's build codemode, step by step">
        <h2>Actually…</h2>
        <CodeSteps
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
      </Slide>
    ),
  },

  // The prompt, rendered
  {
    steps: 4,
    render: () => (
      <Slide kicker="Let's build codemode, step by step">
        <h2>What the LLM actually sees</h2>
        <AnnotatedPrompt />
      </Slide>
    ),
  },

  // 11 ── Problem: the front of the prompt is still huge
  {
    steps: 3,
    render: () => (
      <Slide kicker="Problem">
        <h2>We saved the round trips. We did not save the prompt.</h2>
        <TokenBars />
        <div className="row" style={{ marginTop: 6 }}>
          <Frag at={1}>
            <div className="card good">
              <p>The intermediate results are gone. The script does that work now.</p>
            </div>
          </Frag>
          <Frag at={2}>
            <div className="card bad">
              <p>But every API definition is still inlined at the top, on <strong>every</strong> turn. That's most of the bill.</p>
            </div>
          </Frag>
          <Frag at={3}>
            <div className="card accent">
              <p>Fix the front of the prompt too, and codemode gets cheap.</p>
            </div>
          </Frag>
        </div>
      </Slide>
    ),
  },

  // 12 ── Search + describe (animated)
  {
    render: () => (
      <Slide kicker="Making the LLM generate code, efficiently">
        <h2>Don't dump the docs. Give the agent <em>search()</em> and <em>describe()</em>.</h2>
        <ContextBloat />
      </Slide>
    ),
  },

  // 13 ── The 3 tools
  {
    steps: 3,
    render: () => (
      <Slide kicker="Codemode has three tools">
        <div className="row grow">
          <div className="col" style={{ flex: "0 0 620px" }}>
            <Steps
              items={[
                { title: <><code>search(query)</code></>, sub: "finds tool names (and saved snippets)" },
                { title: <><code>describe(name)</code></>, sub: "returns the TypeScript types + docs for just that tool", at: 1 },
                { title: <><code>execute(code)</code></>, sub: "runs the script in a sandbox with those tools in scope", at: 2 },
              ]}
            />
            <Frag at={3}>
              <p className="small muted">This is how Cloudflare Code Mode and executor.sh do it.</p>
            </Frag>
          </div>
          <div className="col">
            <Code title="what the agent writes" small>{`
const { items } = await tools.search({ query: "create github issue" });
const path = items[0]?.path;                 // "github.createIssue"

const spec = await tools.describe({ path }); // .d.ts for one function

const result = await tools[path]({
  repo: "boundaryml/baml",
  title: "codemode is neat",
});
`}</Code>
          </div>
        </div>
      </Slide>
    ),
  },

  // 14 ── Step 1: still not codemode
  {
    steps: 2,
    render: () => (
      <Slide kicker="How to build amazing codemode · step 1">
        <h2>Maybe we just replace MCP with a search tool?</h2>
        <div className="row grow">
          <div className="col">
            <p>
              The AI searches for a tool, gets its schema, and emits an output that
              matches it.
            </p>
            <Frag at={1}>
              <p>
                <strong>Awesome, we saved a bunch of tokens.</strong> But this is
                still not codemode.
              </p>
            </Frag>
            <Frag at={2}>
              <div className="card bad">
                <span className="tag bad">what's wrong</span>
                <p>
                  Every call is still a round trip. Every result still lands in the
                  context. We fixed the catalog, not the loop.
                </p>
              </div>
            </Frag>
          </div>
          <div className="col">
            <RoundTripsCompare which="tools" />
          </div>
        </div>
      </Slide>
    ),
  },

  // 15 ── Step 2: actually codemode
  {
    render: () => (
      <Slide kicker="How to build amazing codemode · step 2">
        <h2>Actually make codemode happen</h2>
        <div className="row grow">
          <div className="col" style={{ flex: "0 0 600px" }}>
            <Steps
              items={[
                { title: "Search for the tools you need" },
                { title: "Describe them (types, not prose)" },
                { title: "Write one script that calls all of them" },
                { title: "Check it (types, lint) before running" },
                { title: "Run it in a sandbox. Return only the answer." },
              ]}
              activeFrom={99}
            />
          </div>
          <div className="col">
            <RoundTripsCompare which="code" />
          </div>
        </div>
      </Slide>
    ),
  },

  // 16 ── But wait, there's more
  {
    steps: 3,
    render: () => (
      <Slide kicker="But wait, there's more">
        <h2>Once your agent writes code, everything is on the table</h2>
        <div className="row" style={{ marginTop: 12 }}>
          <Frag at={1} className="card">
            <span className="tag blue">state</span>
            <h3>Persistent sessions</h3>
            <p>Keep the sandbox alive between turns. Variables are memory. ARC-AGI style: build up helpers over time.</p>
          </Frag>
          <Frag at={2} className="card">
            <span className="tag violet">recursion</span>
            <h3>Recursive self-improvement</h3>
            <p>What if you gave an agent <em>only one</em> tool: <code>execute</code>? It can write its own tools, then use them.</p>
          </Frag>
          <Frag at={3} className="card">
            <span className="tag good">safety</span>
            <h3>Approvals in code</h3>
            <p>Wrap <code>email.send()</code> in an approval gate. Pop a dialog when the script hits it. Like Instinct.</p>
          </Frag>
        </div>
      </Slide>
    ),
  },

  // 17 ── Approval snippet
  {
    render: () => (
      <Slide kicker="Approvals in code">
        <div className="row grow">
          <div className="col" style={{ flex: "0 0 520px" }}>
            <h2>The gate is just a wrapper</h2>
            <p>
              The agent's script never knows. It calls <code>email.send</code>; the
              sandbox pauses and asks you.
            </p>
          </div>
          <div className="col">
            <Code title="sandbox/tools.py">{`
def approval(fn):
    def wrapped(*args, **kwargs):
        ok = ask_human(f"Allow {fn.__name__}{args}?")
        if not ok:
            raise PermissionError("denied by user")
        return fn(*args, **kwargs)
    return wrapped

email.send = approval(email.send)
stripe.refund = approval(stripe.refund)
`}</Code>
          </div>
        </div>
      </Slide>
    ),
  },

  // 18 ── Problem: where to run
  {
    steps: 1,
    render: () => (
      <Slide kicker="Problems">
        <h2>Where should I run this code?</h2>
        <p>
          If you give an agent a file system and <code>eval</code>, it can literally
          execute anything.
        </p>
        <Frag at={1} className="grow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
          <img className="img plain" src="/img/sandboxes-light.png" alt="Every company shipping a sandbox" style={{ maxHeight: 520 }} />
        </Frag>
        <p className="small muted">It's easy. Just choose a sandbox provider.</p>
      </Slide>
    ),
  },

  // 19 ── Problem: observability
  {
    steps: 2,
    render: () => (
      <Slide kicker="Problems">
        <h2>How do I observe what these agents are writing?</h2>
        <div className="row grow">
          <div className="col">
            <Frag at={1}>
              <ul>
                <li>What do these programs usually look like?</li>
                <li>Which functions do they call, and how often?</li>
                <li>Which ones fail, and where?</li>
                <li>Can I replay a run? Diff two runs?</li>
              </ul>
            </Frag>
            <Frag at={2}>
              <div className="card accent" style={{ marginTop: 20 }}>
                <p>
                  Treat generated code as a <strong>trace</strong>, not a black box.
                  The script <em>is</em> the plan; log every tool call with its args.
                </p>
              </div>
            </Frag>
          </div>
          <div className="col">
            <WorkflowBuild />
            <p className="small muted" style={{ marginTop: -8 }}>Demo idea: watch the BAML graph grow as the code streams in.</p>
          </div>
        </div>
      </Slide>
    ),
  },

  // 20 ── Claude programmatic tool calling
  {
    steps: 3,
    render: () => (
      <Slide kicker="Observations · Claude programmatic tool calling">
        <h2>Anthropic calls it "programmatic tool calling", not codemode</h2>
        <div className="row grow">
          <div className="col">
            <Frag at={1} mode="dim">
              <p><strong>Claude owns the loop.</strong> Your server is a dumb machine that just runs tools.</p>
            </Frag>
            <Frag at={2} mode="dim">
              <p><strong>Your server owns auth.</strong> No env vars, no secrets in the sandbox. You just pass schemas.</p>
            </Frag>
            <Frag at={3} mode="dim">
              <p><strong>Control is inverted.</strong> Claude could be writing bash, Python, or Rust for all you care. You're just another part of the workflow.</p>
            </Frag>
          </div>
          <div className="col">
            <img className="img" src="/img/ptc-how.png" alt="How programmatic tool calling works" />
          </div>
        </div>
      </Slide>
    ),
  },

  // 21 ── PTC details
  {
    render: () => (
      <Slide kicker="Observations · Claude programmatic tool calling">
        <div className="row grow">
          <div className="col">
            <h3>Claude responds with <code>tool_use</code>, tagged with a caller</h3>
            <Code small>{`
{
  "type": "tool_use",
  "id": "toolu_abc123",
  "name": "query_database",
  "input": { "sql": "<sql>" },
  "caller": {
    "type": "code_execution_20260120",
    "tool_id": "srvtoolu_xyz789"
  }
}
`}</Code>
            <p className="small">
              Your result goes back to the <em>running code</em>, not the context. Remember
              to pass the <code>container</code> id back or the API rejects the continuation.
            </p>
          </div>
          <div className="col">
            <h3>Interesting limits</h3>
            <img className="img" src="/img/ptc-limits.png" alt="Constraints and limitations" />
            <div className="card good">
              <p>
                "Adding programmatic tool calling on top of basic search tools improved
                performance by an average of <strong>11%</strong> while using{" "}
                <strong>24% fewer input tokens</strong>."
              </p>
            </div>
          </div>
        </div>
      </Slide>
    ),
  },

  // 22 ── Embrace bash and code
  {
    render: () => (
      <Slide className="center">
        <div className="kicker">Mario Zechner · creator of pi</div>
        <h2 style={{ maxWidth: 1200 }}>"What if you don't need MCP?"</h2>
        <p className="lead">Embrace bash and code.</p>
        <p className="muted">The agent already knows how to write programs. Let it.</p>
      </Slide>
    ),
  },

  // 23 ── Recap
  {
    steps: 4,
    render: () => (
      <Slide kicker="Recap">
        <h2>Codemode in one slide</h2>
        <Steps
          items={[
            { title: "Tool calling bounces every result through the LLM", sub: "slow, expensive, context bloat", at: 0 },
            { title: "Codemode: the LLM writes one script, a sandbox runs it", sub: "one turn, results stay out of context", at: 1 },
            { title: "search() + describe() keep the prompt small", sub: "don't ship 1,640 tool schemas", at: 2 },
            { title: "Sandbox it. Gate the dangerous calls. Log everything.", sub: "the script is your trace", at: 3 },
          ]}
        />
        <Frag at={4}>
          <p className="lead" style={{ marginTop: 8 }}>Your agent works like magic, and you can still sleep at night.</p>
        </Frag>
      </Slide>
    ),
  },

  // 24 ── Links / thanks
  {
    render: () => (
      <Slide className="center">
        <h2>Thanks</h2>
        <p className="lead">Avery Townsend &amp; Aaron Villalpando · Boundary</p>
        <div className="row" style={{ marginTop: 24, textAlign: "left", width: "100%", maxWidth: 1300 }}>
          <ul className="small">
            <li><a href="https://blog.cloudflare.com/code-mode/">blog.cloudflare.com/code-mode</a></li>
            <li><a href="https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling">Claude · programmatic tool calling</a></li>
            <li><a href="https://pydantic.dev/articles/pydantic-monty">pydantic.dev · monty</a></li>
            <li><a href="https://executor.sh/">executor.sh</a></li>
          </ul>
          <ul className="small">
            <li><a href="https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/">What if you don't need MCP?</a></li>
            <li><a href="https://bun.com/blog/bun-in-rust">Bun in Rust</a></li>
            <li><a href="https://github.com/portofcontext/pctx/blob/main/docs/code-mode.md">pctx · code-mode</a></li>
            <li><a href="https://boundaryml.com">boundaryml.com · BAML</a></li>
          </ul>
        </div>
      </Slide>
    ),
  },
];
