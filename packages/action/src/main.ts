import { resolve } from "node:path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { Scanner, loadConfig } from "@slopguardian/core";
import type { Signal } from "@slopguardian/core";
import { emitAnnotations } from "./annotations.js";
import { buildReviewComment } from "./comment-builder.js";
import { evaluateContributor } from "./contributor.js";
import { parseDiff } from "./diff-parser.js";
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
import { parseActionInputs } from "./inputs.js";
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

    // Check exempt labels before doing any work
    const isExempt = await hasExemptLabel(client, issueNumber, inputs.exemptLabels);
    if (isExempt) {
      core.info(`Exempt label found on #${issueNumber} — skipping`);
      return;
    }

    // Evaluate contributor status
    const contributorVerdict = evaluateContributor(
      {
        username,
        mergedPrCount: inputs.contributorHistoryCheck
          ? await getMergedPrCount(client, username)
          : 1,
        pastSlopClosures: inputs.contributorHistoryCheck
          ? await getPastSlopClosures(client, username, "slopguardian")
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

    if (contributorVerdict.action === "block") {
      await closeIssue(client, issueNumber);
      core.info(`Blocked user ${username} — closed #${issueNumber}`);
      return;
    }

    if (contributorVerdict.action === "skip") {
      core.info(`Skipping analysis for ${username}`);
      return;
    }

    // Load config and scan
    const configResult = loadConfig(inputs.config);
    if (configResult.isErr()) {
      core.warning(`Config error: ${configResult.error.message} — using defaults`);
    }
    const config = configResult.isOk() ? configResult.value : undefined;

    const allSignals: Signal[] = [...contributorVerdict.signals];

    // PR-specific analysis
    if (context.payload.pull_request) {
      const diff = await getPrDiff(client, issueNumber);
      const fileChanges = parseDiff(diff);

      // Run core scanner on changed file contents
      const patternsDir = resolve(process.cwd(), "packages", "core", "patterns");
      const scanner = new Scanner(
        config ?? {
          version: 1,
          thresholds: { warn: 6, fail: 12 },
          detectors: {
            lexical: { enabled: true, weight: 1, languages: ["en"] },
            structural: { enabled: true, weight: 1, "duplicate-threshold": 0.85 },
            semantic: {
              enabled: true,
              weight: 1,
              "max-filler-ratio": 0.3,
              "max-hedging-density": 0.2,
            },
            "code-smell": {
              enabled: true,
              weight: 1,
              "max-comment-ratio": 0.4,
              "flag-generic-names": true,
            },
            consistency: { enabled: true, weight: 1, "min-files": 3 },
          },
          ai: { enabled: false, provider: "openrouter", model: "", "api-key-env": "", cache: true },
          include: ["**/*.ts", "**/*.md"],
          exclude: ["node_modules/**", "dist/**"],
        },
        patternsDir,
      );

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
          allSignals.push(...scanResult.value.signals);
        }
      }

      // Honeypot check
      const prBody = context.payload.pull_request.body ?? "";
      allSignals.push(...detectHoneypot(prBody, { terms: inputs.honeypotTerms }));

      // Blocked source branch
      const headBranch = context.payload.pull_request.head?.ref ?? "";
      if (inputs.blockedSourceBranches.includes(headBranch)) {
        allSignals.push({
          detectorId: "blocked-branch",
          category: "consistency",
          severity: "error",
          score: 4,
          message: `PR opened from blocked branch: ${headBranch}`,
          suggestion: "Create a feature branch instead of opening PRs from main/master",
        });
      }
    }

    // Issue-specific analysis
    if (context.payload.issue) {
      const issueBody = context.payload.issue.body ?? "";
      const stackRefs = extractStackTraceRefs(issueBody);

      if (stackRefs.length > 0) {
        const hallucinationSignals = await verifyStackTraces(stackRefs, {
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
        allSignals.push(...hallucinationSignals);
      }
    }

    // Score with contributor multiplier
    let totalScore = allSignals.reduce((sum, s) => sum + s.score, 0);
    totalScore = Math.round(totalScore * contributorVerdict.scoreMultiplier);

    const warnThreshold = inputs.warnThreshold ?? config?.thresholds.warn ?? 6;
    const failThreshold = inputs.failThreshold ?? config?.thresholds.fail ?? 12;

    const verdict =
      totalScore >= failThreshold
        ? ("likely-slop" as const)
        : totalScore >= warnThreshold
          ? ("suspicious" as const)
          : ("clean" as const);

    // Build comment and take action
    const commentBody = buildReviewComment({
      verdict,
      score: totalScore,
      signals: allSignals,
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

    emitAnnotations(allSignals);
    setActionOutputs({
      verdict,
      score: totalScore,
      signalCount: allSignals.length,
      report: commentBody,
    });

    if (inputs.failOnError && verdict === "likely-slop") {
      core.setFailed(`SlopGuardian: ${verdict} (score: ${totalScore})`);
    }
  } catch (error) {
    core.setFailed(
      `SlopGuardian failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

run();
