import * as core from "@actions/core";
import type { Verdict } from "@slopguardian/core";

export interface ActionOutputs {
  verdict: Verdict;
  score: number;
  signalCount: number;
  report: string;
}

export function setActionOutputs(outputs: ActionOutputs): void {
  core.setOutput("verdict", outputs.verdict);
  core.setOutput("score", outputs.score.toString());
  core.setOutput("signal-count", outputs.signalCount.toString());
  core.setOutput("report", outputs.report);
}
