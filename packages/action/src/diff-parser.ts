export interface FileChange {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch: string;
  addedLines: Array<{ line: number; content: string }>;
}

export function parseDiff(diffText: string): FileChange[] {
  const files: FileChange[] = [];
  const fileSections = diffText.split(/^diff --git /m).filter((s) => s.trim());

  for (const section of fileSections) {
    const fileChange = parseFileSection(section);
    if (fileChange) files.push(fileChange);
  }

  return files;
}

function parseFileSection(section: string): FileChange | null {
  const headerMatch = /^a\/(.+?) b\/(.+)$/m.exec(section);
  if (!headerMatch?.[2]) return null;

  const filePath = headerMatch[2];
  const isNew = section.includes("new file mode");
  const isDeleted = section.includes("deleted file mode");
  const isRenamed = section.includes("rename from");

  const status = isNew ? "added" : isDeleted ? "deleted" : isRenamed ? "renamed" : "modified";

  let additions = 0;
  let deletions = 0;
  const addedLines: Array<{ line: number; content: string }> = [];
  let currentLine = 0;

  const lines = section.split("\n");
  for (const line of lines) {
    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunkMatch?.[1]) {
      currentLine = Number.parseInt(hunkMatch[1], 10);
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
      addedLines.push({ line: currentLine, content: line.slice(1) });
      currentLine++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    } else if (!line.startsWith("\\")) {
      currentLine++;
    }
  }

  return { filePath, status, additions, deletions, patch: section, addedLines };
}
