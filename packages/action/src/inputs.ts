import * as core from "@actions/core";
import { z } from "zod";

const ProfileSchema = z.enum(["strict", "balanced", "relaxed", "monitor-only"]).default("balanced");

export type Profile = z.infer<typeof ProfileSchema>;

const PROFILE_OVERRIDES: Record<Profile, Partial<z.infer<typeof ActionInputsSchema>>> = {
  strict: {
    warnThreshold: 4,
    reviewThreshold: 8,
    failThreshold: 12,
    newContributorMultiplier: 2.0,
    repeatOffenderMultiplier: 2.5,
    onClose: ["label", "comment", "close"],
  },
  balanced: {},
  relaxed: {
    warnThreshold: 8,
    reviewThreshold: 14,
    failThreshold: 20,
    newContributorMultiplier: 1.2,
    checkSpamUsername: false,
    checkTemplateCompliance: false,
  },
  "monitor-only": {
    onWarn: ["label", "comment"],
    onNeedsReview: ["label", "comment"],
    onClose: ["label", "comment"],
    failOnError: false,
  },
};

const ActionInputsSchema = z.object({
  config: z.string().default(".slopguardian.yml"),
  profile: ProfileSchema,
  failOnError: z.boolean().default(true),
  failThreshold: z.number().optional(),
  warnThreshold: z.number().optional(),
  reviewThreshold: z.number().optional(),
  aiKey: z.string().default(""),
  aiProvider: z
    .enum(["openrouter", "openai", "anthropic", "ollama", "custom"])
    .default("openrouter"),
  aiModel: z.string().default(""),
  honeypotTerms: z.array(z.string()).default([]),
  exemptUsers: z.array(z.string()).default([]),
  exemptLabels: z.array(z.string()).default(["human-verified"]),
  blockedUsers: z.array(z.string()).default([]),
  trustedUsers: z.array(z.string()).default([]),
  blockedSourceBranches: z.array(z.string()).default(["main", "master"]),
  excludeCollaborators: z.boolean().default(true),
  contributorHistoryCheck: z.boolean().default(true),
  newContributorMultiplier: z.number().default(1.5),
  repeatOffenderThreshold: z.number().default(3),
  repeatOffenderMultiplier: z.number().default(2.0),
  gracePeriodHours: z.number().default(0),
  checkMetadataPaths: z.boolean().default(true),
  checkTitleQuality: z.boolean().default(true),
  checkDescriptionQuality: z.boolean().default(true),
  checkAddedComments: z.boolean().default(true),
  checkSpamUsername: z.boolean().default(true),
  checkTemplateCompliance: z.boolean().default(true),
  onWarn: z.array(z.string()).default(["label", "comment"]),
  onNeedsReview: z.array(z.string()).default(["label", "comment"]),
  onClose: z.array(z.string()).default(["label", "comment", "close"]),
});

export type ActionInputs = z.infer<typeof ActionInputsSchema>;

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function optionalNumber(inputName: string): number | undefined {
  const raw = core.getInput(inputName);
  return raw ? Number(raw) : undefined;
}

function optionalBool(inputName: string, fallback: boolean): boolean {
  try {
    return core.getBooleanInput(inputName);
  } catch {
    return fallback;
  }
}

export function parseActionInputs(): ActionInputs {
  const profile = (core.getInput("profile") || "balanced") as Profile;

  const raw = {
    config: core.getInput("config") || ".slopguardian.yml",
    profile,
    failOnError: core.getBooleanInput("fail-on-error"),
    failThreshold: optionalNumber("fail-threshold"),
    warnThreshold: optionalNumber("warn-threshold"),
    reviewThreshold: optionalNumber("review-threshold"),
    aiKey: core.getInput("ai-key"),
    aiProvider: core.getInput("ai-provider") || "openrouter",
    aiModel: core.getInput("ai-model"),
    honeypotTerms: splitCsv(core.getInput("honeypot-terms")),
    exemptUsers: splitCsv(core.getInput("exempt-users")),
    exemptLabels: splitCsv(core.getInput("exempt-labels") || "human-verified"),
    blockedUsers: splitCsv(core.getInput("blocked-users")),
    trustedUsers: splitCsv(core.getInput("trusted-users")),
    blockedSourceBranches: splitCsv(core.getInput("blocked-source-branches") || "main,master"),
    excludeCollaborators: core.getBooleanInput("exclude-collaborators"),
    contributorHistoryCheck: core.getBooleanInput("contributor-history-check"),
    newContributorMultiplier: Number(core.getInput("new-contributor-multiplier") || "1.5"),
    repeatOffenderThreshold: Number(core.getInput("repeat-offender-threshold") || "3"),
    repeatOffenderMultiplier: Number(core.getInput("repeat-offender-multiplier") || "2.0"),
    gracePeriodHours: Number(core.getInput("grace-period-hours") || "0"),
    checkMetadataPaths: optionalBool("check-metadata-paths", true),
    checkTitleQuality: optionalBool("check-title-quality", true),
    checkDescriptionQuality: optionalBool("check-description-quality", true),
    checkAddedComments: optionalBool("check-added-comments", true),
    checkSpamUsername: optionalBool("check-spam-username", true),
    checkTemplateCompliance: optionalBool("check-template-compliance", true),
    onWarn: splitCsv(core.getInput("on-warn") || "label,comment"),
    onNeedsReview: splitCsv(core.getInput("on-needs-review") || "label,comment"),
    onClose: splitCsv(core.getInput("on-close") || "label,comment,close"),
  };

  const parsed = ActionInputsSchema.parse(raw);
  return applyProfile(parsed);
}

function applyProfile(inputs: ActionInputs): ActionInputs {
  const overrides = PROFILE_OVERRIDES[inputs.profile];
  if (!overrides || Object.keys(overrides).length === 0) return inputs;
  return { ...inputs, ...overrides };
}
