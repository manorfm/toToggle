import type { IconName } from "../components/Icon";
import type { ActivationRuleType, ToggleDetail } from "../types/toggle";

export interface RuleTypeMeta {
  type: ActivationRuleType;
  name: string;
  description: string;
  // v2.6.4 — texto novo (get_component_data("EditDrawer")), mostrado acima do campo de valor
  // assim que o tipo é selecionado. Não existia antes desta versão do protótipo.
  explain: string;
  icon: IconName;
  // Ausente só para "cohort" (v2.6.4 — deixou de ter campo de valor, ver hasValueField abaixo).
  placeholder?: string;
  hint: string;
  contextKey?: string;
  contextKeyEditable?: boolean;
  // Placeholder/hint do campo Context key quando editável — por tipo, confirmados via
  // get_component_data("EditDrawer") (antes deste arquivo, um texto genérico único cobria todos
  // os tipos editáveis).
  contextKeyPlaceholder?: string;
  contextKeyHint?: string;
}

// v2.6.4 — cohort deixou de pedir um valor ("No value needed, just turn it on for this cohort",
// confirmado no EditDrawer real): a regra passa a ativar sob presença de um valor não vazio no
// context_key "cohort", não mais por comparação contra uma lista. Único tipo sem campo de valor.
export function hasValueField(type: ActivationRuleType): boolean {
  return type !== "cohort";
}

// name/description/icon confirmados 1:1 contra o RULE_TYPES real do protótipo v2.6.4
// (get_component_data("EditDrawer")) — `explain` é campo novo desta versão, também confirmado.
// `hint` continua sendo uma divergência DELIBERADA do protótipo (2026-09-11, a pedido explícito
// do usuário): o texto curto do protótipo ("Comma-separated user IDs.") não explica o EFEITO
// prático da regra — cada hint aqui nomeia explicitamente o que fica "true" (ativo) vs "false"
// (inativo). Descrição do backend em `entity.ActivationRule.ValidateRule`/`server/CLAUDE.md`;
// este arquivo é só orientação de UI, nunca a fonte de validação.
export const RULE_TYPES: RuleTypeMeta[] = [
  {
    type: "percentage",
    name: "Percentage",
    description: "Activate for X% of traffic",
    explain: "Gradual rollout: this % of traffic sees it on, chosen automatically and consistently per user.",
    icon: "percent",
    placeholder: "e.g. 25",
    hint: "Not a global on/off — each person is hashed into a bucket from their rollout key. Below 25% of the bucket range: enabled (true) for that person, every time. At or above it: disabled (false). Requires the SDK to supply a stable identity (e.g. user ID), or it fails closed.",
    contextKey: "rollout_key",
    contextKeyEditable: true,
    contextKeyPlaceholder: "rollout_key",
    contextKeyHint: "Field your app sends per user so the same user always lands in the same bucket. Use rollout_key, or attributes.<name> for a specific attribute.",
  },
  {
    // v2.6.4 — o protótipo renomeou o tipo em si de "attribute" pra "parameter" (não só o
    // rótulo de UI — confirmado literalmente em get_component_data("EditDrawer"), `"type":
    // "parameter"`). Breaking change deliberado, decidido com o usuário: o backend
    // (entity.ActivationRuleTypeParameter) e os 3 SDKs também renomearam.
    type: "parameter",
    name: "Parameter",
    description: "Match a context value",
    explain: "Targets a segment your app already sends, e.g. plan tier or client type.",
    icon: "sliders",
    placeholder: "premium,enterprise",
    hint: "Enabled (true) only when the named attribute your app sends (e.g. a plan or feature flag of your own) matches one of these comma-separated values. Everyone else: disabled (false).",
    // v2.6.4 — default do context key mudou de "attributes." (prefixo pré-preenchido) pra vazio;
    // o placeholder agora é só um exemplo ("attributes.plan_tier"), não um prefixo a completar.
    contextKey: "",
    contextKeyEditable: true,
    contextKeyPlaceholder: "attributes.plan_tier",
    contextKeyHint: "Field your app sends with the value to match. Must exist in your SDK's context.",
  },
  {
    type: "user_id",
    name: "User ID",
    description: "Specific users",
    explain: "Test with a specific list of users before a wider rollout.",
    icon: "user",
    placeholder: "12,48,103",
    hint: "Enabled (true) only for the exact user IDs listed here, comma-separated. Everyone else: disabled (false). Use this for targeting named individuals, not a percentage or a group.",
    contextKey: "user_id",
  },
  {
    type: "cohort",
    name: "Cohort",
    description: "Named user group",
    explain: "Activates only for a specific cohort, a group of users your application tags with a shared label, e.g. internal or early-access.",
    // v2.6.4 — ícone confirmado mudou de "rocket" pra "users" (get_component_data).
    icon: "users",
    // v2.6.4 — sem campo de valor (ver hasValueField acima); hint reescrito porque o antigo
    // ("...one of these ring labels") descrevia uma lista que não existe mais.
    hint: "Enabled (true) only when your app tags the request with a non-empty 'cohort' context value — any value works, this only checks presence, not a specific name from a list. It's about which rollout wave a request belongs to, decided entirely by your app. Everyone else: disabled (false).",
    contextKey: "cohort",
  },
  {
    type: "ip",
    name: "IP Address",
    description: "Specific IPs / ranges",
    explain: "Restricts activation to known networks, e.g. office or VPN ranges.",
    icon: "globe",
    placeholder: "10.0.0.0/24",
    hint: "Enabled (true) only for requests coming from one of these IPs or CIDR ranges (e.g. an office network or VPN). Everyone else: disabled (false).",
    contextKey: "ip",
  },
  {
    type: "country",
    name: "Country",
    description: "Geo targeting",
    explain: "Geo-targets by country, useful for phased regional launches.",
    icon: "map",
    placeholder: "BR,PT",
    hint: "Enabled (true) only for requests whose resolved country matches one of these ISO codes, comma-separated (e.g. BR, US). Everyone else: disabled (false).",
    contextKey: "country",
  },
  {
    type: "time",
    name: "Time window",
    description: "Active during a window",
    explain: "Active only during a recurring daily window, useful for maintenance mode or time-boxed promotions.",
    icon: "clock",
    placeholder: "09:00-18:00",
    hint: "Enabled (true) only during this window, every day (24h clock, server timezone) — not a calendar date, and there's no way to schedule a one-time start date today. Outside the window: disabled (false). An end time earlier than the start wraps past midnight (e.g. 22:00 to 06:00).",
  },
];

// has_activation_rule é o único sinal confiável de "existe regra" — activation_rule em si
// não é: o servidor manda {type:"", value:""} (truthy, não null) quando não há regra, então
// nunca leia type/value direto do payload sem checar has_activation_rule primeiro.
export function deriveInitialRuleState(toggle: ToggleDetail): { ruleType: ActivationRuleType | null; ruleValue: string } {
  if (!toggle.has_activation_rule || !toggle.activation_rule?.type) {
    return { ruleType: null, ruleValue: "" };
  }
  return { ruleType: toggle.activation_rule.type, ruleValue: toggle.activation_rule.value };
}
