import { describe, expect, it } from "vitest";
import { buildReviewComment, isOwnComment } from "../src/comment-builder.js";

describe("buildReviewComment", () => {
  it("includes the HTML marker for later identification", () => {
    const comment = buildReviewComment({
      verdict: "clean",
      score: 2,
      signals: [],
      exemptLabels: ["human-verified"],
    });

    expect(comment).toContain("<!-- slopguardian-review -->");
  });

  it("shows verdict and score", () => {
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

    expect(comment).toContain("Suspicious");
    expect(comment).toContain("8");
    expect(comment).toContain("Filler phrase detected");
    expect(comment).toContain("README.md");
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

  it("shows 'no signals' for clean results", () => {
    const comment = buildReviewComment({
      verdict: "clean",
      score: 0,
      signals: [],
      exemptLabels: [],
    });

    expect(comment).toContain("No AI slop patterns detected");
  });
});

describe("isOwnComment", () => {
  it("identifies comments with the marker", () => {
    expect(isOwnComment("<!-- slopguardian-review -->\n## SlopGuardian Review")).toBe(true);
  });

  it("rejects comments without the marker", () => {
    expect(isOwnComment("Regular comment about the PR")).toBe(false);
  });
});
