# MindMappr Persona Chat: Feature Specification
## Lovable Build Spec — v1.0

**Prepared for:** Revvel / MIDNGHTSAPPHIRE
**Date:** February 20, 2026
**Feature:** Persona Chat for MindMappr Dashboard (OpenClaw on DigitalOcean)
**SEO Name:** `mindmappr-persona-chat`
**Tagline:** Your personas. Your server. Your data. Nobody else's.

---

## Overview

The Persona Chat feature adds a full character-based AI chat system to the MindMappr dashboard. Users can create custom AI personas with distinct personalities, expertise, and voices, or choose from a library of pre-built professional and social personas. All conversations are stored on the user's own OpenClaw agent — not on any third-party server. This is the feature that makes MindMappr the self-hosted alternative to Monica AI, Character.AI, and ChatGPT Custom GPTs.

The feature is designed for two primary user groups: the primary user (professional/business use cases) and the user's teenage daughter (age-appropriate social and educational use cases). Safety, ownership, and data portability are first-class design requirements.

---

## The Key Differentiator

> **You own it. Your server. Your data. Your personas.**
>
> Monica AI, Character.AI, and ChatGPT Custom GPTs are all excellent products with one fatal flaw: your conversations, your personas, and your memories live on their servers, subject to their terms of service. When they change their pricing, deprecate a feature, or get acquired, you lose everything.
>
> MindMappr Persona Chat runs on your own DigitalOcean droplet via OpenClaw. Your personas are defined in files you control. Your conversations are stored in your database. Your API keys power the models. Nothing can be taken from you.

---

## Lovable Build Spec

```text
{
  feature: "Persona Chat",
  version: "1.0",
  platform: "MindMappr Dashboard (OpenClaw / DigitalOcean)",
  seo: {
    slug: "/personas",
    title: "Persona Chat — MindMappr",
    meta: "Chat with AI personas you own. Professional advisors, creative companions, teen-safe support — all running on your server, your data."
  }
}
```

---

### pages

```text
pages: [
  {
    slug: "/personas",
    title: "Persona Library",
    sections: [
      "PersonaGrid",
      "CreatePersonaButton",
      "FilterBar (All | Professional | Creative | Teen-Safe | Custom)",
      "PersonaCard (name, avatar, tagline, model badge, voice badge, last-chatted)"
    ],
    primaryCTA: "Start Chatting",
    SEOtitle: "Persona Chat — MindMappr",
    SEOmeta: "Your AI personas, your server, your data. Chat with professional advisors, creative companions, and teen-safe support personas."
  },
  {
    slug: "/personas/new",
    title: "Create Persona",
    sections: [
      "PersonaWizard (5-step guided flow)",
      "SystemPromptEditor (with templates)",
      "PersonalitySliders (formality, warmth, verbosity, humor)",
      "KnowledgeBaseUploader",
      "VoiceSelector (ElevenLabs integration)",
      "ModelSelector (OpenRouter)",
      "SafetyModeToggle (Standard | Teen-Safe)",
      "PreviewChat"
    ],
    primaryCTA: "Create Persona",
    SEOtitle: "Create AI Persona — MindMappr",
    SEOmeta: "Build a custom AI persona with your own system prompt, knowledge base, and ElevenLabs voice."
  },
  {
    slug: "/personas/:id/chat",
    title: "Chat with [Persona Name]",
    sections: [
      "ChatHeader (persona avatar, name, model badge, voice toggle)",
      "MessageThread",
      "InputBar (text + voice input)",
      "SidePanel (persona profile, knowledge base files, chat history)",
      "ExportButton",
      "AIDisclaimer (persistent banner)"
    ],
    primaryCTA: "Send Message",
    SEOtitle: "[Persona Name] Chat — MindMappr",
    SEOmeta: "Chat with your AI persona on your own server."
  },
  {
    slug: "/personas/:id/edit",
    title: "Edit Persona",
    sections: [
      "PersonaWizard (pre-filled with existing data)",
      "DangerZone (delete persona, clear chat history)"
    ],
    primaryCTA: "Save Changes",
    SEOtitle: "Edit Persona — MindMappr",
    SEOmeta: "Update your AI persona's system prompt, voice, model, and knowledge base."
  },
  {
    slug: "/personas/history",
    title: "Chat History",
    sections: [
      "HistoryList (grouped by persona, searchable)",
      "ExportAllButton (Markdown / TXT / PDF)",
      "DeleteHistoryButton"
    ],
    primaryCTA: "Export All History",
    SEOtitle: "Chat History — MindMappr",
    SEOmeta: "View and export all your persona chat history. Your data, always yours."
  }
]
```

