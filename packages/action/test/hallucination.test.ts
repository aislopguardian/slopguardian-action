import { describe, expect, it } from "vitest";
import {
  extractStackTraceRefs,
  type FileVerifier,
  verifyStackTraces,
} from "../src/hallucination.js";

describe("extractStackTraceRefs", () => {
  it("extracts Node.js stack trace format with function and file:line", () => {
    const body = `Error: something broke
    at processRequest (src/server.ts:42)
    at handleRoute (src/router.ts:18)`;

    const refs = extractStackTraceRefs(body);

    expect(refs.length).toBe(2);
    expect(refs[0]).toEqual({
      function: "processRequest",
      file: "src/server.ts",
      line: 42,
    });
    expect(refs[1]).toEqual({
      function: "handleRoute",
      file: "src/router.ts",
      line: 18,
    });
  });

  it("extracts Node.js stack trace without function name", () => {
    const body = `Error: crash
    at src/index.ts:7`;

    const refs = extractStackTraceRefs(body);

    expect(refs.length).toBe(1);
    expect(refs[0]).toEqual({
      function: undefined,
      file: "src/index.ts",
      line: 7,
    });
  });

  it("extracts Python stack trace format with function name", () => {
    const body = `Traceback (most recent call last):
  File "app/models.py", line 42, in validate
    raise ValueError("bad input")`;

    const refs = extractStackTraceRefs(body);

    expect(refs.length).toBe(1);
    expect(refs[0]).toEqual({
      file: "app/models.py",
      line: 42,
      function: "validate",
    });
  });

  it("extracts Python stack trace format without function name", () => {
    const body = `  File "main.py", line 1`;

    const refs = extractStackTraceRefs(body);

    expect(refs.length).toBe(1);
    expect(refs[0]).toEqual({
      file: "main.py",
      line: 1,
      function: undefined,
    });
  });

  it("extracts file:line:col format", () => {
    const body = `src/parser.ts:99:12 - error TS2322: Type 'string' is not assignable.`;

    const refs = extractStackTraceRefs(body);

    const fileLineRef = refs.find((r) => r.file === "src/parser.ts" && r.line === 99);
    expect(fileLineRef).toBeDefined();
    expect(fileLineRef?.file).toBe("src/parser.ts");
    expect(fileLineRef?.line).toBe(99);
  });

  it("deduplicates identical references", () => {
    const body = `    at doWork (lib/worker.ts:10)
    at doWork (lib/worker.ts:10)
    at doWork (lib/worker.ts:10)`;

    const refs = extractStackTraceRefs(body);

    expect(refs.length).toBe(1);
    expect(refs[0]?.file).toBe("lib/worker.ts");
  });

  it("returns empty array for text with no stack traces", () => {
    const body = `This is a normal issue description.
It mentions files like README.md but has no stack traces.
No colons with line numbers here.`;

    const refs = extractStackTraceRefs(body);

    expect(refs).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    const refs = extractStackTraceRefs("");

    expect(refs).toEqual([]);
  });

  it("handles multiple formats in the same body", () => {
    const body = `Node error:
    at handler (src/api.ts:55)

Python traceback:
  File "scripts/deploy.py", line 12, in main

TypeScript diagnostic:
src/config.ts:3:1`;

    const refs = extractStackTraceRefs(body);

    const files = refs.map((r) => r.file);
    expect(files).toContain("src/api.ts");
    expect(files).toContain("scripts/deploy.py");
    expect(files).toContain("src/config.ts");
    expect(refs.length).toBeGreaterThanOrEqual(3);
  });

  it("handles file paths with dots and hyphens", () => {
    const body = "    at parse (utils/my-parser.config.ts:7)";

    const refs = extractStackTraceRefs(body);

    expect(refs.length).toBe(1);
    expect(refs[0]?.file).toBe("utils/my-parser.config.ts");
  });

  it("recognizes multiple supported extensions", () => {
    const body = `    at fnA (lib/code.js:1)
    at fnB (lib/code.py:2)
    at fnC (lib/code.go:3)
    at fnD (lib/code.rs:4)
    at fnE (lib/code.java:5)`;

    const refs = extractStackTraceRefs(body);

    expect(refs.length).toBe(5);
    const extensions = refs.map((r) => r.file.split(".").pop());
    expect(extensions).toEqual(["js", "py", "go", "rs", "java"]);
  });
});

