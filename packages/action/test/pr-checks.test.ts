import { describe, expect, it } from "vitest";
import {
  checkAddedCommentDensity,
  checkDescriptionQuality,
  checkMetadataOnlyPr,
  checkSpamUsername,
  checkTemplateCompliance,
  checkTitleQuality,
} from "../src/pr-checks.js";

describe("checkMetadataOnlyPr", () => {
  it("flags PRs that only touch metadata files", () => {
    const signals = checkMetadataOnlyPr([
      { filePath: "README.md", status: "modified", additions: 5, deletions: 2, patch: "", addedLines: [] },
      { filePath: "LICENSE", status: "modified", additions: 1, deletions: 1, patch: "", addedLines: [] },
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.detectorId).toBe("metadata-only-pr");
  });

  it("passes when PR includes source code changes", () => {
    const signals = checkMetadataOnlyPr([
      { filePath: "README.md", status: "modified", additions: 5, deletions: 2, patch: "", addedLines: [] },
      { filePath: "src/index.ts", status: "modified", additions: 10, deletions: 3, patch: "", addedLines: [] },
    ]);
    expect(signals).toHaveLength(0);
  });

  it("returns nothing for empty file list", () => {
    expect(checkMetadataOnlyPr([])).toHaveLength(0);
  });

  it("catches .github/ directory files as metadata", () => {
    const signals = checkMetadataOnlyPr([
      { filePath: ".github/workflows/ci.yml", status: "modified", additions: 2, deletions: 1, patch: "", addedLines: [] },
    ]);
    expect(signals).toHaveLength(1);
  });
});

describe("checkTitleQuality", () => {
  it("flags generic titles", () => {
    for (const title of ["Update README", "Fix bug", "Improve code", "Refactor", "Changes"]) {
      const signals = checkTitleQuality(title);
      expect(signals.some((s) => s.detectorId === "generic-title")).toBe(true);
    }
  });

  it("passes specific titles", () => {
    expect(checkTitleQuality("feat(auth): add JWT refresh token rotation")).toHaveLength(0);
    expect(checkTitleQuality("fix: prevent XSS in user profile page")).toHaveLength(0);
  });

  it("flags titles longer than 72 characters", () => {
    const longTitle = "a".repeat(73);
    const signals = checkTitleQuality(longTitle);
    expect(signals.some((s) => s.detectorId === "title-length")).toBe(true);
  });

  it("does not flag titles at exactly 72 characters", () => {
    const title = "a".repeat(72);
    expect(checkTitleQuality(title)).toHaveLength(0);
  });
});

describe("checkDescriptionQuality", () => {
  it("flags empty descriptions", () => {
    const signals = checkDescriptionQuality("");
    expect(signals).toHaveLength(1);
    expect(signals[0]?.detectorId).toBe("empty-description");
  });

  it("flags whitespace-only descriptions as empty", () => {
    expect(checkDescriptionQuality("   \n  ")[0]?.detectorId).toBe("empty-description");
  });

  it("flags very short descriptions", () => {
    const signals = checkDescriptionQuality("Fixed the bug.");
    expect(signals.some((s) => s.detectorId === "short-description")).toBe(true);
  });

  it("flags excessively long descriptions", () => {
    const longBody = "a".repeat(5001);
    const signals = checkDescriptionQuality(longBody);
    expect(signals.some((s) => s.detectorId === "verbose-description")).toBe(true);
  });

  it("passes normal-length descriptions", () => {
    const body = "This PR adds JWT token refresh logic. Tokens are rotated on each request if they're within 5 minutes of expiry.";
    expect(checkDescriptionQuality(body)).toHaveLength(0);
  });
});

describe("checkAddedCommentDensity", () => {
  it("flags files where most added lines are comments", () => {
    const signals = checkAddedCommentDensity([
      {
        filePath: "src/auth.ts",
        addedLines: [
          { content: "// Check if user is authenticated" },
          { content: "// Validate the token" },
          { content: "// Return the user object" },
          { content: "// Handle errors" },
          { content: "const user = getUser();" },
          { content: "return user;" },
        ],
      },
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.detectorId).toBe("added-comment-density");
  });

  it("passes files with low comment ratio", () => {
    const signals = checkAddedCommentDensity([
      {
        filePath: "src/auth.ts",
        addedLines: [
          { content: "const user = getUser();" },
          { content: "if (!user) throw new Error();" },
          { content: "return user;" },
          { content: "// Only validate in production" },
          { content: "validate(user);" },
          { content: "save(user);" },
        ],
      },
    ]);
    expect(signals).toHaveLength(0);
  });

  it("ignores non-code files", () => {
    const signals = checkAddedCommentDensity([
      {
        filePath: "README.md",
        addedLines: Array.from({ length: 10 }, () => ({ content: "// comment" })),
      },
    ]);
    expect(signals).toHaveLength(0);
  });

  it("ignores files with fewer than 6 added lines", () => {
    const signals = checkAddedCommentDensity([
      {
        filePath: "src/index.ts",
        addedLines: [
          { content: "// comment" },
          { content: "// comment" },
          { content: "// comment" },
        ],
      },
    ]);
    expect(signals).toHaveLength(0);
  });
});

describe("checkSpamUsername", () => {
  it("flags bot-like usernames", () => {
    expect(checkSpamUsername("user12345")).toHaveLength(1);
    expect(checkSpamUsername("devbot98765abc")).toHaveLength(1);
  });

  it("passes normal usernames", () => {
    expect(checkSpamUsername("johndoe")).toHaveLength(0);
    expect(checkSpamUsername("alice-dev")).toHaveLength(0);
    expect(checkSpamUsername("bob42")).toHaveLength(0);
  });
});

describe("checkTemplateCompliance", () => {
  it("flags all-unchecked checkboxes", () => {
    const body = "## Checklist\n- [ ] Tests\n- [ ] Docs\n- [ ] Linting";
    const signals = checkTemplateCompliance(body);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.detectorId).toBe("template-unchecked");
  });

  it("flags all-checked when there are 5+ checkboxes", () => {
    const body = "- [x] A\n- [x] B\n- [x] C\n- [x] D\n- [x] E";
    const signals = checkTemplateCompliance(body);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.detectorId).toBe("template-all-checked");
  });

  it("passes partial checkbox completion", () => {
    const body = "- [x] Tests\n- [ ] Docs\n- [x] Linting";
    expect(checkTemplateCompliance(body)).toHaveLength(0);
  });

  it("returns nothing when no checkboxes present", () => {
    expect(checkTemplateCompliance("Just a description.")).toHaveLength(0);
  });
});
