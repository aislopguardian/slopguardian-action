import { describe, expect, it } from "vitest";
import { StructuralDetector } from "../../src/detectors/structural.js";

describe("StructuralDetector", () => {
  const detector = new StructuralDetector(0.85);

  it("flags duplicate code blocks", async () => {
    const duplicatedBlock = [
      "function processItem(item: Item): Result {",
      "  const validated = schema.parse(item);",
      "  const transformed = transform(validated);",
      "  return saveToDatabase(transformed);",
      "}",
    ].join("\n");

    const content = `${duplicatedBlock}\n\n${duplicatedBlock.replace("processItem", "handleItem")}`;

    const result = await detector.analyze({
      content,
      filePath: "service.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const dupSignals = signals.filter((s) => s.message.includes("Duplicate"));
    expect(dupSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag distinct code blocks", async () => {
    const content = [
      "function loadConfig(path: string): Config {",
      "  const raw = readFileSync(path, 'utf-8');",
      "  return ConfigSchema.parse(yaml.load(raw));",
      "}",
      "",
      "function scoreSignals(signals: Signal[]): number {",
      "  return signals.reduce((sum, s) => sum + s.score * s.weight, 0);",
      "}",
    ].join("\n");

    const result = await detector.analyze({
      content,
      filePath: "utils.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals.length).toBe(0);
  });

  it("handles empty input", async () => {
    const result = await detector.analyze({
      content: "",
      filePath: "empty.ts",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().length).toBe(0);
  });

  it("handles single-line file", async () => {
    const result = await detector.analyze({
      content: "export const VERSION = '0.1.0';",
      filePath: "version.ts",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().length).toBe(0);
  });
});
