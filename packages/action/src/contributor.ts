import type { Signal } from "@slopguardian/core";

export interface ContributorInfo {
  username: string;
  mergedPrCount: number;
  pastSlopClosures: number;
  isCollaborator: boolean;
}

export interface ContributorConfig {
  blockedUsers: string[];
  trustedUsers: string[];
  exemptUsers: string[];
  excludeCollaborators: boolean;
  newContributorMultiplier: number;
  repeatOffenderThreshold: number;
  repeatOffenderMultiplier: number;
}

export interface ContributorVerdict {
  action: "skip" | "block" | "analyze";
  scoreMultiplier: number;
  signals: Signal[];
}

export function evaluateContributor(
  contributor: ContributorInfo,
  config: ContributorConfig,
): ContributorVerdict {
  const { username } = contributor;

  if (config.exemptUsers.includes(username)) {
    return { action: "skip", scoreMultiplier: 1, signals: [] };
  }

  if (config.blockedUsers.includes(username)) {
    return {
      action: "block",
      scoreMultiplier: 1,
      signals: [
        {
          detectorId: "contributor",
          category: "consistency",
          severity: "error",
          score: 0,
          message: `User ${username} is on the blocked list`,
        },
      ],
    };
  }

  if (config.excludeCollaborators && contributor.isCollaborator) {
    return { action: "skip", scoreMultiplier: 1, signals: [] };
  }

  const signals: Signal[] = [];
  let scoreMultiplier = 1;

  if (config.trustedUsers.includes(username)) {
    scoreMultiplier = 0.5;
  }

  if (contributor.mergedPrCount === 0) {
    scoreMultiplier *= config.newContributorMultiplier;
    signals.push({
      detectorId: "contributor",
      category: "consistency",
      severity: "info",
      score: 0,
      message: `New contributor (0 merged PRs) — ${config.newContributorMultiplier}x score multiplier applied`,
    });
  }

  if (contributor.pastSlopClosures >= config.repeatOffenderThreshold) {
    scoreMultiplier *= config.repeatOffenderMultiplier;
    signals.push({
      detectorId: "contributor",
      category: "consistency",
      severity: "warning",
      score: 0,
      message: `Repeat offender (${contributor.pastSlopClosures} past closures) — ${config.repeatOffenderMultiplier}x multiplier applied`,
    });
  }

  return { action: "analyze", scoreMultiplier, signals };
}
