import { describe, expect, it } from "vitest";
import { detectHoneypot, extractHoneypotTermsFromTemplate } from "../src/honeypot.js";

describe("detectHoneypot", () => {
  it("flags PR body containing trap word", () => {
    const signals = detectHoneypot("This PR adds SLOPGUARDIAN support for new features.", {
      terms: ["SLOPGUARDIAN"],
    });

    expect(signals.length).toBe(1);
    expect(signals[0]?.score).toBe(5);
    expect(signals[0]?.detectorId).toBe("honeypot");
  });

  it("matches case-insensitively", () => {
    const signals = detectHoneypot("Added slopguardian integration.", {
      terms: ["SLOPGUARDIAN"],
    });

    expect(signals.length).toBe(1);
  });

  it("returns empty for clean PR body", () => {
    const signals = detectHoneypot(
      "Fixed a bug in the parser that caused crashes on empty input.",
      {
        terms: ["SLOPGUARDIAN"],
      },
    );

    expect(signals.length).toBe(0);
  });

  it("returns empty when no terms configured", () => {
    const signals = detectHoneypot("SLOPGUARDIAN is mentioned but no terms set.", {
      terms: [],
    });

    expect(signals.length).toBe(0);
  });

  it("detects multiple trap words", () => {
    const signals = detectHoneypot("This SLOPGUARDIAN PR is TRAPWORD enabled.", {
      terms: ["SLOPGUARDIAN", "TRAPWORD"],
    });

    expect(signals.length).toBe(2);
  });
});

describe("extractHoneypotTermsFromTemplate", () => {
  it("extracts terms from honeypot HTML comment", () => {
    const template = "## What\n\n<!-- honeypot: SLOPGUARDIAN -->\n\n## Why";
    const terms = extractHoneypotTermsFromTemplate(template);

    expect(terms).toEqual(["SLOPGUARDIAN"]);
  });

  it("extracts multiple comma-separated terms", () => {
    const template = "<!-- honeypot: TERM1, TERM2, TERM3 -->";
    const terms = extractHoneypotTermsFromTemplate(template);

    expect(terms).toEqual(["TERM1", "TERM2", "TERM3"]);
  });

  it("returns empty for template without honeypot comment", () => {
    const template = "## What\n\n<!-- Please fill in the details -->\n\n## Why";
    const terms = extractHoneypotTermsFromTemplate(template);

    expect(terms).toEqual([]);
  });
});
