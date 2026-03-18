import { describe, expect, it } from "vitest";
import { parseDiff } from "../src/diff-parser.js";

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
new file mode 100644
--- /dev/null
+++ b/src/index.ts
@@ -0,0 +1,5 @@
+import { run } from "./main.js";
+
+run();
+
+export {};
diff --git a/src/main.ts b/src/main.ts
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,5 @@
-export function run() {
+export function run(): void {
+  console.log("started");
   // old code
+  console.log("done");
 }`;

describe("parseDiff", () => {
  it("parses multiple files from a diff", () => {
    const files = parseDiff(SAMPLE_DIFF);

    expect(files.length).toBe(2);
    expect(files[0]?.filePath).toBe("src/index.ts");
    expect(files[1]?.filePath).toBe("src/main.ts");
  });

  it("detects new files", () => {
    const files = parseDiff(SAMPLE_DIFF);
    expect(files[0]?.status).toBe("added");
  });

  it("detects modified files", () => {
    const files = parseDiff(SAMPLE_DIFF);
    expect(files[1]?.status).toBe("modified");
  });

  it("counts additions and deletions", () => {
    const files = parseDiff(SAMPLE_DIFF);
    const mainTs = files[1];

    expect(mainTs?.additions).toBe(3);
    expect(mainTs?.deletions).toBe(1);
  });

  it("extracts added line content", () => {
    const files = parseDiff(SAMPLE_DIFF);
    const indexTs = files[0];

    expect(indexTs?.addedLines.length).toBe(5);
    expect(indexTs?.addedLines[0]?.content).toBe('import { run } from "./main.js";');
  });

  it("tracks line numbers for added lines", () => {
    const files = parseDiff(SAMPLE_DIFF);
    const indexTs = files[0];

    expect(indexTs?.addedLines[0]?.line).toBe(1);
    expect(indexTs?.addedLines[1]?.line).toBe(2);
  });

  it("handles empty diff", () => {
    const files = parseDiff("");
    expect(files.length).toBe(0);
  });
});
