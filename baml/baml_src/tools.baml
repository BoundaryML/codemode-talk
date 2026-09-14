// The tool catalog. In a real system this is generated from your OpenAPI /
// MCP servers. Here it's a handful of fake integrations so the demo runs offline.

class ToolSpec {
    name: string,
    description: string,
    /// TypeScript signature the agent sees when it calls describe().
    signature: string,
    /// Set for tools that must be approved by a human before they run.
    needs_approval: bool,
}

function catalog() -> ToolSpec[] {
    [
        ToolSpec {
            name: "github.listIssues",
            description: "List open issues in a repo, optionally filtered by label",
            signature: "listIssues(args: { repo: string, label?: string }): Promise<{ number: number, title: string, labels: string[], assignee?: string }[]>",
            needs_approval: false,
        },
        ToolSpec {
            name: "github.createIssue",
            description: "Create a GitHub issue",
            signature: "createIssue(args: { repo: string, title: string, body?: string, labels?: string[] }): Promise<{ number: number, url: string }>",
            needs_approval: false,
        },
        ToolSpec {
            name: "github.addLabels",
            description: "Add labels to an existing issue",
            signature: "addLabels(args: { repo: string, number: number, labels: string[] }): Promise<void>",
            needs_approval: false,
        },
        ToolSpec {
            name: "linear.createTicket",
            description: "Create a Linear ticket in a team",
            signature: "createTicket(args: { team: string, title: string, description?: string, priority?: 1|2|3|4 }): Promise<{ id: string, url: string }>",
            needs_approval: false,
        },
        ToolSpec {
            name: "slack.post",
            description: "Post a message to a Slack channel",
            signature: "post(args: { channel: string, text: string }): Promise<{ ts: string }>",
            needs_approval: false,
        },
        ToolSpec {
            name: "email.send",
            description: "Send an email (requires human approval)",
            signature: "send(args: { to: string, subject: string, body: string }): Promise<{ id: string }>",
            needs_approval: true,
        },
        ToolSpec {
            name: "stripe.listInvoices",
            description: "List invoices for a customer",
            signature: "listInvoices(args: { customer: string, status?: 'open'|'paid'|'void' }): Promise<{ id: string, amount: number, status: string, due: string }[]>",
            needs_approval: false,
        },
        ToolSpec {
            name: "stripe.refund",
            description: "Refund a charge (requires human approval)",
            signature: "refund(args: { charge: string, amount?: number }): Promise<{ id: string }>",
            needs_approval: true,
        },
    ]
}

/// search(): cheap keyword match over names + descriptions. Returns only names,
/// so the agent's context stays tiny. Swap for embeddings when the catalog is big.
function search_tools(query: string) -> string[] {
    let terms = query.to_lower_case().split(" ").filter((t) -> {
        t.length() > 2
    });
    catalog()
        .filter((t) -> {
            let hay = `${t.name} ${t.description}`.to_lower_case();
            terms.some((term) -> {
                hay.includes(term)
            })
        })
        .map((t) -> {
            t.name
        })
}

/// describe(): the full TypeScript signature for exactly the tools asked for.
function describe_tools(names: string[]) -> string {
    catalog()
        .filter((t) -> {
            names.includes(t.name)
        })
        .map((t) -> {
            let gate = if (t.needs_approval) {
                " // ⚠ pauses for human approval"
            } else {
                ""
            };
            `// ${t.description}${gate}\n${t.name.replace(".", ".")} :: ${t.signature}`
        })
        .join("\n\n")
}

test "search finds tools by keyword" {
    let hits = search_tools("create a github issue");
    assert.is_true(hits.includes("github.createIssue"));
    assert.is_true(!hits.includes("stripe.refund"));
    let spec = describe_tools(["email.send"]);
    assert.contains(spec, "human approval");
    assert.contains(spec, "email.send ::")
}
