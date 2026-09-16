-- +goose Up
-- +goose StatementBegin

-- ApprovalRequest resolvia RequesterName/TeamName/ApplicationName via LEFT JOIN ao vivo contra
-- users/teams/applications a cada leitura (approval_request_repository.go) — diferente de
-- audit_logs, que já grava esse texto no momento do evento. Como User/Team/Application são
-- exclusão física (nunca soft-delete) e um ApprovalRequest aprovado/rejeitado nunca é apagado
-- (fica pra sempre como histórico), apagar qualquer uma dessas entidades depois fazia o nome
-- correspondente virar "" pra sempre num registro de decisão já tomada — confirmado ao vivo numa
-- investigação desta sessão. Colunas nulas de propósito: pedidos criados antes desta migration
-- continuam resolvendo pelo JOIN (sem backfill); pedidos novos gravam o nome no momento da
-- criação e ficam imunes a qualquer exclusão futura. Mesmo padrão de nome já usado por
-- audit_logs.actor_name — o nome da pessoa/time/aplicação em si, não um termo técnico de "como"
-- ele é preservado.
ALTER TABLE approval_requests ADD COLUMN requester_name VARCHAR(150);
ALTER TABLE approval_requests ADD COLUMN team_name VARCHAR(100);
ALTER TABLE approval_requests ADD COLUMN application_name VARCHAR(255);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE approval_requests DROP COLUMN application_name;
ALTER TABLE approval_requests DROP COLUMN team_name;
ALTER TABLE approval_requests DROP COLUMN requester_name;

-- +goose StatementEnd
