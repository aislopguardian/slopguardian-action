import type { Signal } from "@slopguardian/core";

export interface FileVerifier {
  fileExists(path: string): Promise<boolean>;
  fileLineCount(path: string): Promise<number | null>;
  fileContains(path: string, searchText: string): Promise<boolean>;
}

interface StackTraceRef {
  file: string;
  function?: string;
  line?: number;
}

const STACK_TRACE_PATTERNS = [
  /at\s+(?:(\S+)\s+\()?([\w.\/\\-]+\.(?:ts|js|py|go|rs|java|rb)):(\d+)/g,
  /File "([^"]+)", line (\d+)(?:, in (\w+))?/g,
  /([\w.\/\\-]+\.(?:ts|js|py|go|rs|java)):(\d+):(\d+)/g,
];

export function extractStackTraceRefs(issueBody: string): StackTraceRef[] {
  const refs: StackTraceRef[] = [];
  const seen = new Set<string>();

  for (const pattern of STACK_TRACE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);

    for (const match of issueBody.matchAll(regex)) {
      const ref = parseStackMatch(match, pattern);
      if (!ref) continue;

      const key = `${ref.file}:${ref.line ?? ""}:${ref.function ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(ref);
    }
  }

  return refs;
}

function parseStackMatch(match: RegExpExecArray, pattern: RegExp): StackTraceRef | null {
  const source = pattern.source;

  if (source.startsWith("at")) {
    return {
      function: match[1] || undefined,
      file: match[2] ?? "",
      line: match[3] ? Number.parseInt(match[3], 10) : undefined,
    };
  }

  if (source.startsWith("File")) {
    return {
      file: match[1] ?? "",
      line: match[2] ? Number.parseInt(match[2], 10) : undefined,
      function: match[3] || undefined,
    };
  }

  return {
    file: match[1] ?? "",
    line: match[2] ? Number.parseInt(match[2], 10) : undefined,
  };
}

export async function verifyStackTraces(
  refs: StackTraceRef[],
  verifier: FileVerifier,
): Promise<Signal[]> {
  const signals: Signal[] = [];

  for (const ref of refs) {
    const fileExists = await verifier.fileExists(ref.file);

    if (!fileExists) {
      signals.push({
        detectorId: "hallucination",
        category: "consistency",
        severity: "error",
        score: 5,
        message: `Referenced file does not exist: ${ref.file}`,
        suggestion: "Verify the file path. This file is not in the repository.",
      });
      continue;
    }

    if (ref.function) {
      const fnExists = await verifier.fileContains(ref.file, ref.function);
      if (!fnExists) {
        signals.push({
          detectorId: "hallucination",
          category: "consistency",
          severity: "error",
          score: 5,
          message: `Function '${ref.function}' not found in ${ref.file}`,
          suggestion: "This function name does not appear in the referenced file.",
        });
      }
    }

    if (ref.line) {
      const lineCount = await verifier.fileLineCount(ref.file);
      if (lineCount !== null && ref.line > lineCount) {
        signals.push({
          detectorId: "hallucination",
          category: "consistency",
          severity: "error",
          score: 4,
          message: `Line ${ref.line} exceeds file length (${lineCount} lines): ${ref.file}`,
          suggestion: "The referenced line number is beyond the end of the file.",
        });
      }
    }
  }

  return signals;
}