---

### components

```text
components: [
  {
    name: "PersonaCard",
    props: {
      id: "string",
      name: "string",
      avatar: "image_url | emoji",
      tagline: "string (max 80 chars)",
      category: "professional | creative | teen-safe | custom",
      model: "string (OpenRouter model ID)",
      voice_id: "string (ElevenLabs voice ID) | null",
      safety_mode: "standard | teen-safe",
      last_chatted: "timestamp | null",
      is_prebuilt: "boolean"
    },
    copy: "Persona card shown in the library grid. Clicking opens the chat interface."
  },
  {
    name: "SystemPromptEditor",
    props: {
      value: "string",
      template_category: "professional | creative | support | educational | fun",
      char_count: "number",
      max_chars: 4000
    },
    copy: "Rich text editor for the persona system prompt. Includes a template library with one-click insertion of pre-written prompts for each persona category."
  },
  {
    name: "PersonalitySliders",
    props: {
      formality: "0-100 (Casual to Formal)",
      warmth: "0-100 (Clinical to Warm)",
      verbosity: "0-100 (Concise to Detailed)",
      humor: "0-100 (Serious to Playful)"
    },
    copy: "Visual sliders that append personality modifier instructions to the system prompt automatically. Designed for users who don't want to write prompts from scratch."
  },
  {
    name: "ModelSelector",
    props: {
      selected_model: "string",
      recommended_for: "creative | technical | educational | balanced",
      show_cost_estimate: "boolean"
    },
    copy: "Dropdown showing available OpenRouter models grouped by use case. Shows estimated cost per 1K tokens. Defaults to DeepSeek V3.2 for creative/social personas and Gemini 2.5 Flash for professional/technical personas."
  },
  {
    name: "VoiceSelector",
    props: {
      selected_voice_id: "string | null",
      preview_text: "string",
      elevenlabs_api_key_configured: "boolean"
    },
    copy: "Voice picker with audio preview. Shows a grid of ElevenLabs voices categorized by gender, age, and accent. Requires ElevenLabs API key in the API Connections panel."
  },
  {
    name: "AIDisclaimer",
    props: {
      persona_name: "string",
      safety_mode: "standard | teen-safe"
    },
    copy: "Persistent banner at the top of every chat: '[Persona Name] is an AI, not a real person. Responses are generated and may be inaccurate. For emergencies, call 911.' Teen-safe mode adds crisis resources."
  },
  {
    name: "KnowledgeBaseUploader",
    props: {
      files: "array of {name, size, status}",
      max_files: 10,
      max_file_size_mb: 25,
      supported_formats: ["pdf", "txt", "md", "docx"]
    },
    copy: "File upload area for persona knowledge base. Files are stored on the OpenClaw agent's file system and chunked for RAG retrieval during chat."
  },
  {
    name: "ExportButton",
    props: {
      persona_id: "string",
      export_formats: ["markdown", "txt", "pdf"],
      scope: "current_conversation | all_conversations"
    },
    copy: "One-click export of chat history. Markdown format preserves formatting. PDF is human-readable. All exports are generated locally on the server."
  }
]
```

---

### flows

