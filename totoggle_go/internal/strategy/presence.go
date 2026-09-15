package strategy

import (
	"strings"

	"github.com/manorfm/toToggle/totoggle_go/internal/toggle"
)

// PresenceEvaluator implements cohort's v2.6.4 semantics: the rule activates whenever the
// resolved context value for its context_key ("cohort") is present and non-empty — the app
// decides membership entirely by whether (and for whom) it sends a cohort value at all.
// rule.Value is never read: unlike every other rule type, cohort no longer compares against a
// configured list. A rule saved before v2.6.4 may still carry a legacy comma-separated Value
// (e.g. "canary,beta") — it stays in storage but is inert here, never consulted.
type PresenceEvaluator struct{}

// Evaluate reports whether key is present and non-blank (after trimming). No key, or a
// whitespace-only key, never matches.
func (PresenceEvaluator) Evaluate(_ toggle.ActivationRule, key string, hasKey bool) bool {
	return hasKey && strings.TrimSpace(key) != ""
}
