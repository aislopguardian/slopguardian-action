import type { Signal, Verdict } from "@slopguardian/core";

const COMMENT_MARKER = "<!-- slopguardian-review -->";

const SEVERITY_ICON: Record<string, string> = {
  error: "\u26D4",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
};

const VERDICT_EMOJI: Record<Verdict, string> = {
  clean: "\u2705",
  suspicious: "\u26A0\uFE0F",
  "likely-slop": "\u274C",
};

export interface CommentData {
  verdict: Verdict;
  score: number;
  signals: Signal[];
  exemptLabels: string[];
}

export function buildReviewComment(data: CommentData): string {
  const { verdict, score, signals, exemptLabels } = data;
  const sections: string[] = [];

  sections.push(
    `## \uD83D\uDEE1\uFE0F SlopGuardian \u2014 **${score}** \u00B7 ${VERDICT_EMOJI[verdict]} ${verdict}\n`,
  );

  if (signals.length > 0) {
    sections.push(buildSignalSection(signals));
    sections.push(buildFixSection(signals));
    sections.push(buildScoreBreakdown(signals, score));
  }

  if (exemptLabels.length > 0) {
    sections.push(
      `> Add the ${exemptLabels.map((l) => `\`${l}\``).join(" or ")} label to dismiss this review.`,
    );
  }

  sections.push(COMMENT_MARKER);
  return sections.join("\n");
}

function buildSignalSection(signals: Signal[]): string {
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  const rows = sorted.map((s) => {
    const icon = SEVERITY_ICON[s.severity] ?? "?";
    const location = s.file ? `\`${s.file}${s.line ? `:${s.line}` : ""}\`` : "\u2014";
    return `| ${icon} | ${s.detectorId} | ${location} | ${s.message} | ${s.score} |`;
  });

  const table = [
    "| | Signal | Location | Detail | Score |",
    "|---|---|---|---|---:|",
    ...rows,
  ].join("\n");

  return `<details open>\n<summary>${signals.length} signal${signals.length === 1 ? "" : "s"} found</summary>\n\n${table}\n\n</details>\n`;
}

function buildFixSection(signals: Signal[]): string {
  const suggestions = signals
    .filter((s) => s.suggestion)
    .map((s) => `- **${s.detectorId}**: ${s.suggestion}`)
    .filter((line, i, arr) => arr.indexOf(line) === i)
    .slice(0, 8);

  if (suggestions.length === 0) return "";

  return `<details>\n<summary>How to fix</summary>\n\n${suggestions.join("\n")}\n\n</details>\n`;
}

function buildScoreBreakdown(signals: Signal[], totalScore: number): string {
  const grouped = new Map<string, number>();
  for (const s of signals) {
    grouped.set(s.detectorId, (grouped.get(s.detectorId) ?? 0) + s.score);
  }

  const parts = Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => `${id}(${score})`)
    .join(" + ");

  return `> Score breakdown: ${parts} = ${totalScore}\n`;
}

export function isOwnComment(commentBody: string): boolean {
  return commentBody.includes(COMMENT_MARKER);
}

export { COMMENT_MARKER };
