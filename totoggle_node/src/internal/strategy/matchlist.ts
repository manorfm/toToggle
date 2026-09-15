import type { ActivationRule } from "../toggle/rule.js";
import type { Evaluator } from "./strategy.js";

/**
 * Implements the "comma-separated allowlist, exact trimmed match" shape shared by three
 * otherwise-identical rule types (parameter, user_id, country). One implementation registered
 * under all three types, instead of three copies of the same logic.
 *
 * "cohort" used to be a fourth member of this group but stopped comparing `value` in v2.6.4 —
 * see PresenceEvaluator instead.
 */
export class MatchListEvaluator implements Evaluator {
  evaluate(rule: ActivationRule, key: string | undefined): boolean {
    if (key === undefined) {
      return false;
    }
    if (rule.value.trim() === "") {
      return false;
    }
    return rule.value.split(",").some((entry) => entry.trim() === key);
  }
}
