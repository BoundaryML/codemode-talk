// Codemode in ~60 lines: search → describe → write a script → run it in a sandbox.

client Coder = anthropic.Client.new(
  model = "claude-sonnet-5",
  api_key = env.ANTHROPIC_API_KEY,
  max_tokens = 4096,
);

class Script {
    /// One or two sentences: which tools you chose and why.
    plan: string,
    /// The JavaScript (ESM) body. `tools` is already in scope. Must end with `return <result>`.
    code: string,
}

/// Step 1 of the agent loop: turn the user's task into search queries.
function PlanSearch(task: string) -> string[] {
    client: Coder
    prompt: `
        You are picking tool-search queries for a codemode agent.
        Given the task, output 1-3 short keyword queries (2-4 words each) that would find the APIs needed.

        Task: ${task}

        ${ctx.output_format()}
    `
}

/// Step 3: write the script. Only the described tools are in scope.
function WriteScript(task: string, spec: string) -> Script {
    client: Coder
    prompt: `
        You write a single JavaScript async function body that completes the task using ONLY the tools below.
        Rules:
        - \`tools\` is in scope. Call tools like \`await tools.github.createIssue({ ... })\`.
        - Do intermediate filtering/aggregation in code; do not print raw payloads.
        - Prefer Promise.all for independent calls.
        - End with \`return\` of a small JSON-serializable summary.
        - Never define tools that are not listed.

        Available tools:
        ${spec}

        Task: ${task}

        ${ctx.output_format()}
    `
}

/// Step 4: the "sandbox". Writes the script next to the fake tool runtime and
/// runs it in a child node process. Approval-gated tools check the --approve-all flag.
function run_script(code: string, approve_all: bool = false) -> string {
    let dir = "sandbox/.run";
    if (!baml.fs.exists(dir)) {
        baml.fs.mkdir(dir, baml.fs.MkdirOptions { recursive: true });
    }
    // one file per distinct script, so concurrent runs (and tests) don't collide
    let h = baml.crypto.Sha256.new();
    h.update(`${code}${approve_all}`.to_utf8());
    let path = `${dir}/script-${h.finish().to_hex().slice(0, 12)}.mjs`;
    let program = `
        import { tools, trace } from "../runtime.mjs";
        const main = async () => {
        ${code}
        };
        const result = await main();
        console.log(JSON.stringify({ result, trace }, null, 2));
    `;
    baml.fs.write(path, program);
    let out = baml.sys.exec(
        "node",
        [
            path,
            if (approve_all) {
                "--approve-all"
            } else {
                "--no-approve"
            },
        ],
        baml.sys.ProcessOptions {
            cwd: null,
            env: null,
            timeout_ms: 20000,
            stdin: null,
            stderr: baml.sys.StderrMode.Pipe,
        },
    );
    if (!out.ok()) {
        throw baml.errors.Io { message: `script failed (exit ${out.exit_code}):\n${out.stderr.to_string()}` };
    }
    out.stdout.to_string()
}

/// The whole loop. `baml run main -- --task "..."`
function main(
    task: string = "Find open bugs in boundaryml/baml labeled p0, make a Linear ticket for each, and post a one-line summary to #eng",
    approve_all: bool = false,
) -> string {
    log.info(`task: ${task}`);

    // 1. search — the agent never sees the whole catalog
    let queries = PlanSearch(task);
    let names = queries.flat_map((q) -> {
        search_tools(q)
    });
    log.info(`search(${queries}) -> ${names}`);

    // 2. describe — only the signatures it needs
    let spec = describe_tools(names);

    // 3. write one script
    let script = WriteScript(task, spec);
    log.info(`plan: ${script.plan}`);
    log.info(`code:\n${script.code}`);

    // 4. run it. Intermediate tool results never come back here.
    let output = run_script(script.code, approve_all = approve_all);
    log.info(output);
    output
}

test "run a hand-written script in the sandbox (no model)" {
    let s = Script {
        plan: "list p0 bugs",
        code: "const issues = await tools.github.listIssues({ repo: 'boundaryml/baml', label: 'p0' }); return { count: issues.length };",
    };
    let out = run_script(s.code);
    assert.contains(out, "\"count\": 2");
    assert.contains(out, "github.listIssues")
}

test "approval gate blocks email.send unless approved" {
    let code = "await tools.email.send({ to: 'a@b.c', subject: 'hi', body: 'x' }); return 'sent';";
    let denied = run_script(code) catch (e) {
        baml.errors.Io => `denied: ${e.message}`
    };
    assert.contains(denied, "requires human approval");
    let ok = run_script(code, approve_all = true);
    assert.contains(ok, "granted")
}
