import type { Signal, Verdict } from "@slopguardian/core";

const COMMENT_MARKER = "<!-- slopguardian-review -->";

const SEVERITY_ICON: Record<string, string> = {
  error: "\u26D4",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
};

const VERDICT_HEADER: Record<Verdict, string> = {
  clean: "\u2705 **slopguardian**",
  suspicious: "\u26A0\uFE0F **slopguardian**",
  "needs-review": "\uD83D\uDD0D **slopguardian**",
  "likely-slop": "\u274C **slopguardian**",
};

export interface CommentData {
  verdict: Verdict;
  score: number;
  signals: Signal[];
  exemptLabels: string[];
}

export function buildReviewComment(data: CommentData): string {
  const { verdict, score, signals, exemptLabels } = data;

  if (verdict === "clean" && signals.length === 0) {
    return `${VERDICT_HEADER.clean} \u00B7 score: **${score}** \u00B7 clean\n\n${COMMENT_MARKER}`;
  }

  const sections: string[] = [];
  sections.push(`## ${VERDICT_HEADER[verdict]} \u00B7 score: ${score} \u00B7 ${verdict}\n`);

  if (signals.length > 0) {
    sections.push(buildSignalTable(signals));
    sections.push(buildFixSection(signals));
    sections.push(buildScoreBreakdown(signals, score));
  }

  if (verdict === "needs-review") {
    sections.push(
      "> This PR needs manual review. It has not been auto-closed.\n",
    );
  }

  if (verdict === "likely-slop") {
    sections.push(
      "> This PR has been closed. If this is a mistake, a maintainer can reopen and add `human-verified`.\n",
    );
  }

  if (exemptLabels.length > 0) {
    const labels = exemptLabels.map((l) => `\`${l}\``).join(" or ");
    sections.push(`> ${labels} label dismisses this review \u00B7 [Docs](https://github.com/aislopguardian/slopguardian-action/wiki)`);
  }

  sections.push(COMMENT_MARKER);
  return sections.join("\n");
}

function buildSignalTable(signals: Signal[]): string {
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  const visible = sorted.slice(0, 10);
  const overflow = sorted.length - visible.length;

  const rows = visible.map((s) => {
    const icon = SEVERITY_ICON[s.severity] ?? "?";
    const location = s.file ? `\`${s.file}${s.line ? `:${s.line}` : ""}\`` : "\u2014";
    return `| ${icon} | ${s.detectorId} | ${location} | ${s.message} | ${s.score} |`;
  });

  const table = [
    "| | Check | Where | Detail | Pts |",
    "|---|---|---|---|---:|",
    ...rows,
  ].join("\n");

  if (overflow <= 0) return `${table}\n`;

  const hiddenRows = sorted.slice(10).map((s) => {
    const icon = SEVERITY_ICON[s.severity] ?? "?";
    const location = s.file ? `\`${s.file}${s.line ? `:${s.line}` : ""}\`` : "\u2014";
    return `| ${icon} | ${s.detectorId} | ${location} | ${s.message} | ${s.score} |`;
  });

  return `${table}\n\n<details>\n<summary>${overflow} more signal${overflow === 1 ? "" : "s"}</summary>\n\n| | Check | Where | Detail | Pts |\n|---|---|---|---|---:|\n${hiddenRows.join("\n")}\n\n</details>\n`;
}

function buildFixSection(signals: Signal[]): string {
  const suggestions = signals
    .filter((s) => s.suggestion)
    .map((s) => `- **${s.detectorId}**: ${s.suggestion}`)
    .filter((line, i, arr) => arr.indexOf(line) === i)
    .slice(0, 8);

  if (suggestions.length === 0) return "";

  return `<details>\n<summary>How to fix (${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"})</summary>\n\n${suggestions.join("\n")}\n\n</details>\n`;
}

function buildScoreBreakdown(signals: Signal[], totalScore: number): string {
  const byCategory = new Map<string, number>();
  for (const s of signals) {
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + s.score);
  }

  const parts = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, score]) => `${cat}: ${score}`)
    .join(" \u00B7 ");

  return `<details>\n<summary>Score breakdown</summary>\n\n${parts} \u00B7 total: **${totalScore}**\n\n</details>\n`;
}

export function isOwnComment(commentBody: string): boolean {
  return commentBody.includes(COMMENT_MARKER);
}

export { COMMENT_MARKER };
