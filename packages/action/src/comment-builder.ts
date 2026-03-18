import type { Signal, Verdict } from "@slopguardian/core";

const COMMENT_MARKER = "<!-- slopguardian-review -->";

const VERDICT_LABELS: Record<Verdict, string> = {
  clean: "✅ Clean",
  suspicious: "⚠️ Suspicious",
  "likely-slop": "❌ Likely Slop",
};

export interface CommentData {
  verdict: Verdict;
  score: number;
  signals: Signal[];
  exemptLabels: string[];
}

export function buildReviewComment(commentData: CommentData): string {
  const { verdict, score, signals, exemptLabels } = commentData;
  const sections: string[] = [COMMENT_MARKER];

  sections.push("## SlopGuardian Review\n");
  sections.push(`**${VERDICT_LABELS[verdict]}** — Score: **${score}**\n`);

  if (signals.length > 0) {
    sections.push(buildSignalTable(signals));
    sections.push("");
    sections.push(buildSuggestions(signals));
  } else {
    sections.push("No AI slop patterns detected.\n");
  }

  if (exemptLabels.length > 0) {
    sections.push(
      `\n---\n*Add the ${exemptLabels.map((l) => `\`${l}\``).join(" or ")} label to bypass this check.*`,
    );
  }

  return sections.join("\n");
}

function buildSignalTable(signals: Signal[]): string {
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  const header = "| | Detector | Location | Finding | Score |";
  const separator = "|---|---|---|---|---|";

  const rows = sorted.map((s) => {
    const icon = s.severity === "error" ? "❌" : s.severity === "warning" ? "⚠️" : "ℹ️";
    const location = s.file ? `\`${s.file}${s.line ? `:${s.line}` : ""}\`` : "—";
    return `| ${icon} | ${s.detectorId} | ${location} | ${s.message} | ${s.score} |`;
  });

  return [header, separator, ...rows].join("\n");
}

function buildSuggestions(signals: Signal[]): string {
  const uniqueSuggestions = signals
    .filter((s) => s.suggestion)
    .map((s) => s.suggestion as string)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 5);

  if (uniqueSuggestions.length === 0) return "";

  return ["### What you can do\n", ...uniqueSuggestions.map((s) => `- ${s}`)].join("\n");
}

export function isOwnComment(commentBody: string): boolean {
  return commentBody.includes(COMMENT_MARKER);
}

export { COMMENT_MARKER };
