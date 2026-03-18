import * as core from "@actions/core";
import type { Signal } from "@slopguardian/core";

export function emitAnnotations(signals: Signal[]): void {
  for (const signal of signals) {
    const properties: core.AnnotationProperties = {};

    if (signal.file) properties.file = signal.file;
    if (signal.line) properties.startLine = signal.line;

    const annotationMessage = signal.suggestion
      ? `${signal.message} — ${signal.suggestion}`
      : signal.message;

    switch (signal.severity) {
      case "error":
        core.error(annotationMessage, properties);
        break;
      case "warning":
        core.warning(annotationMessage, properties);
        break;
      case "info":
        core.notice(annotationMessage, properties);
        break;
    }
  }
}