```text
flows: [
  {
    wizardName: "CreatePersonaWizard",
    steps: [
      {
        step: 1,
        title: "Name & Identity",
        fields: ["name", "avatar (upload or emoji)", "tagline", "category"],
        tip: "Give your persona a memorable name. The tagline appears on the persona card."
      },
      {
        step: 2,
        title: "Personality & Voice",
        fields: ["personality_sliders", "system_prompt (auto-generated from sliders + editable)", "template_library"],
        tip: "The system prompt is the heart of your persona. Use the sliders for a quick start, then fine-tune the prompt directly."
      },
      {
        step: 3,
        title: "Knowledge Base",
        fields: ["file_uploads", "knowledge_base_description"],
        tip: "Upload documents your persona should know about. PDFs, text files, and Markdown are supported."
      },
      {
        step: 4,
        title: "Model & Voice",
        fields: ["model_selector", "voice_selector"],
        tip: "Creative personas work best with DeepSeek V3.2. Technical personas work best with Gemini 2.5 Flash or Claude 3.5 Sonnet."
      },
      {
        step: 5,
        title: "Safety & Preview",
        fields: ["safety_mode_toggle", "preview_chat"],
        tip: "Enable Teen-Safe mode for personas that will be used by minors. Preview your persona before saving."
      }
    ],
    validations: [
      "name is required and unique",
      "system_prompt must be at least 50 characters",
      "if safety_mode is teen-safe, system_prompt is scanned for inappropriate content before saving"
    ],
    disclosures: [
      "AI personas are not real people. They do not provide professional legal, medical, or financial advice.",
      "Teen-Safe mode applies additional content filtering. It does not guarantee 100% safe responses.",
      "All conversations are stored on your server. You are responsible for your data."
    ]
  }
]
```

---

### dataModels

```text
dataModels: [
  {
    entity: "Persona",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "name", type: "string", max_length: 100, required: true },
      { name: "avatar_url", type: "string | null" },
      { name: "avatar_emoji", type: "string | null" },
      { name: "tagline", type: "string", max_length: 80 },
      { name: "category", type: "enum: professional | creative | teen-safe | custom" },
      { name: "system_prompt", type: "text", max_length: 4000, required: true },
      { name: "personality_formality", type: "integer 0-100" },
      { name: "personality_warmth", type: "integer 0-100" },
      { name: "personality_verbosity", type: "integer 0-100" },
      { name: "personality_humor", type: "integer 0-100" },
      { name: "model_id", type: "string (OpenRouter model ID)", required: true },
      { name: "voice_id", type: "string (ElevenLabs voice ID) | null" },
      { name: "safety_mode", type: "enum: standard | teen-safe", default: "standard" },
      { name: "is_prebuilt", type: "boolean", default: false },
      { name: "knowledge_base_path", type: "string (filesystem path) | null" },
      { name: "created_at", type: "timestamp" },
      { name: "updated_at", type: "timestamp" },
      { name: "last_chatted_at", type: "timestamp | null" }
    ]
  },
  {
    entity: "Conversation",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "persona_id", type: "uuid (FK → Persona)", required: true },
      { name: "title", type: "string (auto-generated from first message)" },
      { name: "created_at", type: "timestamp" },
      { name: "updated_at", type: "timestamp" },
      { name: "message_count", type: "integer" },
      { name: "total_tokens_used", type: "integer" }
    ]
  },
  {
    entity: "Message",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "conversation_id", type: "uuid (FK → Conversation)", required: true },
      { name: "role", type: "enum: user | assistant | system" },
      { name: "content", type: "text", required: true },
      { name: "tokens_used", type: "integer | null" },
      { name: "model_used", type: "string | null" },
      { name: "created_at", type: "timestamp" },
      { name: "flagged_by_safety_filter", type: "boolean", default: false },
      { name: "flag_reason", type: "string | null" }
    ]
  },
  {
    entity: "KnowledgeBaseFile",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "persona_id", type: "uuid (FK → Persona)", required: true },
      { name: "filename", type: "string", required: true },
      { name: "file_path", type: "string (filesystem path)", required: true },
      { name: "file_size_bytes", type: "integer" },
      { name: "mime_type", type: "string" },
      { name: "chunk_count", type: "integer (number of RAG chunks)" },
      { name: "indexed_at", type: "timestamp | null" },
      { name: "created_at", type: "timestamp" }
    ]
  }
]
```

