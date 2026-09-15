import type { ActivationRule } from "../toggle/rule.js";
import type { Evaluator } from "./strategy.js";

/**
 * Implements "cohort" (v2.6.4): the rule no longer compares `rule.value` against anything — it
 * activates whenever the resolved context value for its context key ("cohort", fixed) is present
 * and non-blank. Membership is entirely up to the calling application (whatever it chooses to
 * send, or not send, as the cohort context value); toToggle never inspects the content. A legacy
 * `rule.value` left over from a pre-v2.6.4 comma-separated cohort rule is ignored, not read.
 */
export class PresenceEvaluator implements Evaluator {
  evaluate(_rule: ActivationRule, key: string | undefined): boolean {
    return key !== undefined && key.trim() !== "";
  }
}
