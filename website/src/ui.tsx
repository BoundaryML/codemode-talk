import type { ReactNode } from "react";

export const Slide = ({
  children,
  className,
  kicker,
  style,
}: {
  children: ReactNode;
  className?: string;
  kicker?: string;
  style?: React.CSSProperties;
}) => (
  <section className={`slide ${className ?? ""}`} style={style}>
    {kicker ? <div className="kicker">{kicker}</div> : null}
    {children}
    <div className="footer">
      <span>Codemode · Boundary</span>
    </div>
  </section>
);

// ── Tiny syntax highlighter ──────────────────────────────────────────
const KW =
  /\b(const|let|var|function|return|await|async|import|from|export|for|while|if|else|new|class|throw|try|catch|typeof|in|of|null|true|false|def|with|as|match|spawn|enum|test|client|prompt|type|interface|implements|yield|lambda|is|not|and|or|print|self)\b/;
const RULES: [RegExp, string][] = [
  [/(\/\/.*|#(?!").*)/, "tk-cm"],
  [/(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/, "tk-str"],
  [KW, "tk-kw"],
  [/\b(\d+(?:\.\d+)?)\b/, "tk-num"],
  [/\b([A-Z][A-Za-z0-9_]*)\b/, "tk-ty"],
  [/\b([a-z_][A-Za-z0-9_]*)(?=\()/, "tk-fn"],
];
const tokenize = (line: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let rest = line;
  let k = 0;
  while (rest.length) {
    let best: { i: number; len: number; cls: string } | null = null;
    for (const [re, cls] of RULES) {
      const m = re.exec(rest);
      if (m && (best === null || m.index < best.i)) {
        best = { i: m.index, len: m[0].length, cls };
      }
    }
    if (!best) {
      out.push(rest);
      break;
    }
    if (best.i > 0) out.push(rest.slice(0, best.i));
    out.push(
      <span key={k++} className={best.cls}>
        {rest.slice(best.i, best.i + best.len)}
      </span>,
    );
    rest = rest.slice(best.i + best.len);
  }
  return out;
};

export const Code = ({
  children,
  title,
  small,
  highlight = [],
  dim = [],
}: {
  children: string;
  title?: string;
  small?: boolean;
  /** 1-indexed lines to highlight. */
  highlight?: number[];
  /** 1-indexed lines to dim. */
  dim?: number[];
}) => {
  const lines = children.replace(/^\n/, "").replace(/\n\s*$/, "").split("\n");
  return (
    <div className="code-wrap">
      {title ? <div className="code-title">{title}</div> : null}
      <pre className={`code ${small ? "sm" : ""}`}>
        {lines.map((l, i) => (
          <span
            key={i}
            className={
              highlight.includes(i + 1) ? "hl" : dim.includes(i + 1) ? "tk-dim" : ""
            }
          >
            {tokenize(l)}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
};