---

### automations

```text
automations: [
  {
    trigger: "User sends a message in a persona chat",
    action: "Route message to OpenRouter with persona system prompt + conversation history + knowledge base context. Stream response back to UI.",
    toolsNeeded: ["OpenRouter API (OPENROUTER_API_KEY)", "RAG retrieval from KnowledgeBaseFile chunks"],
    escalation: "If OpenRouter returns error, retry once with fallback model (DeepSeek V3.2). If retry fails, show user-friendly error with option to try again."
  },
  {
    trigger: "User enables voice mode in chat",
    action: "Send each assistant message to ElevenLabs TTS API with persona's voice_id. Stream audio to browser.",
    toolsNeeded: ["ElevenLabs API (ELEVENLABS_API_KEY from API Connections panel)"],
    escalation: "If ElevenLabs API key not configured, show prompt to add it in API Connections panel. If API call fails, silently fall back to text-only mode."
  },
  {
    trigger: "User uploads file to persona knowledge base",
    action: "Save file to OpenClaw filesystem. Chunk file into segments. Generate embeddings via OpenRouter embedding model. Store chunks and embeddings in local vector store.",
    toolsNeeded: ["OpenClaw filesystem", "OpenRouter embeddings API", "Local vector store (SQLite with vector extension or Chroma)"],
    escalation: "If file is unsupported format, show error. If file exceeds 25MB, show error. If indexing fails, mark file as 'pending' and retry on next chat."
  },
  {
    trigger: "Safety filter detects flagged content (teen-safe mode)",
    action: "Block message from being sent to model. Log flag in Message record. Show user a gentle redirect message. If self-harm language detected, show crisis resources banner.",
    toolsNeeded: ["Content moderation classifier (OpenRouter moderation endpoint or local keyword filter)"],
    escalation: "If moderation API unavailable, fall back to local keyword blocklist. Log all flags for parental review."
  },
  {
    trigger: "User clicks Export Chat History",
    action: "Generate export file in selected format (Markdown / TXT / PDF) from Message records. Serve as download. No data leaves the user's server.",
    toolsNeeded: ["Local file generation (Python markdown/PDF libraries on OpenClaw agent)"],
    escalation: "If PDF generation fails, offer Markdown as fallback."
  },
  {
    trigger: "User creates new persona",
    action: "Run system prompt through safety scanner if teen-safe mode is enabled. Save Persona record. Create knowledge base directory on filesystem.",
    toolsNeeded: ["OpenRouter moderation endpoint (for teen-safe prompt validation)"],
    escalation: "If prompt fails safety scan, show specific feedback on what to change. Do not save persona until prompt passes."
  }
]
```

---

## Pre-Built Persona Library

The following personas will be included out-of-the-box. Each is defined by a full system prompt, a recommended model, and an optional ElevenLabs voice category. These serve as both immediately useful tools and as templates for creating custom personas.

### Professional Personas

**Patent Attorney Advisor** — `category: professional`
This persona provides guidance on patent law, intellectual property strategy, and the patent application process. It is designed for inventors and entrepreneurs who need to understand their IP options without paying $500/hour for a consultation. The persona is knowledgeable, precise, and always reminds the user that it is not a licensed attorney and that formal filings require professional legal counsel.

*Recommended model:* Gemini 2.5 Flash (strong legal reasoning, accurate citations)
*Voice category:* Authoritative, measured, professional

