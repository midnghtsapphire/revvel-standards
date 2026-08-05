# Revvel Personal Ops Fleet — offline developer tasks.
PY ?= python3
export PYTHONPATH := src

.PHONY: help setup test lint demo plan dry-run inventory schemas verify-audit pdf clean

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies and seed local config/dirs
	bash scripts/bootstrap.sh

test: ## Run the unit test suite (offline)
	$(PY) -m pytest

lint: ## Byte-compile every module as a cheap syntax gate
	$(PY) -m compileall -q src tests scripts

demo: ## Full offline demo: inventory + plan + dry-run + chain verify
	bash scripts/run_demo.sh

inventory: ## Create the labeled sample connector inventory
	$(PY) -m revvel_ops.cli inventory --demo

plan: ## Build a plan from fixture data
	$(PY) -m revvel_ops.cli plan --mode review_everything

dry-run: ## Plan then simulate with zero external calls
	$(PY) -m revvel_ops.cli dry-run --mode policy_automation

schemas: ## Regenerate schemas/*.json from the models
	$(PY) scripts/export_schemas.py

verify-audit: ## Verify SHA-256 audit hash chains
	$(PY) scripts/verify_audit_chain.py

pdf: ## Rebuild the architecture & operations handbook PDF
	$(PY) scripts/build_handbook_pdf.py

clean: ## Remove local run artifacts (never touches config or docs)
	rm -rf var .pytest_cache **/__pycache__
