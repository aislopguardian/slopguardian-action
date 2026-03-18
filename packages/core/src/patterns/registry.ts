import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { type Result, err, ok } from "neverthrow";
import { type PatternFile, PatternFileSchema } from "../types/pattern.js";

export interface RegistryError {
  file: string;
  message: string;
}

export class PatternRegistry {
  private patterns: Map<string, PatternFile[]> = new Map();
  private errors: RegistryError[] = [];

  get loadErrors(): readonly RegistryError[] {
    return this.errors;
  }

  loadFromDirectory(patternsDir: string): Result<number, RegistryError> {
    if (!existsSync(patternsDir)) {
      return err({ file: patternsDir, message: "Patterns directory does not exist" });
    }

    let loadedCount = 0;
    const languageDirs = readdirSync(patternsDir, { withFileTypes: true });

    for (const langDir of languageDirs) {
      if (!langDir.isDirectory()) continue;
      const langPath = join(patternsDir, langDir.name);
      const yamlFiles = readdirSync(langPath).filter(
        (f: string) => f.endsWith(".yaml") || f.endsWith(".yml"),
      );

      for (const yamlFile of yamlFiles) {
        const filePath = join(langPath, yamlFile);
        const loadResult = this.loadPatternFile(filePath, langDir.name);
        if (loadResult.isOk()) loadedCount++;
      }
    }

    return ok(loadedCount);
  }

  private loadPatternFile(filePath: string, language: string): Result<PatternFile, RegistryError> {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = yaml.load(raw);
      const validated = PatternFileSchema.safeParse(parsed);

      if (!validated.success) {
        const registryError: RegistryError = {
          file: filePath,
          message: `Schema validation failed: ${validated.error.message}`,
        };
        this.errors.push(registryError);
        return err(registryError);
      }

      const patternFile = validated.data;
      const existing = this.patterns.get(language) ?? [];
      existing.push(patternFile);
      this.patterns.set(language, existing);

      return ok(patternFile);
    } catch (cause) {
      const registryError: RegistryError = {
        file: filePath,
        message: `Failed to load: ${cause instanceof Error ? cause.message : String(cause)}`,
      };
      this.errors.push(registryError);
      return err(registryError);
    }
  }

  getPatterns(language: string, category?: string): PatternFile[] {
    const langPatterns = this.patterns.get(language) ?? [];
    if (!category) return langPatterns;
    return langPatterns.filter((p) => p.category === category);
  }

  getAllPatterns(): PatternFile[] {
    const allPatterns: PatternFile[] = [];
    for (const patterns of this.patterns.values()) {
      allPatterns.push(...patterns);
    }
    return allPatterns;
  }

  getLanguages(): string[] {
    return Array.from(this.patterns.keys());
  }
}