**Skincare Formulation Chemist** — `category: professional`
This persona has deep knowledge of cosmetic chemistry, ingredient interactions, regulatory requirements (FDA, EU Cosmetics Regulation), and formulation best practices. It is designed for entrepreneurs developing skincare products who need technical guidance on ingredients, stability, and safety. It always recommends professional lab testing before commercialization.

*Recommended model:* Gemini 2.5 Flash (strong scientific knowledge)
*Voice category:* Warm, precise, scientific

**Marketing Strategist** — `category: professional`
This persona is a senior growth marketing strategist with expertise in digital marketing, brand positioning, content strategy, and customer acquisition. It helps users develop marketing plans, write copy, analyze competitors, and identify growth opportunities. It asks probing questions to understand the user's specific business context before offering recommendations.

*Recommended model:* DeepSeek V3.2 (strong creative and strategic thinking)
*Voice category:* Energetic, confident, direct

**Business Coach** — `category: professional`
This persona is an experienced entrepreneur and business mentor who helps users think through business challenges, set goals, and develop action plans. It uses a coaching approach — asking questions rather than giving answers — to help users discover their own solutions. It is warm, direct, and holds the user accountable.

*Recommended model:* DeepSeek V3.2 (strong conversational and coaching style)
*Voice category:* Warm, encouraging, grounded

### Educational and Support Personas

**Homework Helper** — `category: teen-safe`
This persona is a patient, encouraging tutor designed for students in middle and high school. It never just gives answers — it walks the student through the reasoning process, asks guiding questions, and celebrates progress. It covers all core subjects: math, science, English, history, and more. Safety mode is enabled by default.

*Recommended model:* Gemini 2.5 Flash (strong academic performance, low cost)
*Voice category:* Friendly, patient, upbeat
*Safety mode:* Teen-Safe (always on, cannot be disabled for this persona)

**Emotional Support Companion** — `category: teen-safe`
This persona is a non-judgmental, empathetic companion designed for users who want to talk through their feelings. It validates emotions, asks open-ended questions, and never minimizes or dismisses what the user is experiencing. It is explicitly not a therapist and always gently encourages professional support when the conversation involves serious distress. Crisis resources are surfaced automatically when self-harm language is detected.

*Recommended model:* DeepSeek V3.2 (strong empathetic conversational ability)
*Voice category:* Warm, gentle, calm
*Safety mode:* Teen-Safe (always on, cannot be disabled for this persona)

### Fun Personas for the Daughter

These personas are designed to be age-appropriate, engaging, and genuinely fun for a teenager. All have Teen-Safe mode enabled by default.

**Creative Storyteller** — `category: teen-safe`
A collaborative fiction partner who loves building stories together. The user and the persona co-create characters, plot twists, and worlds. The persona is imaginative, enthusiastic, and always asks "what happens next?" It can write in any genre — fantasy, sci-fi, mystery, romance — and adapts to the user's preferred style.

*Recommended model:* DeepSeek V3.2 (excellent creative writing)
*Voice category:* Expressive, theatrical, playful

**Debate Partner** — `category: teen-safe`
A friendly sparring partner for intellectual debates. The user picks a topic, and the persona argues the opposite side — not to win, but to help the user strengthen their own thinking. It is respectful, curious, and always acknowledges good points. After the debate, it summarizes both sides fairly.

*Recommended model:* Grok 4.1 Fast (strong reasoning, fast responses)
*Voice category:* Confident, curious, fair

**Supportive Companion** — `category: teen-safe`
An older sibling-like figure who is always in the user's corner. This persona listens without judgment, offers perspective without lecturing, and knows when to be serious and when to be silly. It remembers things the user has shared in previous conversations and checks in on them. It is the persona equivalent of a trusted friend who happens to be available 24/7.

*Recommended model:* DeepSeek V3.2 (strong empathetic and conversational ability)
*Voice category:* Warm, casual, genuine

---

## Safety Architecture

The teen safety system is designed in layers, with each layer providing independent protection:

