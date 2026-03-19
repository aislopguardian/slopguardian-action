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
    expect(comment).toContain("score: 8");
    expect(comment).toContain("Filler phrase detected");
    expect(comment).toContain("README.md:5");
  });

  it("renders signal table with check/where/detail/pts columns", () => {
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

    expect(comment).toContain("| Check | Where | Detail | Pts |");
    expect(comment).toContain("<details>");
    expect(comment).toContain("How to fix");
    expect(comment).toContain("This PR has been closed");
  });

  it("includes score breakdown by category in collapsible section", () => {
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

    expect(comment).toContain("Score breakdown");
    expect(comment).toContain("lexical: 8");
    expect(comment).toContain("total: **8**");
  });

  it("mentions exempt labels with dismiss instruction", () => {
    const comment = buildReviewComment({
      verdict: "likely-slop",
      score: 15,
      signals: [],
      exemptLabels: ["human-verified", "skip-slop-check"],
    });

    expect(comment).toContain("`human-verified`");
    expect(comment).toContain("`skip-slop-check`");
    expect(comment).toContain("dismisses this review");
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

  it("adds needs-review note without closing message", () => {
    const comment = buildReviewComment({
      verdict: "needs-review",
      score: 12,
      signals: [
        {
          detectorId: "metadata-only-pr",
          category: "action",
          severity: "warning",
          score: 3,
          message: "PR touches only metadata files",
        },
      ],
      exemptLabels: ["human-verified"],
    });

    expect(comment).toContain("needs-review");
    expect(comment).toContain("needs manual review");
    expect(comment).not.toContain("has been closed");
  });

  it("overflows signals beyond 10 into collapsed section", () => {
    const signals = Array.from({ length: 12 }, (_, i) => ({
      detectorId: `check-${i}`,
      category: "lexical" as const,
      severity: "warning" as const,
      score: 1,
      message: `Signal ${i}`,
    }));

    const comment = buildReviewComment({
      verdict: "likely-slop",
      score: 15,
      signals,
      exemptLabels: [],
    });

    expect(comment).toContain("2 more signals");
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
