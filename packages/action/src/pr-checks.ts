import type { Signal } from "@slopguardian/core";
import type { FileChange } from "./diff-parser.js";

const METADATA_PATTERNS = [
  /^readme/i,
  /^license/i,
  /^security/i,
  /^code_of_conduct/i,
  /^contributing/i,
  /^changelog/i,
  /^\.github\//,
];

function isMetadataFile(filePath: string): boolean {
  return METADATA_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function checkMetadataOnlyPr(files: FileChange[]): Signal[] {
  if (files.length === 0) return [];

  const allMetadata = files.every((f) => isMetadataFile(f.filePath));
  if (!allMetadata) return [];

  return [
    {
      detectorId: "metadata-only-pr",
      category: "action",
      severity: "warning",
      score: 3,
      message: `PR touches only metadata files (${files.length} file${files.length === 1 ? "" : "s"}), no source code changes`,
      suggestion: "Metadata-only PRs are a common pattern in automated contributions. Verify this change is intentional.",
    },
  ];
}

const GENERIC_TITLE_PATTERNS = [
  /^update\s+readme$/i,
  /^fix\s+bug$/i,
  /^improve\s+code$/i,
  /^add\s+feature$/i,
  /^refactor$/i,
  /^changes$/i,
  /^updates$/i,
  /^fix$/i,
  /^update$/i,
  /^improve$/i,
  /^fix\s+bugs$/i,
  /^add\s+features$/i,
  /^minor\s+(changes|updates|fixes)$/i,
];

export function checkTitleQuality(title: string): Signal[] {
  const signals: Signal[] = [];
  const trimmed = title.trim();

  if (GENERIC_TITLE_PATTERNS.some((p) => p.test(trimmed))) {
    signals.push({
      detectorId: "generic-title",
      category: "action",
      severity: "info",
      score: 2,
      message: `PR title "${trimmed}" is too generic to convey what changed`,
      suggestion: "Use a specific title that describes the actual change, e.g. 'fix(auth): reject expired tokens on refresh'.",
    });
  }

  if (trimmed.length > 72) {
    signals.push({
      detectorId: "title-length",
      category: "action",
      severity: "info",
      score: 1,
      message: `PR title is ${trimmed.length} characters (max recommended: 72)`,
      suggestion: "Move details to the PR description and keep the title under 72 characters.",
    });
  }

  const emojiCount = countEmoji(trimmed);
  if (emojiCount > 2) {
    signals.push({
      detectorId: "title-emoji",
      category: "action",
      severity: "info",
      score: 1,
      message: `PR title contains ${emojiCount} emoji — decorative overload`,
      suggestion: "One emoji is fine for categorization, but excessive emoji reduces readability.",
    });
  }

  return signals;
}

function countEmoji(text: string): number {
  const emojiPattern = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
  const matches = text.match(emojiPattern);
  return matches?.length ?? 0;
}

export function checkDescriptionQuality(body: string): Signal[] {
  const trimmed = body.trim();

  if (trimmed.length === 0) {
    return [
      {
        detectorId: "empty-description",
        category: "action",
        severity: "warning",
        score: 2,
        message: "PR has no description",
        suggestion: "Explain what this PR changes and why. Even a single sentence helps reviewers.",
      },
    ];
  }

  const signals: Signal[] = [];

  if (trimmed.length < 20) {
    signals.push({
      detectorId: "short-description",
      category: "action",
      severity: "info",
      score: 1,
      message: `PR description is only ${trimmed.length} characters`,
      suggestion: "A brief explanation of motivation and scope helps reviewers understand the change.",
    });
  }

  if (trimmed.length > 5000) {
    signals.push({
      detectorId: "verbose-description",
      category: "action",
      severity: "info",
      score: 2,
      message: `PR description is ${trimmed.length} characters — unusually long`,
      suggestion: "Extremely long descriptions can indicate auto-generated content. Keep it focused.",
    });
  }

  return signals;
}

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".rb",
]);

const COMMENT_PREFIXES = ["//", "#", "/*", "*", "<!--"];

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function getExtension(filePath: string): string {
  const dotIndex = filePath.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return filePath.slice(dotIndex).toLowerCase();
}

export function checkAddedCommentDensity(
  files: Array<{ filePath: string; addedLines: Array<{ content: string }> }>,
): Signal[] {
  const signals: Signal[] = [];

  for (const file of files) {
    if (!CODE_EXTENSIONS.has(getExtension(file.filePath))) continue;

    const totalAdded = file.addedLines.length;
    if (totalAdded < 6) continue;

    const commentCount = file.addedLines.filter((l) => isCommentLine(l.content)).length;
    const ratio = commentCount / totalAdded;

    if (ratio > 0.5) {
      signals.push({
        detectorId: "added-comment-density",
        category: "action",
        severity: "warning",
        score: 2,
        file: file.filePath,
        message: `${Math.round(ratio * 100)}% of added lines in ${file.filePath} are comments (${commentCount}/${totalAdded})`,
        suggestion: "High comment density in new code often signals auto-generated explanations. Comments should explain why, not what.",
      });
    }
  }

  return signals;
}

const BOT_USERNAME_PATTERN = /^[a-z]+\d{4,}[a-z]*$/i;

export function checkSpamUsername(username: string): Signal[] {
  const hasTrailingDigits = /\d{3,}$/.test(username);
  const isBotLike = BOT_USERNAME_PATTERN.test(username);

  if ((hasTrailingDigits && username.length > 15) || isBotLike) {
    return [
      {
        detectorId: "spam-username",
        category: "action",
        severity: "info",
        score: 1,
        message: `Username "${username}" matches patterns common in automated accounts`,
        suggestion: "This is a low-confidence signal — one data point among many, not grounds for rejection alone.",
      },
    ];
  }

  return [];
}

export function checkTemplateCompliance(body: string): Signal[] {
  const uncheckedCount = (body.match(/- \[ \]/g) ?? []).length;
  const checkedCount = (body.match(/- \[x\]/gi) ?? []).length;
  const totalBoxes = uncheckedCount + checkedCount;

  if (totalBoxes === 0) return [];

  if (uncheckedCount > 0 && checkedCount === 0) {
    return [
      {
        detectorId: "template-unchecked",
        category: "action",
        severity: "warning",
        score: 2,
        message: `PR template has ${uncheckedCount} unchecked checkbox${uncheckedCount === 1 ? "" : "es"} and none checked`,
        suggestion: "Complete the PR template checklist before submitting.",
      },
    ];
  }

  if (checkedCount === totalBoxes && totalBoxes >= 5) {
    return [
      {
        detectorId: "template-all-checked",
        category: "action",
        severity: "info",
        score: 1,
        message: `All ${totalBoxes} template checkboxes are checked — automated tools tend to check everything`,
        suggestion: "Verify each checkbox was reviewed individually rather than bulk-checked.",
      },
    ];
  }

  return [];
}
