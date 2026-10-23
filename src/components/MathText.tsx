import React, { useMemo } from "react";

declare global {
  interface Window {
    katex?: {
      renderToString: (
        tex: string,
        options?: { displayMode?: boolean; throwOnError?: boolean }
      ) => string;
    };
    renderMathInElement?: (
      elem: HTMLElement,
      options?: {
        delimiters?: { left: string; right: string; display: boolean }[];
        throwOnError?: boolean;
      }
    ) => void;
  }
}

export function triggerKaTeXRenderInElement(container: HTMLElement | null) {
  if (!container || typeof window === "undefined") return;
  if (typeof window.renderMathInElement === "function") {
    try {
      window.renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
      });
    } catch {
      // Ignore transient KaTeX auto-render errors
    }
  }
}

/**
 * Converts LaTeX strings into clean Unicode text for Plotly SVG canvas axis titles & trace names,
 * ensuring raw LaTeX (e.g. \frac{I}{P_y} or $X_1$) never appears unrendered inside the Plotly canvas.
 */
export function formatPlotlyAxisText(raw?: string): string {
  if (!raw) return "";
  let s = raw.trim();

  // Strip surrounding $ or \( \) delimiters
  s = s
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "");

  // Remove \left and \right sizing macros
  s = s.replace(/\\left/g, "").replace(/\\right/g, "");

  // Unwrap \text{...} and \mathrm{...}
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^{}]*)\}/g, "$1");

  // Convert \frac{a}{b} -> (a)/(b) or a/b
  let prev = "";
  while (s !== prev && s.includes("\\frac")) {
    prev = s;
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
      const cleanNum = num.trim();
      const cleanDen = den.trim();
      const nStr = cleanNum.length > 2 ? `(${cleanNum})` : cleanNum;
      const dStr = cleanDen.length > 2 ? `(${cleanDen})` : cleanDen;
      return `${nStr}/${dStr}`;
    });
  }

  // Convert \sqrt{a} -> √(a)
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");

  // Map common Greek letters and math operators to Unicode
  const greekMap: Record<string, string> = {
    "\\Delta": "Δ",
    "\\Gamma": "Γ",
    "\\Lambda": "Λ",
    "\\Omega": "Ω",
    "\\Phi": "Φ",
    "\\Pi": "Π",
    "\\Sigma": "Σ",
    "\\Theta": "Θ",
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\delta": "δ",
    "\\varepsilon": "ε",
    "\\epsilon": "ε",
    "\\zeta": "ζ",
    "\\eta": "η",
    "\\theta": "θ",
    "\\kappa": "κ",
    "\\lambda": "λ",
    "\\mu": "μ",
    "\\nu": "ν",
    "\\xi": "ξ",
    "\\pi": "π",
    "\\rho": "ρ",
    "\\sigma": "σ",
    "\\tau": "τ",
    "\\phi": "φ",
    "\\varphi": "φ",
    "\\chi": "χ",
    "\\psi": "ψ",
    "\\omega": "ω",
    "\\partial": "∂",
    "\\infty": "∞",
    "\\cdot": "·",
    "\\times": "×",
    "\\leq": "≤",
    "\\geq": "≥",
    "\\neq": "≠",
    "\\approx": "≈",
    "\\rightarrow": "→",
    "\\leftarrow": "←",
  };

  for (const [texCmd, unicodeChar] of Object.entries(greekMap)) {
    s = s.split(texCmd).join(unicodeChar);
  }

  // Convert simple subscripts like _0, _1, _2, _x, _y, _i, _t, _{...}
  const subMap: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    a: "ₐ",
    e: "ₑ",
    i: "ᵢ",
    o: "ₒ",
    r: "ᵣ",
    u: "ᵤ",
    v: "ᵥ",
    x: "ₓ",
    n: "ₙ",
    p: "ₚ",
    s: "ₛ",
    t: "ₜ",
  };
  s = s.replace(/_\{([0-9aeioruvxnpst])\}/g, (_, c) => subMap[c] || `_${c}`);
  s = s.replace(/_([0-9aeioruvxnpst])(?![a-zA-Z0-9])/g, (_, c) => subMap[c] || `_${c}`);
  s = s.replace(/_\{([^{}]+)\}/g, "_$1");

  // Clean up remaining braces
  s = s.replace(/\{([^{}]*)\}/g, "$1");

  return s.replace(/\s+/g, " ").trim();
}

