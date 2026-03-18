import { existsSync, readFileSync } from "node:fs";
import * as yaml from "js-yaml";
import { err, ok, type Result } from "neverthrow";
import { type SlopGuardianConfig, SlopGuardianConfigSchema } from "../types/config.js";
import { DEFAULT_CONFIG } from "./defaults.js";

export interface ConfigError {
  file: string;
  message: string;
}

export function loadConfig(configPath: string): Result<SlopGuardianConfig, ConfigError> {
  if (!existsSync(configPath)) {
    return ok(DEFAULT_CONFIG);
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = yaml.load(raw);
    const validated = SlopGuardianConfigSchema.safeParse(parsed);

    if (!validated.success) {
      return err({
        file: configPath,
        message: `Config validation failed: ${validated.error.message}`,
      });
    }

    return ok(validated.data);
  } catch (cause) {
    return err({
      file: configPath,
      message: `Failed to read config: ${cause instanceof Error ? cause.message : String(cause)}`,
    });
  }
}
