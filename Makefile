.PHONY: help build up down restart logs clean test

help:
	@echo "LLM Compare Platform - Make Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  build       Build Docker images"
	@echo "  up          Start all services"
	@echo "  down        Stop all services"
	@echo "  restart     Restart all services"
	@echo "  logs        View logs (all services)"
	@echo "  logs-api    View API logs only"
	@echo "  logs-db     View database logs only"
	@echo "  clean       Remove all containers, volumes, and data"
	@echo "  test        Run tests"
	@echo "  shell       Open shell in API container"
	@echo "  db-shell    Open PostgreSQL shell"
	@echo "  init-db     Initialize database schema"

build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services started!"
	@echo "API: http://localhost:8000"
	@echo "Docs: http://localhost:8000/docs"

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-api:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f postgres

clean:
	@echo "⚠️  This will remove all containers, volumes, and data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		rm -rf backend/data backend/logs; \
		echo "✓ Cleaned!"; \
	fi

test:
	docker-compose exec backend pytest

shell:
	docker-compose exec backend /bin/bash

db-shell:
	docker-compose exec postgres psql -U llmcompare -d llm_compare

init-db:
	docker-compose exec backend python -c "from src.db.database import init_db; init_db()"
	@echo "✓ Database initialized"

# Development commands
dev-install:
	cd backend && pip install -r requirements.txt

dev-run:
	cd backend && python src/main.py

dev-test:
	cd backend && pytest

# Check API health
health:
	@curl -s http://localhost:8000/health | python -m json.tool

# View API info
info:
	@curl -s http://localhost:8000/info | python -m json.tool
