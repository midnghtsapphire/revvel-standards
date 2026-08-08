# Sample Terraform root module used by the Terraform Lint CI gate.
# Kept intentionally small and fully `terraform fmt`-clean so the lint
# workflow has real sources to validate without touching live cloud resources.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment label (for example: staging or production)."
  default     = "staging"

  validation {
    condition     = contains(["staging", "production", "dev"], var.environment)
    error_message = "environment must be one of: staging, production, dev."
  }
}

variable "project_name" {
  type        = string
  description = "Short project identifier used in resource naming."
  default     = "revvel-standards"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "null_resource" "lint_anchor" {
  triggers = {
    name_prefix = local.name_prefix
  }
}

output "name_prefix" {
  description = "Computed name prefix for downstream modules."
  value       = local.name_prefix
}

output "common_tags" {
  description = "Standard tag map applied to managed resources."
  value       = local.common_tags
}
