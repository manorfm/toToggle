-- +goose Up
-- +goose StatementBegin

-- Revogar uma secret key virou exclusão física (SecretKeyUseCase.RevokeSecretKey) — não há tela
-- de "chaves revogadas" no produto (GetAllSecretKeys nunca teve rota) e audit_logs já grava o
-- evento key_revoked com o texto necessário pra auditoria, então manter a linha marcada como
-- revogada não sustentava nenhuma capacidade real, só uma credencial hasheada parada sem uso
-- (achado numa análise de segurança/auditoria desta sessão). revoked_at fica sem nenhum escritor
-- a partir de agora — removida em vez de deixada como coluna morta.
DROP INDEX idx_secret_keys_app_current;
CREATE INDEX idx_secret_keys_app_current ON secret_keys(application_id, is_current);
ALTER TABLE secret_keys DROP COLUMN revoked_at;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE secret_keys ADD COLUMN revoked_at DATETIME;
DROP INDEX idx_secret_keys_app_current;
CREATE INDEX idx_secret_keys_app_current ON secret_keys(application_id, is_current, revoked_at);

-- +goose StatementEnd
