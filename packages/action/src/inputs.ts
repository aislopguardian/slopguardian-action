import * as core from "@actions/core";
import { z } from "zod";

const ActionInputsSchema = z.object({
  config: z.string().default(".slopguardian.yml"),
  failOnError: z.boolean().default(true),
  failThreshold: z.number().optional(),
  warnThreshold: z.number().optional(),
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
  onWarn: z.array(z.string()).default(["label", "comment"]),
  onClose: z.array(z.string()).default(["label", "comment", "close"]),
});

export type ActionInputs = z.infer<typeof ActionInputsSchema>;

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseActionInputs(): ActionInputs {
  const raw = {
    config: core.getInput("config") || ".slopguardian.yml",
    failOnError: core.getBooleanInput("fail-on-error"),
    failThreshold: core.getInput("fail-threshold")
      ? Number(core.getInput("fail-threshold"))
      : undefined,
    warnThreshold: core.getInput("warn-threshold")
      ? Number(core.getInput("warn-threshold"))
      : undefined,
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
    onWarn: splitCsv(core.getInput("on-warn") || "label,comment"),
    onClose: splitCsv(core.getInput("on-close") || "label,comment,close"),
  };

  return ActionInputsSchema.parse(raw);
}
