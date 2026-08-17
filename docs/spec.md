# Revvel .skill File Format Specification v1.0

This document defines the official specification for the `.skill` file format used in the Revvel Skills Vault. The format is designed to be comprehensive, machine-readable, and flexible enough to encompass skills from various sources, including custom-built Python skills, OpenClaw-compatible Markdown skills, and simple prompt libraries.

The canonical format for a `.skill` file is **YAML**, chosen for its human readability and structured nature. The skill loader/manager will also support JSON representations of the same structure.

---

## File Structure

Each skill is defined by a single `.skill.yml` or `.skill.json` file. This file contains all the metadata, dependencies, and the core implementation logic or prompt.

```yaml
# .skill File Format Specification v1.0

# --- Basic Information (Required) ---
name: string # Unique, machine-readable name in snake_case. e.g., "cold_case_analysis"
title: string # Human-readable, title-cased name. e.g., "Cold Case Analysis"
version: string # Semantic versioning, e.g., "1.0.0"
description: string # A concise, one-sentence summary of the skill's purpose.

# --- Metadata (Required) ---
metadata:
  author: string # Original author or organization. e.g., "Revvel AI Engine", "OpenClaw Community"
  category: string # Primary category from a predefined list. e.g., "Forensic Investigation", "Marketing & Business"
  tags: [string] # A list of relevant keywords for searchability. e.g., ["forensics", "dna", "investigation"]
  created_at: date # Date of creation, YYYY-MM-DD
  updated_at: date # Date of last update, YYYY-MM-DD

# --- Dependencies & Requirements (Optional) ---
dependencies:
  skills: [string] # List of other skill `name`s this skill depends on. e.g., ["web_scraper"]
  tools: [string] # List of required command-line tools or binaries. e.g., ["gh", "ffmpeg"]
  pip_packages: [string] # List of required Python packages. e.g., ["pandas", "numpy"]

# --- Installation (Optional) ---
# Instructions for installing dependencies if they are missing.
install:
  - id: string # Unique ID for the install step, e.g., "install_gh_brew"
    platform: string # "linux", "macos", "windows", "all"
    method: string # "apt", "brew", "pip", "shell"
    command: string # The command to execute. e.g., "sudo apt-get install -y gh"
    label: string # Human-readable description of the install step.

# --- Skill Implementation (Required) ---
# This section contains the core logic of the skill.
implementation:
  type: string # The type of implementation: "python_code", "markdown_prompt", "shell_script"
  language: string # The language of the content, e.g., "python", "markdown", "bash". Required.
  content: string # The full, multi-line string containing the code or prompt.

# --- Usage Examples (Optional) ---
examples:
  - description: string # A description of what the example does.
    usage: string # A code snippet or command showing how to use the skill.

# --- Schema Version (Required) ---
schema_version: string # The version of this .skill spec, e.g., "1.0"
```

## Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | A unique, `snake_case` identifier for the skill. This is the primary key. |
| `title` | string | Yes | A human-friendly, `Title Case` name for display purposes. |
| `version` | string | Yes | The skill's version, following SemVer (e.g., `1.0.0`). |
| `description` | string | Yes | A brief, clear explanation of what the skill does. |
| `metadata` | object | Yes | A container for classification and tracking information. |
| `metadata.author` | string | Yes | The name of the person, team, or community that created the skill. |
| `metadata.category` | string | Yes | The primary functional category. The skill loader will maintain a canonical list of categories. |
| `metadata.tags` | array | Yes | A list of lowercase string tags to aid in searching and filtering. |
| `metadata.created_at` | date | No | The date the skill was first created in `YYYY-MM-DD` format. |
| `metadata.updated_at` | date | No | The date the skill was last modified in `YYYY-MM-DD` format. |
| `dependencies` | object | No | Specifies any prerequisites needed for the skill to function. |
| `dependencies.skills` | array | No | A list of other skill `name`s that this skill relies on. |
| `dependencies.tools` | array | No | A list of command-line binaries that must be in the system's `PATH`. |
| `dependencies.pip_packages` | array | No | A list of Python packages required by the skill. |
| `install` | array | No | A list of commands to install the specified dependencies. |
| `implementation` | object | Yes | The core logic of the skill. |
| `implementation.type` | string | Yes | The nature of the implementation. Must be one of `python_code`, `markdown_prompt`, or `shell_script`. |
| `implementation.language` | string | Yes | The programming or markup language of the content (e.g., `python`, `markdown`, `bash`). |
| `implementation.content` | string | Yes | The complete, multi-line string of the skill's code or prompt. Must be properly escaped for YAML/JSON. |
| `examples` | array | No | A list of usage examples. |
| `schema_version` | string | Yes | The version of the `.skill` specification this file adheres to. Currently `1.0`. |

---

This specification provides a unified structure that can capture the metadata and logic from all identified sources, ensuring that every skill in the Revvel Skills Vault is consistently formatted, searchable, and ready for deployment.
