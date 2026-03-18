import { describe, expect, it } from "vitest";
import { buildReviewComment, isOwnComment } from "../src/comment-builder.js";

describe("buildReviewComment", () => {
  it("includes the HTML marker at the end for comment identification", () => {
    const comment = buildReviewComment({
      verdict: "clean",
      score: 2,
      signals: [],
      exemptLabels: ["human-verified"],
    });

    expect(comment).toContain("<!-- slopguardian-review -->");
    expect(comment.trimEnd().endsWith("<!-- slopguardian-review -->")).toBe(true);
  });

  it("shows verdict and score in compact header", () => {
    const comment = buildReviewComment({
      verdict: "suspicious",
      score: 8,
      signals: [
        {
          detectorId: "lexical",
          category: "lexical",
          severity: "warning",
          score: 3,
          message: "Filler phrase detected",
          file: "README.md",
          line: 5,
        },
      ],
      exemptLabels: ["human-verified"],
    });

    expect(comment).toContain("suspicious");
    expect(comment).toContain("**8**");
    expect(comment).toContain("Filler phrase detected");
    expect(comment).toContain("README.md:5");
  });

  it("uses collapsible details for signals", () => {
    const comment = buildReviewComment({
      verdict: "likely-slop",
      score: 15,
      signals: [
        {
          detectorId: "honeypot",
          category: "lexical",
          severity: "error",
          score: 5,
          message: "Trap word found",
          suggestion: "Remove the trap word from your PR description",
        },
        {
          detectorId: "lexical",
          category: "lexical",
          severity: "warning",
          score: 3,
          message: "Filler",
          suggestion: "Remove filler phrases",
        },
      ],
      exemptLabels: [],
    });

    expect(comment).toContain("<details open>");
    expect(comment).toContain("2 signals found");
    expect(comment).toContain("<details>");
    expect(comment).toContain("How to fix");
  });

  it("includes score breakdown in footer", () => {
    const comment = buildReviewComment({
      verdict: "suspicious",
      score: 8,
      signals: [
        {
          detectorId: "lexical",
          category: "lexical",
          severity: "warning",
          score: 3,
          message: "Filler",
        },
        {
          detectorId: "honeypot",
          category: "lexical",
          severity: "error",
          score: 5,
          message: "Trap word",
        },
      ],
      exemptLabels: [],
    });

    expect(comment).toContain("Score breakdown:");
    expect(comment).toContain("honeypot(5)");
    expect(comment).toContain("lexical(3)");
  });

  it("mentions exempt labels", () => {
    const comment = buildReviewComment({
      verdict: "likely-slop",
      score: 15,
      signals: [],
      exemptLabels: ["human-verified", "skip-slop-check"],
    });

    expect(comment).toContain("human-verified");
    expect(comment).toContain("skip-slop-check");
  });

  it("produces minimal output for clean results with no signals", () => {
    const comment = buildReviewComment({
      verdict: "clean",
      score: 0,
      signals: [],
      exemptLabels: [],
    });

    expect(comment).toContain("clean");
    expect(comment).not.toContain("<details");
    expect(comment).not.toContain("Score breakdown");
  });
});

describe("isOwnComment", () => {
  it("identifies comments with the marker", () => {
    expect(isOwnComment("## SlopGuardian\n<!-- slopguardian-review -->")).toBe(true);
  });

  it("rejects comments without the marker", () => {
    expect(isOwnComment("Regular comment about the PR")).toBe(false);
  });
});