**Layer 1 — Persona-Level Safety Mode**: When a persona is created or edited with Teen-Safe mode enabled, the system prompt is scanned for inappropriate content before saving. Any persona with Teen-Safe mode enabled is flagged in the database and triggers additional filtering at runtime.

**Layer 2 — Input Filtering**: Before any user message is sent to the language model, it is checked against a content moderation classifier. Messages that contain self-harm language, explicit content, or other flagged categories are blocked. The user sees a gentle redirect message rather than an error.

**Layer 3 — Output Filtering**: The model's response is checked before being displayed to the user. Responses that contain flagged content are replaced with a safe fallback message.

**Layer 4 — Crisis Intervention**: When self-harm or crisis language is detected in either the input or output, a persistent banner is displayed with the National Suicide Prevention Lifeline (988) and Crisis Text Line (text HOME to 741741).

**Layer 5 — Parental Review**: All flagged messages are logged in the Message record with the flag reason. A parental review panel in the MindMappr dashboard shows all flagged messages across all teen-safe personas, allowing the parent to review and respond.

**Layer 6 — Persistent Disclaimer**: Every chat interface shows a persistent banner: "[Persona Name] is an AI, not a real person. For emergencies, call 911."

---

## Model Routing Strategy

The following table summarizes the recommended model routing for each persona category:

| Persona Category | Primary Model | Fallback Model | Rationale |
|---|---|---|---|
| Creative / Social | DeepSeek V3.2 | Grok 4.1 Fast | Best creative writing and roleplay at low cost |
| Professional / Technical | Gemini 2.5 Flash | Claude 3.5 Sonnet | Strong reasoning and factual accuracy |
| Educational | Gemini 2.5 Flash | Gemini 2.5 Pro | Strong academic performance, escalate for hard problems |
| Teen-Safe (all) | DeepSeek V3.2 | Gemini 2.5 Flash | Strong conversational ability, low cost for high-volume teen use |

Users can override the recommended model for any persona in the Model Selector. The system always displays the current model and estimated cost per conversation in the chat header.

---

## Chat History and Data Portability

All conversations are stored in the local database on the OpenClaw agent. The following export options are available:

**Per-Conversation Export**: From any chat interface, the user can export the current conversation as Markdown, plain text, or PDF with a single click.

**Bulk Export**: From the Chat History page, the user can export all conversations for a specific persona, or all conversations across all personas, in any supported format.

**Raw Data Access**: Because the data is stored in a local database on the user's own server, advanced users can access the raw data directly via SQL query or by reading the Markdown files from the filesystem.

**Backup Integration**: The OpenClaw agent's existing GitHub push capability means all chat history can be automatically backed up to a private GitHub repository on a schedule.

---

## Attribution Footer

Per project standards, the following attribution will appear in the footer of the Persona Chat feature:

> Persona Chat powered by [OpenRouter](https://openrouter.ai) (multi-model AI routing) and [ElevenLabs](https://elevenlabs.io) (voice synthesis). Running on your server via [OpenClaw](https://openclaw.ai) on [DigitalOcean](https://digitalocean.com).

---

## Implementation Notes

This feature is designed to be built as a module within the existing MindMappr dashboard. The backend will run as a Python FastAPI service on the OpenClaw agent, with a React frontend served from the existing dashboard. The key dependencies are:

- **OpenRouter API**: For all language model inference (OPENROUTER_API_KEY already configured)
- **ElevenLabs API**: For text-to-speech (requires ELEVENLABS_API_KEY in API Connections panel)
- **SQLite or PostgreSQL**: For storing Persona, Conversation, and Message records
- **Chroma or SQLite-vec**: For knowledge base vector storage and RAG retrieval
- **Python libraries**: `langchain` or `llama-index` for RAG pipeline, `fpdf2` or `weasyprint` for PDF export

The feature should be deployed to the existing MindMappr droplet and added to the meetaudreyevans.com hub with a card showing the persona count and last-chatted timestamp.
