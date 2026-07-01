SHELL := /bin/zsh

.PHONY: help install dev-backend dev-frontend test test-e2e docker-up docker-down docker-logs docker-ps health ports

help:
	@echo "Targets:"
	@echo "  install       Install dependencies for both microservices"
	@echo "  dev-backend   Run backend in watch mode"
	@echo "  dev-frontend  Run frontend in watch mode"
	@echo "  test          Run backend unit tests"
	@echo "  test-e2e      Run backend e2e tests"
	@echo "  docker-up     Build and start docker stack"
	@echo "  docker-down   Stop docker stack"
	@echo "  docker-logs   Tail docker logs"
	@echo "  docker-ps     Show docker service status"
	@echo "  health        Check API and frontend via single exposed frontend port"
	@echo "  ports         Show local listeners for relevant ports"

install:
	npm --prefix src/apps/ey-sprint-business-services install
	npm --prefix src/apps/ey-sprint-frontend install

dev-backend:
	npm run dev:backend:new

dev-frontend:
	npm run dev:frontend:new

test:
	npm run test

test-e2e:
	npm run test:e2e:new

docker-up:
	npm run docker:up

docker-down:
	npm run docker:down

docker-logs:
	npm run docker:logs

docker-ps:
	docker compose -f docker-compose.yml ps

health:
	@echo "API via NGINX gateway:"
	@curl -sS http://localhost:3000/api/health | cat
	@echo ""
	@echo "Frontend HTTP via NGINX gateway:"
	@curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000

ports:
	@lsof -nP -iTCP:3000 -sTCP:LISTEN || true
	@lsof -nP -iTCP:3001 -sTCP:LISTEN || true
	@lsof -nP -iTCP:3002 -sTCP:LISTEN || true
	@lsof -nP -iTCP:27017 -sTCP:LISTEN || true
	@lsof -nP -iTCP:27018 -sTCP:LISTEN || true
