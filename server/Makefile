APP_NAME = toToogle
DOCKER_VOLUME ?= totoggle-data
DB_PATH = ./db/toggles.db
# Default `true` no servidor (env.go) — exige HTTPS pro cookie de sessão persistir, correto em
# produção. `run`/`dev` são sempre HTTP puro (localhost), então viram `false` aqui só pra esses
# dois targets — Docker/deploy nunca passam por aqui, continuam com o default seguro.
# Override manual: `make run COOKIE_SECURE=true` (ex.: testando atrás de um proxy HTTPS local).
COOKIE_SECURE ?= false
# Mesmo default de E2E_PORT em e2e/playwright.config.ts — usado aqui só pra matar qualquer
# processo remanescente na porta antes de subir uma run nova (ver `e2e-run` abaixo).
E2E_PORT ?= 3057

.PHONY: help run build test clean docker-build docker-run web-install web-build web-dev web-test e2e e2e-install e2e-run

help: ## Mostra esta ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

run: ## Roda a aplicação localmente (aplica as próprias migrations automaticamente)
	COOKIE_SECURE=$(COOKIE_SECURE) go run main.go

build: web-build ## Builda o frontend (static/app) e compila o binário Go
	go build -o $(APP_NAME) main.go

test: ## Executa os testes
	go test ./...

clean: ## Remove binário e banco de dados
	rm -f $(APP_NAME) $(DB_PATH)

docker-build: ## Constrói a imagem Docker
	docker build -t $(APP_NAME) .

docker-run: ## Roda o container Docker
	docker volume create $(DOCKER_VOLUME)
	docker run --rm -p 3056:3056 -v $(DOCKER_VOLUME):/app/data -e COOKIE_SECURE=false $(APP_NAME)

dev: run ## Alias de `run`

web-install: ## Instala dependências do frontend (server/web)
	cd web && npm install

web-build: ## Builda o frontend, gerando static/app (mesma porta do Go)
	cd web && npm run build

web-dev: ## Sobe o Vite dev server (proxy para :3056) — use junto com `make run` em outro terminal
	cd web && npm run dev

web-test: ## Executa os testes do frontend (vitest)
	cd web && npm run test

e2e-install: ## Instala as deps da suíte Playwright + browsers (só precisa rodar de novo se e2e/package.json ou a versão do Playwright mudar)
	cd e2e && npm install && npx playwright install --with-deps chromium

# playwright.config.ts sobe o servidor real (`go run main.go`) com reuseExistingServer:false —
# se uma run anterior for interrompida (Ctrl+C, crash) antes do teardown, o processo Go filho
# pode sobreviver preso na porta, e toda run seguinte falha em massa ("port already used") sem
# nenhum teste real ter quebrado. Mata qualquer processo na porta antes de cada run, sempre —
# `-` ignora o erro de `lsof`/`kill` quando não há nada pra matar (caso comum, sem custo real).
e2e-run: web-build ## Roda a suíte Playwright localmente sem reinstalar deps/browsers (use depois do primeiro `make e2e`, pra iterar rápido)
	-@lsof -ti tcp:$(E2E_PORT) | xargs kill -9 2>/dev/null
	cd e2e && npm test

e2e: web-build e2e-install e2e-run ## Roda a suíte Playwright completa e localmente: builda o frontend, instala deps/browsers se necessário e roda os testes
