package com.totoggle.client.strategy

import com.totoggle.client.model.ActivationRule
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CohortStrategyTest {

    private val strategy = CohortStrategy()

    @Test
    fun `should return correct rule type`() {
        assertThat(strategy.getRuleType()).isEqualTo("cohort")
    }

    // v2.6.4: cohort stopped comparing `value` against a list — it's a presence check on the
    // resolved context value now. `rule.value` is irrelevant to evaluation (see tests below that
    // deliberately vary it while asserting the same outcome).

    @Test
    fun `should return false when no cohort identifier provided`() {
        val rule = ActivationRule("cohort", "")

        assertThat(strategy.evaluate(rule)).isFalse()
        assertThat(strategy.evaluate(rule, null)).isFalse()
    }

    @Test
    fun `should return false when the resolved context value is blank`() {
        val rule = ActivationRule("cohort", "")

        assertThat(strategy.evaluate(rule, "")).isFalse()
        assertThat(strategy.evaluate(rule, "   ")).isFalse()
    }

    @Test
    fun `should activate on any non-blank context value, ignoring rule value content`() {
        val rule = ActivationRule("cohort", "")

        assertThat(strategy.evaluate(rule, "internal")).isTrue()
        assertThat(strategy.evaluate(rule, "some-label-not-in-any-list")).isTrue()
    }

    @Test
    fun `should activate regardless of a legacy comma-separated rule value from before v2_6_4`() {
        val rule = ActivationRule("cohort", "canary,beta")

        assertThat(strategy.evaluate(rule, "stable")).isTrue() // not in the legacy list, still activates
        assertThat(strategy.evaluate(rule, "anything")).isTrue()
        assertThat(strategy.evaluate(rule, "")).isFalse() // still fails closed on no context value
    }
}