/**
 * Detects bare LaTeX commands in strings that lack $...$ delimiters
 * (e.g., "\frac{I}{P_y}" or "Budget Line: y = \frac{I}{P_y} - \frac{P_x}{P_y}x")
 * and wraps the mathematical segments in $...$ so KaTeX renders them properly.
 */
export function normalizeBareLatexInText(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // If the string already has $...$, \(...\), or \[...\] delimiters, keep as-is
  if (
    trimmed.includes("$") ||
    trimmed.includes("\\(") ||
    trimmed.includes("\\[")
  ) {
    return input;
  }

  // Check if the string contains unmistakable LaTeX commands or math notation
  const hasLatexCommand =
    /\\(?:frac|left|right|sqrt|alpha|beta|gamma|delta|Delta|epsilon|varepsilon|eta|theta|Theta|lambda|Lambda|mu|pi|Pi|rho|sigma|Sigma|tau|phi|Phi|psi|omega|Omega|partial|infty|sum|int|prod|cdot|times|leq|geq|neq|approx|overline|hat|bar|tilde|vec|text|mathrm)\b/.test(
      trimmed
    );
  const hasSubOrSupBraces = /[_^]\{[^{}]+\}/.test(trimmed);

  if (!hasLatexCommand && !hasSubOrSupBraces) {
    return input;
  }

  // If there is a colon separating a plain English label from a formula (e.g., "Budget Constraint: y = \frac{I}{P_y}")
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx !== -1 && colonIdx < 40) {
    const prefix = trimmed.slice(0, colonIdx + 1);
    const rest = trimmed.slice(colonIdx + 1).trim();
    const prefixHasLatex = /\\[a-zA-Z]+|[_^]\{/.test(prefix);
    if (!prefixHasLatex && rest.length > 0) {
      return `${prefix} $${rest}$`;
    }
  }

  // If the entire string is a mathematical expression or short label with LaTeX, wrap in $...$
  if (trimmed.length < 160) {
    // If it contains plain words followed by parentheses containing LaTeX, e.g. "Government Spending (\Delta G)"
    const parenReplaced = trimmed.replace(
      /\(([^()]*\\[a-zA-Z]+[^()]*)\)/g,
      "($1)"
    );
    if (
      /^[a-zA-Z\s-]+\([^()]*\\[a-zA-Z]+[^()]*\)$/.test(parenReplaced)
    ) {
      return trimmed.replace(/\(([^()]*\\[a-zA-Z]+[^()]*)\)/g, "($$$1$$)");
    }
    return `$${trimmed}$`;
  }

  return input;
}

export type HighlightColor = "yellow" | "emerald" | "blue" | "rose";

export interface HighlightItem {
  id: string;
  subtopic: string;
  text: string;
  color: HighlightColor;
  sectionLabel: string;
  createdAt: string;
}

export interface PinnedInlineTutorItem {
  id: string;
  subtopic: string;
  selectedText: string;
  question: string;
  answer: string;
  createdAt: string;
  sourceType?: "inline" | "vision";
  croppedImageBase64?: string;
}

export const HIGHLIGHT_COLOR_STYLES: Record<
  HighlightColor,
  { label: string; badgeClass: string; inlineClass: string; swatchClass: string }
> = {
  yellow: {
    label: "Amber Yellow",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    inlineClass:
      "bg-amber-400/25 text-inherit border-b-2 border-amber-400 px-0.5 rounded-xs",
    swatchClass: "bg-amber-400",
  },
  emerald: {
    label: "Emerald Green",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    inlineClass:
      "bg-emerald-400/25 text-inherit border-b-2 border-emerald-400 px-0.5 rounded-xs",
    swatchClass: "bg-emerald-400",
  },
  blue: {
    label: "Soft Blue",
    badgeClass: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    inlineClass:
      "bg-sky-400/25 text-inherit border-b-2 border-sky-400 px-0.5 rounded-xs",
    swatchClass: "bg-sky-400",
  },
  rose: {
    label: "Rose Pink",
    badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    inlineClass:
      "bg-rose-400/25 text-inherit border-b-2 border-rose-400 px-0.5 rounded-xs",
    swatchClass: "bg-rose-400",
  },
};

