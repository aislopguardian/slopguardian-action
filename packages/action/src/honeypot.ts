import type { Signal } from "@slopguardian/core";

export interface HoneypotConfig {
  terms: string[];
}

export function detectHoneypot(prBody: string, config: HoneypotConfig): Signal[] {
  if (config.terms.length === 0) return [];

  const signals: Signal[] = [];
  const bodyLower = prBody.toLowerCase();

  for (const term of config.terms) {
    if (bodyLower.includes(term.toLowerCase())) {
      signals.push({
        detectorId: "honeypot",
        category: "lexical",
        severity: "error",
        score: 5,
        message: `Honeypot triggered: PR body contains trap word "${term}"`,
        suggestion:
          "This word was hidden in the PR template. Its presence suggests automated copy-paste.",
      });
    }
  }

  return signals;
}

/** Extracts trap words from HTML comments in the PR template */
export function extractHoneypotTermsFromTemplate(templateContent: string): string[] {
  const commentPattern = /<!--.*?-->/gs;
  const terms: string[] = [];

  for (const match of templateContent.matchAll(commentPattern)) {
    const comment = match[0];
    const honeypotMatch = /honeypot:\s*(.+?)(?:\s*-->)/i.exec(comment);
    if (honeypotMatch?.[1]) {
      terms.push(...honeypotMatch[1].split(",").map((t) => t.trim()));
    }
  }

  return terms;
}
