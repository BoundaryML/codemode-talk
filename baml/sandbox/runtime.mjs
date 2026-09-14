// Fake tool implementations + an approval gate. This is the "your server owns
// auth" half of codemode: the script only ever sees these functions.

export const trace = [];

const record = (name) => async (fn, args) => {
  trace.push({ tool: name, args });
  return fn(args);
};

const approval = (name, fn) => async (args) => {
  trace.push({ tool: name, args, approval: "requested" });
  if (!process.argv.includes("--approve-all")) {
    trace[trace.length - 1].approval = "denied";
    throw new Error(`${name} requires human approval (re-run with --approve-all)`);
  }
  trace[trace.length - 1].approval = "granted";
  return fn(args);
};

const ISSUES = [
  { number: 812, title: "Parser panics on empty enum", labels: ["bug", "p0"], assignee: "avery" },
  { number: 815, title: "Streaming drops last token", labels: ["bug", "p0"] },
  { number: 820, title: "Typo in README", labels: ["docs"] },
  { number: 823, title: "Slow codegen on large schemas", labels: ["bug", "p1"] },
];

let nextId = 1000;
const call = (name, fn) => (args) => record(name)(fn, args);

export const tools = {
  github: {
    listIssues: call("github.listIssues", async ({ repo, label }) =>
      ISSUES.filter((i) => !label || i.labels.includes(label)).map((i) => ({ ...i, repo }))),
    createIssue: call("github.createIssue", async ({ repo, title }) =>
      ({ number: ++nextId, url: `https://github.com/${repo}/issues/${nextId}`, title })),
    addLabels: call("github.addLabels", async () => undefined),
  },
  linear: {
    createTicket: call("linear.createTicket", async ({ team, title }) =>
      ({ id: `${team}-${++nextId}`, url: `https://linear.app/${team}/${nextId}`, title })),
  },
  slack: {
    post: call("slack.post", async () => ({ ts: String(Date.now() / 1000) })),
  },
  email: {
    send: approval("email.send", async () => ({ id: `msg_${++nextId}` })),
  },
  stripe: {
    listInvoices: call("stripe.listInvoices", async ({ customer }) => [
      { id: "in_1", customer, amount: 4200, status: "open", due: "2026-09-30" },
      { id: "in_2", customer, amount: 900, status: "paid", due: "2026-08-30" },
    ]),
    refund: approval("stripe.refund", async ({ charge }) => ({ id: `re_${charge}` })),
  },
};
