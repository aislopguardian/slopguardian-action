import { resolve } from "node:path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import type { Signal, SlopGuardianConfig, Verdict } from "@slopguardian/core";
import { DEFAULT_CONFIG, loadConfig, Scanner, scoreToVerdict } from "@slopguardian/core";
import { emitAnnotations } from "./annotations.js";
import { buildReviewComment } from "./comment-builder.js";
import { evaluateContributor } from "./contributor.js";
import { parseDiff } from "./diff-parser.js";
import type { GitHubClient } from "./github.js";
import {
  addLabel,
  closeIssue,
  createGitHubClient,
  getFileContent,
  getMergedPrCount,
  getPastSlopClosures,
  getPrDiff,
  hasExemptLabel,
  isCollaborator,
  upsertComment,
} from "./github.js";
import { extractStackTraceRefs, verifyStackTraces } from "./hallucination.js";
import { detectHoneypot } from "./honeypot.js";
import { type ActionInputs, parseActionInputs } from "./inputs.js";
import { setActionOutputs } from "./outputs.js";

async function run(): Promise<void> {
  try {
    const inputs = parseActionInputs();
    const token = core.getInput("github-token", { required: true });
    const client = createGitHubClient(token);
    const { context } = github;

    const issueNumber = context.payload.pull_request?.number ?? context.payload.issue?.number;
    if (!issueNumber) {
      core.info("No PR or issue in context — skipping");
      return;
    }

    const username =
      context.payload.pull_request?.user?.login ?? context.payload.issue?.user?.login ?? "";

    const isExempt = await hasExemptLabel(client, issueNumber, inputs.exemptLabels);
    if (isExempt) {
      core.info(`Exempt label found on #${issueNumber} — skipping`);
      return;
    }

    const contributorVerdict = await buildContributorVerdict(client, username, inputs);

    if (contributorVerdict.action === "block") {
      await closeIssue(client, issueNumber);
      core.info(`Blocked user ${username} — closed #${issueNumber}`);
      return;
    }

    if (contributorVerdict.action === "skip") {
      core.info(`Skipping analysis for ${username}`);
      return;
    }

    const configResult = loadConfig(inputs.config);
    if (configResult.isErr()) {
      core.warning(`Config error: ${configResult.error.message} — using defaults`);
    }
    const config = configResult.isOk() ? configResult.value : DEFAULT_CONFIG;

    const allSignals: Signal[] = [...contributorVerdict.signals];

    if (context.payload.pull_request) {
      const prSignals = await analyzePr(client, issueNumber, config, inputs);
      allSignals.push(...prSignals);
    }

    if (context.payload.issue) {
      const issueSignals = await analyzeIssue(client, context.payload.issue.body ?? "");
      allSignals.push(...issueSignals);
    }

    const warnThreshold = inputs.warnThreshold ?? config.thresholds.warn;
    const failThreshold = inputs.failThreshold ?? config.thresholds.fail;
    let totalScore = allSignals.reduce((sum, s) => sum + s.score, 0);
    totalScore = Math.round(totalScore * contributorVerdict.scoreMultiplier);
    const verdict = scoreToVerdict(totalScore, { warn: warnThreshold, fail: failThreshold });

    await applyVerdict(client, issueNumber, inputs, allSignals, totalScore, verdict);
  } catch (error) {
    core.setFailed(
      `SlopGuardian failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function buildContributorVerdict(
  client: GitHubClient,
  username: string,
  inputs: ActionInputs,
) {
  return evaluateContributor(
    {
      username,
      mergedPrCount: inputs.contributorHistoryCheck ? await getMergedPrCount(client, username) : 1,
      pastSlopClosures: inputs.contributorHistoryCheck
        ? await getPastSlopClosures(client, username, "slopguardian:likely-slop")
        : 0,
      isCollaborator: await isCollaborator(client, username),
    },
    {
      blockedUsers: inputs.blockedUsers,
      trustedUsers: inputs.trustedUsers,
      exemptUsers: inputs.exemptUsers,
      excludeCollaborators: inputs.excludeCollaborators,
      newContributorMultiplier: inputs.newContributorMultiplier,
      repeatOffenderThreshold: inputs.repeatOffenderThreshold,
      repeatOffenderMultiplier: inputs.repeatOffenderMultiplier,
    },
  );
}

async function analyzePr(
  client: GitHubClient,
  pullNumber: number,
  config: SlopGuardianConfig,
  inputs: ActionInputs,
): Promise<Signal[]> {
  const signals: Signal[] = [];
  const diff = await getPrDiff(client, pullNumber);
  const fileChanges = parseDiff(diff);

  // __dirname resolves relative to the action repo checkout, not the user's workspace
  const patternsDir = resolve(__dirname, "../../core/patterns");
  const scanner = new Scanner(config, patternsDir);

  const filesToScan = fileChanges
    .filter((f) => f.status !== "deleted")
    .map((f) => ({
      filePath: f.filePath,
      content: f.addedLines.map((l) => l.content).join("\n"),
      diff: f.patch,
    }));

  if (filesToScan.length > 0) {
    const scanResult = await scanner.scan(filesToScan);
    if (scanResult.isOk()) {
      signals.push(...scanResult.value.signals);
    }
  }

  const prBody = github.context.payload.pull_request?.body ?? "";
  signals.push(...detectHoneypot(prBody, { terms: inputs.honeypotTerms }));

  const headBranch = github.context.payload.pull_request?.head?.ref ?? "";
  if (inputs.blockedSourceBranches.includes(headBranch)) {
    signals.push({
      detectorId: "blocked-branch",
      category: "consistency",
      severity: "error",
      score: 4,
      message: `PR opened from blocked branch: ${headBranch}`,
      suggestion: "Create a feature branch instead of opening PRs from main/master",
    });
  }

  return signals;
}

async function analyzeIssue(client: GitHubClient, issueBody: string): Promise<Signal[]> {
  const stackRefs = extractStackTraceRefs(issueBody);
  if (stackRefs.length === 0) return [];

  return verifyStackTraces(stackRefs, {
    fileExists: async (path) => (await getFileContent(client, path)) !== null,
    fileLineCount: async (path) => {
      const content = await getFileContent(client, path);
      return content ? content.split("\n").length : null;
    },
    fileContains: async (path, text) => {
      const content = await getFileContent(client, path);
      return content ? content.includes(text) : false;
    },
  });
}

async function applyVerdict(
  client: GitHubClient,
  issueNumber: number,
  inputs: ActionInputs,
  signals: Signal[],
  totalScore: number,
  verdict: Verdict,
): Promise<void> {
  const commentBody = buildReviewComment({
    verdict,
    score: totalScore,
    signals,
    exemptLabels: inputs.exemptLabels,
  });

  const actions =
    verdict === "likely-slop" ? inputs.onClose : verdict === "suspicious" ? inputs.onWarn : [];

  if (actions.includes("comment")) {
    await upsertComment(client, issueNumber, commentBody);
  }

  if (actions.includes("label")) {
    await addLabel(client, issueNumber, `slopguardian:${verdict}`);
  }

  if (actions.includes("close") && verdict === "likely-slop") {
    await closeIssue(client, issueNumber);
  }

  emitAnnotations(signals);
  setActionOutputs({
    verdict,
    score: totalScore,
    signalCount: signals.length,
    report: commentBody,
  });

  if (inputs.failOnError && verdict === "likely-slop") {
    core.setFailed(`SlopGuardian: ${verdict} (score: ${totalScore})`);
  }
}

run();
