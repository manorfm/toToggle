package com.totoggle.client.strategy

/**
 * Shared matching logic for rule types whose value is a comma-separated allowlist checked for
 * an exact (case-sensitive, trimmed) match against a caller-supplied context value.
 *
 * Parameter, user ID, and country rules share this exact shape. Cohort used to as well, but
 * v2.6.4 turned it into a plain presence check (see [CohortStrategy]) — it no longer calls this.
 */
internal fun matchesCommaSeparatedList(ruleValue: String, candidate: String?): Boolean {
    if (candidate == null) return false
    if (ruleValue.isBlank()) return false
    return ruleValue.split(",").map { it.trim() }.any { it == candidate }
}
