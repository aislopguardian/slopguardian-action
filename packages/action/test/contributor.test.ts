import { describe, expect, it } from "vitest";
import { evaluateContributor } from "../src/contributor.js";

const BASE_CONFIG = {
  blockedUsers: ["spammer"],
  trustedUsers: ["maintainer"],
  exemptUsers: ["bot-account"],
  excludeCollaborators: true,
  newContributorMultiplier: 1.5,
  repeatOffenderThreshold: 3,
  repeatOffenderMultiplier: 2.0,
};

describe("evaluateContributor", () => {
  it("blocks users on the blocked list", () => {
    const verdict = evaluateContributor(
      { username: "spammer", mergedPrCount: 0, pastSlopClosures: 0, isCollaborator: false },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("block");
  });

  it("skips exempt users", () => {
    const verdict = evaluateContributor(
      { username: "bot-account", mergedPrCount: 0, pastSlopClosures: 0, isCollaborator: false },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("skip");
  });

  it("skips collaborators when configured", () => {
    const verdict = evaluateContributor(
      { username: "contributor", mergedPrCount: 10, pastSlopClosures: 0, isCollaborator: true },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("skip");
  });

  it("applies 0.5x multiplier for trusted users", () => {
    const verdict = evaluateContributor(
      { username: "maintainer", mergedPrCount: 50, pastSlopClosures: 0, isCollaborator: false },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("analyze");
    expect(verdict.scoreMultiplier).toBe(0.5);
  });

  it("applies new contributor multiplier for 0-PR users", () => {
    const verdict = evaluateContributor(
      { username: "newbie", mergedPrCount: 0, pastSlopClosures: 0, isCollaborator: false },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("analyze");
    expect(verdict.scoreMultiplier).toBe(1.5);
    expect(verdict.signals.length).toBe(1);
  });

  it("applies repeat offender multiplier", () => {
    const verdict = evaluateContributor(
      { username: "repeat", mergedPrCount: 5, pastSlopClosures: 4, isCollaborator: false },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("analyze");
    expect(verdict.scoreMultiplier).toBe(2.0);
    expect(verdict.signals.length).toBe(1);
  });

  it("stacks new contributor and repeat offender multipliers", () => {
    const verdict = evaluateContributor(
      { username: "worst-case", mergedPrCount: 0, pastSlopClosures: 5, isCollaborator: false },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("analyze");
    expect(verdict.scoreMultiplier).toBe(3.0);
  });

  it("returns 1x multiplier for normal users", () => {
    const verdict = evaluateContributor(
      { username: "normal", mergedPrCount: 3, pastSlopClosures: 1, isCollaborator: false },
      BASE_CONFIG,
    );

    expect(verdict.action).toBe("analyze");
    expect(verdict.scoreMultiplier).toBe(1);
    expect(verdict.signals.length).toBe(0);
  });
});
