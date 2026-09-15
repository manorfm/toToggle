package com.totoggle.client.model

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ActivationRuleTest {
    
    @Test
    fun `should create empty rule correctly`() {
        val rule = ActivationRule.empty()
        
        assertThat(rule.type).isEmpty()
        assertThat(rule.value).isEmpty()
        assertThat(rule.isEmpty()).isTrue()
        assertThat(rule.isValid()).isFalse()
    }
    
    @Test
    fun `should validate rule correctly`() {
        val validRule = ActivationRule("percentage", "25")
        val invalidRule1 = ActivationRule("", "25")
        val invalidRule2 = ActivationRule("percentage", "")
        val emptyRule = ActivationRule("", "")
        
        assertThat(validRule.isValid()).isTrue()
        assertThat(validRule.isEmpty()).isFalse()
        
        assertThat(invalidRule1.isValid()).isFalse()
        assertThat(invalidRule1.isEmpty()).isFalse()
        
        assertThat(invalidRule2.isValid()).isFalse()
        assertThat(invalidRule2.isEmpty()).isFalse()
        
        assertThat(emptyRule.isValid()).isFalse()
        assertThat(emptyRule.isEmpty()).isTrue()
    }
    
    @Test
    fun `should have correct rule type constants`() {
        // Matches server/internal/app/domain/entity/activation_rule.go's ActivationRuleType
        // constants exactly (the server is the source of truth for what these strings are).
        assertThat(ActivationRule.TYPE_PERCENTAGE).isEqualTo("percentage")
        assertThat(ActivationRule.TYPE_PARAMETER).isEqualTo("parameter")
        assertThat(ActivationRule.TYPE_USER_ID).isEqualTo("user_id")
        assertThat(ActivationRule.TYPE_IP).isEqualTo("ip")
        assertThat(ActivationRule.TYPE_COUNTRY).isEqualTo("country")
        assertThat(ActivationRule.TYPE_TIME).isEqualTo("time")
        assertThat(ActivationRule.TYPE_COHORT).isEqualTo("cohort")
    }

    @Test
    fun `cohort rule with a blank value is valid (v2_6_4 - cohort no longer uses value)`() {
        val cohortNoValue = ActivationRule(ActivationRule.TYPE_COHORT, "")
        val cohortLegacyValue = ActivationRule(ActivationRule.TYPE_COHORT, "canary,beta")
        val cohortNoType = ActivationRule("", "")

        assertThat(cohortNoValue.isValid()).isTrue()
        assertThat(cohortNoValue.isEmpty()).isFalse()

        // A rule created before v2.6.4 may still carry a legacy value — still valid, the value
        // is just never read anymore (see CohortStrategy).
        assertThat(cohortLegacyValue.isValid()).isTrue()

        // A blank type is still invalid regardless of type — "cohort" alone isn't a magic bypass
        // for a genuinely empty rule.
        assertThat(cohortNoType.isValid()).isFalse()
    }
}
