import { describe, expect, it } from "vitest";
import type { ActivationRule } from "../toggle/rule.js";
import { PresenceEvaluator } from "./presence.js";

// v2.6.4: cohort stopped comparing `value` against anything — it's a presence check on the
// resolved context value now. `rule.value` is never read by this evaluator, on purpose.
describe("PresenceEvaluator", () => {
  const evaluator = new PresenceEvaluator();
  const rule: ActivationRule = { type: "cohort", value: "" };

  it("never matches with no key at all", () => {
    expect(evaluator.evaluate(rule, undefined)).toBe(false);
  });

  it("never matches an empty-string key", () => {
    expect(evaluator.evaluate(rule, "")).toBe(false);
  });

  it("never matches a whitespace-only key", () => {
    expect(evaluator.evaluate(rule, "   ")).toBe(false);
  });

  it("matches any non-blank key, regardless of content", () => {
    expect(evaluator.evaluate(rule, "internal")).toBe(true);
    expect(evaluator.evaluate(rule, "anything-not-on-any-list")).toBe(true);
  });

  it("ignores rule.value entirely, even a legacy comma-separated one", () => {
    const legacyRule: ActivationRule = { type: "cohort", value: "canary,beta" };
    expect(evaluator.evaluate(legacyRule, "internal")).toBe(true);
    expect(evaluator.evaluate(legacyRule, "not-canary-or-beta")).toBe(true);
  });
});
