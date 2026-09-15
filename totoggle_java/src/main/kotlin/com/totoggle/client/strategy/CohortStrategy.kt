package com.totoggle.client.strategy

import com.totoggle.client.model.ActivationRule

/**
 * Activates whenever the app supplies a non-blank "cohort" context value — a presence check, not
 * a match against a named list (v2.6.4 — the prototype changed this from "a comma-separated
 * cohort/ring list" to a plain on/off condition: "No value needed, just turn it on for this
 * cohort"). `rule.value` carries no meaning for this type anymore and is deliberately never
 * read here — a rule created before v2.6.4 may still carry a legacy value like "canary,beta",
 * which stays inert rather than being compared against anything.
 */
class CohortStrategy : ActivationStrategy {
    override fun evaluate(rule: ActivationRule): Boolean = false
    override fun evaluate(rule: ActivationRule, contextValue: String?): Boolean =
        !contextValue.isNullOrBlank()
    override fun getRuleType(): String = ActivationRule.TYPE_COHORT
}