interface MathBlockProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathBlockProps> = ({
  latex,
  displayMode = true,
  className = "",
}) => {
  const cleanLatex = useMemo(
    () =>
      (latex || "")
        .replace(/^\$\$/, "")
        .replace(/\$\$$/, "")
        .replace(/^\\\[/, "")
        .replace(/\\\]$/, "")
        .replace(/^\\\(/, "")
        .replace(/\\\)$/, "")
        .replace(/^\$/, "")
        .replace(/\$$/, "")
        // Strip internal $ if the AI wrapped only parts of a pure formulaLatex field in $...$
        .replace(/\$/g, "")
        .trim(),
    [latex]
  );

  const html = useMemo(() => {
    if (!cleanLatex) return null;
    if (typeof window !== "undefined" && window.katex) {
      try {
        return window.katex.renderToString(cleanLatex, {
          displayMode,
          throwOnError: false,
        });
      } catch {
        return null;
      }
    }
    return null;
  }, [cleanLatex, displayMode]);

  if (html) {
    return (
      <span
        data-latex={`$${cleanLatex}$`}
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <code
      data-latex={`$${cleanLatex}$`}
      className={`font-mono text-[#10b981] ${className}`}
    >
      {formatPlotlyAxisText(cleanLatex)}
    </code>
  );
};

interface RichMathTextProps {
  text: string;
  className?: string;
  highlights?: HighlightItem[];
}

function applyHighlightsToPlainText(
  plainSegment: string,
  highlights?: HighlightItem[]
): React.ReactNode {
  if (!highlights || highlights.length === 0 || !plainSegment) {
    return plainSegment;
  }

  for (const hl of highlights) {
    const needle = hl.text.trim();
    if (needle.length < 3) continue;
    const idx = plainSegment.toLowerCase().indexOf(needle.toLowerCase());
    if (idx !== -1) {
      const before = plainSegment.slice(0, idx);
      const match = plainSegment.slice(idx, idx + needle.length);
      const after = plainSegment.slice(idx + needle.length);
      const style = HIGHLIGHT_COLOR_STYLES[hl.color] || HIGHLIGHT_COLOR_STYLES.yellow;
      return (
        <>
          {applyHighlightsToPlainText(before, highlights)}
          <mark className={style.inlineClass} title={`Highlighted (${style.label})`}>
            {match}
          </mark>
          {applyHighlightsToPlainText(after, highlights)}
        </>
      );
    }
  }

  return plainSegment;
}

/**
 * Parses inline $...$, \(...\), and block $$...$$, \[...\] LaTeX as well as bare LaTeX formulas,
 * rendering all mathematical notation cleanly via KaTeX and applying multi-color user highlights.
 */
export const RichMathText: React.FC<RichMathTextProps> = ({
  text,
  className = "",
  highlights,
}) => {
  const normalizedText = useMemo(
    () => normalizeBareLatexInText(text || ""),
    [text]
  );

  const segments = useMemo(() => {
    if (!normalizedText) return [];
    const tokenRegex =
      /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\*\*[^*]+?\*\*|\*[^*\n]+?\*)/g;
    const parts = normalizedText.split(tokenRegex);
    return parts.filter((p) => p !== "");
  }, [normalizedText]);

  return (
    <span className={className}>
      {segments.map((part, idx) => {
        if (
          (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) ||
          (part.startsWith("\\[") && part.endsWith("\\]") && part.length > 4)
        ) {
          const tex = part.slice(2, -2);
          return (
            <span key={idx} className="block my-3 overflow-x-auto py-1">
              <MathFormula latex={tex} displayMode={true} />
            </span>
          );
        }
        if (
          (part.startsWith("$") && part.endsWith("$") && part.length > 2) ||
          (part.startsWith("\\(") && part.endsWith("\\)") && part.length > 4)
        ) {
          const tex = part.startsWith("\\(") ? part.slice(2, -2) : part.slice(1, -1);
          return <MathFormula key={idx} latex={tex} displayMode={false} />;
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          const inner = part.slice(2, -2);
          return (
            <strong key={idx} className="font-semibold">
              <RichMathText text={inner} highlights={highlights} />
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          const inner = part.slice(1, -1);
          return (
            <em key={idx} className="italic opacity-90">
              <RichMathText text={inner} highlights={highlights} />
            </em>
          );
        }
        return (
          <React.Fragment key={idx}>
            {applyHighlightsToPlainText(part, highlights)}
          </React.Fragment>
        );
      })}
    </span>
  );
};
