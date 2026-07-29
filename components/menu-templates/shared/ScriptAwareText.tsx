import type { ReactNode } from "react";

type ScriptRunKind = "ko" | "en";

type ScriptRun = {
  kind: ScriptRunKind;
  text: string;
};

const LATIN_NUMBER_RE = /[A-Za-z0-9]/;
const CJK_RE = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF]/;

function getScriptRunKind(character: string): ScriptRunKind | null {
  if (LATIN_NUMBER_RE.test(character)) return "en";
  if (CJK_RE.test(character)) return "ko";
  return null;
}

export function splitScriptRuns(value: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  let currentKind: ScriptRunKind | null = null;

  Array.from(value).forEach((character) => {
    const detectedKind = getScriptRunKind(character);
    const nextKind = detectedKind ?? currentKind ?? "ko";
    const lastRun = runs[runs.length - 1];

    if (lastRun && lastRun.kind === nextKind) {
      lastRun.text += character;
    } else {
      runs.push({ kind: nextKind, text: character });
    }

    currentKind = nextKind;
  });

  return runs;
}

export default function ScriptAwareText({ text }: { text: string }): ReactNode {
  if (!text) return text;

  return splitScriptRuns(text).map((run, index) => (
    <span key={`${run.kind}-${index}`} className={`cafe-a-script-${run.kind}`}>
      {run.text}
    </span>
  ));
}
