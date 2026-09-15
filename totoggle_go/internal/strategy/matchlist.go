package strategy

import (
	"strings"

	"github.com/manorfm/toToggle/totoggle_go/internal/toggle"
)

// MatchListEvaluator implements the "comma-separated allowlist, exact trimmed match" shape
// shared by three otherwise-identical rule types (parameter, user_id, country). One
// implementation registered under all three types, instead of three copies of the same logic.
// Cohort used to share this evaluator too, but v2.6.4 changed its semantics to a presence check
// instead of a list match — see PresenceEvaluator in presence.go.
type MatchListEvaluator struct{}

// Evaluate reports whether key exactly matches one entry of rule.Value's comma-separated list,
// after trimming whitespace around each entry. No key, or a blank rule value, never matches.
func (MatchListEvaluator) Evaluate(rule toggle.ActivationRule, key string, hasKey bool) bool {
	if !hasKey {
		return false
	}
	if strings.TrimSpace(rule.Value) == "" {
		return false
	}
	for _, entry := range strings.Split(rule.Value, ",") {
		if strings.TrimSpace(entry) == key {
			return true
		}
	}
	return false
}
