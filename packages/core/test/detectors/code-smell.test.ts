import { describe, expect, it } from "vitest";
import { CodeSmellDetector } from "../../src/detectors/code-smell.js";

describe("CodeSmellDetector", () => {
  const detector = new CodeSmellDetector(0.4, true);

  it("flags high comment-to-code ratio", async () => {
    const content = [
      "// Set up the module",
      "// Import the config",
      "// Define the interface",
      "// Create the function",
      "// Handle the response",
      "// Return the value",
      "// Check the status",
      "// Process the data",
      "const x = 1;",
      "const y = 2;",
    ].join("\n");

    const result = await detector.analyze({
      content,
      filePath: "overcommented.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const ratioSignal = signals.find((s) => s.message.includes("Comment-to-code ratio"));
    expect(ratioSignal).toBeDefined();
  });

  it("flags restating comments", async () => {
    const content = [
      "// get the user name from the database",
      "const userName = getUserNameFromDatabase();",
      "// load config from file path",
      "const config = loadConfigFromFilePath();",
    ].join("\n");

    const result = await detector.analyze({
      content,
      filePath: "restating.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const restating = signals.filter((s) => s.message.includes("restates"));
    expect(restating.length).toBeGreaterThanOrEqual(1);
  });

  it("flags generic variable names", async () => {
    const content = [
      "const data = fetchUsers();",
      "const result = transform(data);",
      "const temp = result.filter(Boolean);",
      "const value = temp[0];",
    ].join("\n");

    const result = await detector.analyze({
      content,
      filePath: "generic-names.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const genericSignals = signals.filter((s) => s.message.includes("Generic variable name"));
    expect(genericSignals.length).toBeGreaterThanOrEqual(3);
  });

  it("does not flag domain-specific variable names", async () => {
    const content = [
      "const userScore = calculateScore(signals);",
      "const configPath = join(rootDir, '.slopguardian.yml');",
      "const patternFiles = loadPatterns(patternsDir);",
    ].join("\n");

    const result = await detector.analyze({
      content,
      filePath: "clean-names.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const genericSignals = signals.filter((s) => s.message.includes("Generic variable name"));
    expect(genericSignals.length).toBe(0);
  });

  it("skips non-code files", async () => {
    const result = await detector.analyze({
      content: "const data = 'this is markdown talking about data';",
      filePath: "notes.md",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().length).toBe(0);
  });

  it("flags unused imports", async () => {
    const content = [
      'import { readFileSync, writeFileSync } from "node:fs";',
      'import { join } from "node:path";',
      "",
      "const configPath = join('/etc', 'config.yml');",
      "const raw = readFileSync(configPath, 'utf-8');",
    ].join("\n");

    const result = await detector.analyze({
      content,
      filePath: "imports.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const unusedImport = signals.find((s) => s.message.includes("writeFileSync"));
    expect(unusedImport).toBeDefined();
  });
});
