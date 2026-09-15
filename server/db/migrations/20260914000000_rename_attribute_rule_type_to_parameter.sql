-- +goose Up
-- +goose StatementBegin

-- v2.6.4: o protótipo renomeou o tipo de regra de ativação "attribute" -> "parameter" (não só o
-- rótulo de UI, o identificador interno de verdade — confirmado via
-- get_component_data("EditDrawer")). Decisão explícita do usuário: renomear o enum no contrato
-- público também, em vez de só na UI. rule_type/rule_value/rule_config são colunas embutidas
-- (gorm:"embedded;embeddedPrefix:rule_") direto em `toggles`, sem tabela própria.
UPDATE toggles SET rule_type = 'parameter' WHERE rule_type = 'attribute';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

UPDATE toggles SET rule_type = 'attribute' WHERE rule_type = 'parameter';

-- +goose StatementEnd