describe("verifyStackTraces", () => {
  function createVerifier(overrides: Partial<FileVerifier> = {}): FileVerifier {
    return {
      fileExists: overrides.fileExists ?? (async () => true),
      fileLineCount: overrides.fileLineCount ?? (async () => 500),
      fileContains: overrides.fileContains ?? (async () => true),
    };
  }

  it("returns file-not-found signal with score 5 when file does not exist", async () => {
    const verifier = createVerifier({
      fileExists: async () => false,
    });

    const signals = await verifyStackTraces(
      [{ file: "src/ghost.ts", line: 10, function: "phantom" }],
      verifier,
    );

    expect(signals.length).toBe(1);
    expect(signals[0]?.score).toBe(5);
    expect(signals[0]?.detectorId).toBe("hallucination");
    expect(signals[0]?.message).toContain("src/ghost.ts");
    expect(signals[0]?.message).toContain("does not exist");
  });

  it("returns function-not-found signal with score 5 when function missing from file", async () => {
    const verifier = createVerifier({
      fileExists: async () => true,
      fileContains: async () => false,
    });

    const signals = await verifyStackTraces(
      [{ file: "src/handler.ts", function: "nonExistentFn" }],
      verifier,
    );

    expect(signals.length).toBe(1);
    expect(signals[0]?.score).toBe(5);
    expect(signals[0]?.message).toContain("nonExistentFn");
    expect(signals[0]?.message).toContain("not found");
  });

  it("returns line-exceeded signal with score 4 when line exceeds file length", async () => {
    const verifier = createVerifier({
      fileExists: async () => true,
      fileLineCount: async () => 50,
    });

    const signals = await verifyStackTraces([{ file: "src/small.ts", line: 999 }], verifier);

    expect(signals.length).toBe(1);
    expect(signals[0]?.score).toBe(4);
    expect(signals[0]?.message).toContain("999");
    expect(signals[0]?.message).toContain("50");
  });

  it("returns no signals when file, function, and line all check out", async () => {
    const verifier = createVerifier({
      fileExists: async () => true,
      fileContains: async () => true,
      fileLineCount: async () => 200,
    });

    const signals = await verifyStackTraces(
      [{ file: "src/valid.ts", line: 42, function: "realFunction" }],
      verifier,
    );

    expect(signals).toEqual([]);
  });

  it("skips function and line checks when file does not exist", async () => {
    let fileContainsCalled = false;
    let fileLineCountCalled = false;

    const verifier = createVerifier({
      fileExists: async () => false,
      fileContains: async () => {
        fileContainsCalled = true;
        return false;
      },
      fileLineCount: async () => {
        fileLineCountCalled = true;
        return null;
      },
    });

    const signals = await verifyStackTraces(
      [{ file: "src/missing.ts", line: 10, function: "fn" }],
      verifier,
    );

    expect(signals.length).toBe(1);
    expect(fileContainsCalled).toBe(false);
    expect(fileLineCountCalled).toBe(false);
  });

  it("returns empty array for empty refs input", async () => {
    const verifier = createVerifier();

    const signals = await verifyStackTraces([], verifier);

    expect(signals).toEqual([]);
  });

  it("accumulates signals from multiple failing refs", async () => {
    const existingFiles = new Set(["src/real.ts"]);
    const verifier = createVerifier({
      fileExists: async (path) => existingFiles.has(path),
      fileContains: async () => false,
      fileLineCount: async () => 10,
    });

    const signals = await verifyStackTraces(
      [
        { file: "src/fake.ts", line: 5 },
        { file: "src/real.ts", function: "ghostFn", line: 999 },
      ],
      verifier,
    );

    const fileNotFound = signals.filter((s) => s.message.includes("does not exist"));
    const fnNotFound = signals.filter((s) => s.message.includes("not found"));
    const lineExceeded = signals.filter((s) => s.message.includes("exceeds"));

    expect(fileNotFound.length).toBe(1);
    expect(fnNotFound.length).toBe(1);
    expect(lineExceeded.length).toBe(1);
    expect(signals.length).toBe(3);
  });

  it("does not flag line number when fileLineCount returns null", async () => {
    const verifier = createVerifier({
      fileExists: async () => true,
      fileLineCount: async () => null,
    });

    const signals = await verifyStackTraces(
      [{ file: "src/unknown-length.ts", line: 99999 }],
      verifier,
    );

    expect(signals).toEqual([]);
  });

  it("does not check function when ref has no function field", async () => {
    let fileContainsCalled = false;
    const verifier = createVerifier({
      fileExists: async () => true,
      fileContains: async () => {
        fileContainsCalled = true;
        return false;
      },
      fileLineCount: async () => 100,
    });

    const signals = await verifyStackTraces([{ file: "src/app.ts", line: 5 }], verifier);

    expect(signals).toEqual([]);
    expect(fileContainsCalled).toBe(false);
  });

  it("does not check line when ref has no line field", async () => {
    let fileLineCountCalled = false;
    const verifier = createVerifier({
      fileExists: async () => true,
      fileLineCount: async () => {
        fileLineCountCalled = true;
        return 10;
      },
    });

    const signals = await verifyStackTraces(
      [{ file: "src/app.ts", function: "handler" }],
      verifier,
    );

    expect(signals).toEqual([]);
    expect(fileLineCountCalled).toBe(false);
  });

  it("all signals have category consistency and severity error", async () => {
    const verifier = createVerifier({
      fileExists: async () => false,
    });

    const signals = await verifyStackTraces([{ file: "a.ts" }, { file: "b.ts" }], verifier);

    for (const signal of signals) {
      expect(signal.category).toBe("consistency");
      expect(signal.severity).toBe("error");
    }
  });
});
