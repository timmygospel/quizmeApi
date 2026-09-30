// What a participant is shown about their own result once a test is finished. Set per Assessment,
// so every Test Session delivering it follows the same rule.
//   NONE        — only that it was submitted (the trainer reviews results first)
//   PASS_FAIL   — passed or not, no score
//   SCORE       — score and pass/fail (the default)
//   FULL_REVIEW — score, pass/fail, and each question with their answer and the correct one
export const RESULT_VISIBILITIES = ["NONE", "PASS_FAIL", "SCORE", "FULL_REVIEW"] as const;
export type ResultVisibility = (typeof RESULT_VISIBILITIES)[number];
export const DEFAULT_RESULT_VISIBILITY: ResultVisibility = "SCORE";

export function isResultVisibility(value: unknown): value is ResultVisibility {
    return typeof value === "string" && (RESULT_VISIBILITIES as readonly string[]).includes(value);
}
