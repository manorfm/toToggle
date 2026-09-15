package strategy

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/manorfm/toToggle/totoggle_go/internal/toggle"
)

func TestPresenceEvaluator_NoKeyNeverMatches(t *testing.T) {
	e := PresenceEvaluator{}
	rule := toggle.ActivationRule{Type: toggle.RuleTypeCohort, Value: ""}

	assert.False(t, e.Evaluate(rule, "", false))
}

func TestPresenceEvaluator_EmptyKeyNeverMatches(t *testing.T) {
	e := PresenceEvaluator{}
	rule := toggle.ActivationRule{Type: toggle.RuleTypeCohort}

	assert.False(t, e.Evaluate(rule, "", true))
}

func TestPresenceEvaluator_WhitespaceOnlyKeyNeverMatchesAfterTrim(t *testing.T) {
	e := PresenceEvaluator{}
	rule := toggle.ActivationRule{Type: toggle.RuleTypeCohort}

	assert.False(t, e.Evaluate(rule, "   ", true))
}

func TestPresenceEvaluator_AnyNonEmptyKeyMatches_RegardlessOfRuleValue(t *testing.T) {
	e := PresenceEvaluator{}

	// rule.Value is never consulted — presence-only, unlike MatchListEvaluator. Confirmed with a
	// legacy pre-v2.6.4 comma-list value, an empty value, and a value that would never appear in
	// the "internal" key below, all matching identically.
	for _, value := range []string{"", "canary,beta", "some-unrelated-value"} {
		rule := toggle.ActivationRule{Type: toggle.RuleTypeCohort, Value: value}
		assert.True(t, e.Evaluate(rule, "internal", true), "value=%q", value)
	}
}
