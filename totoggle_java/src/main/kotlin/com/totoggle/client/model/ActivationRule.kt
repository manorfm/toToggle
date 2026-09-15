package com.totoggle.client.model

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.JsonNode

/**
 * Represents an activation rule for a toggle.
 * Activation rules determine additional conditions that must be met
 * for a toggle to be considered active beyond just being enabled.
 * 
 * @property type The type of activation rule (e.g., "percentage", "parameter", "user_id")
 * @property value The value/configuration for the rule (e.g., "25" for percentage, "premium" for a parameter match). Unused for "cohort" (v2.6.4 — see [isValid]).
 */
data class ActivationRule(
    @JsonProperty("type")
    val type: String,

    @JsonProperty("value")
    val value: String,

    @JsonProperty("config")
    val config: JsonNode? = null
) {

    companion object {
        const val TYPE_PERCENTAGE = "percentage"
        // TYPE_PARAMETER era TYPE_ATTRIBUTE ("attribute") até o protótipo v2.6.4 renomear o tipo
        // de regra em si (não só o rótulo de UI) — ver server/internal/app/domain/entity/
        // activation_rule.go#ActivationRuleTypeParameter e docs/rest-flow.md.
        const val TYPE_PARAMETER = "parameter"
        const val TYPE_USER_ID = "user_id"
        const val TYPE_IP = "ip"
        const val TYPE_COUNTRY = "country"
        const val TYPE_TIME = "time"
        const val TYPE_COHORT = "cohort"

        /**
         * Creates an empty activation rule (no rule applied).
         */
        fun empty(): ActivationRule = ActivationRule("", "")
    }

    /**
     * Checks if this rule is empty (no activation rule configured).
     */
    fun isEmpty(): Boolean = type.isBlank() && value.isBlank()

    /**
     * Checks if this rule is valid (has a type, and a value — except "cohort", which stopped
     * using `value` entirely in v2.6.4: it now activates on mere presence of a resolved context
     * value, so a blank `value` is the normal, valid case for that one type).
     */
    fun isValid(): Boolean = type.isNotBlank() && (value.isNotBlank() || type == TYPE_COHORT)

    /**
     * Verifies the canonical type/context-key relationship before SDK code consults a request
     * resolver. The fetched catalogue is treated as untrusted input and invalid pairs fail
     * closed locally even though the server validates them when a rule is saved.
     */
    fun hasCanonicalContextKey(): Boolean {
        if (type == TYPE_TIME) return config == null || config.isNull
        val key = config?.get("context_key")?.takeIf { it.isTextual }?.asText()
            ?.takeIf { it.isNotBlank() } ?: return false
        if (key.startsWith("attributes.")) {
            return key.removePrefix("attributes.").isNotEmpty() &&
                (type == TYPE_PERCENTAGE || type == TYPE_PARAMETER)
        }
        return (type == TYPE_PERCENTAGE && key == "rollout_key") ||
            (type == TYPE_USER_ID && key == "user_id") ||
            (type == TYPE_IP && key == "ip") ||
            (type == TYPE_COUNTRY && key == "country") ||
            (type == TYPE_COHORT && key == "cohort")
    }
}
