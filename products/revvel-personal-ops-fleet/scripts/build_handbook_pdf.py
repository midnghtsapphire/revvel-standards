#!/usr/bin/env python3
"""Build docs/deliverables/Revvel-Personal-Ops-Fleet-Architecture-and-Operations-Handbook.pdf

Original design document: no web sources, no citations. Offline, deterministic layout.
Run: python scripts/build_handbook_pdf.py   (or: make pdf)
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    CondPageBreak,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "deliverables" / "Revvel-Personal-Ops-Fleet-Architecture-and-Operations-Handbook.pdf"

TITLE = "Revvel Personal Ops Fleet — Architecture and Operations Handbook"
AUTHOR = "Perplexity Computer"
VERSION = "0.1.0 (MVP)"
DATED = date(2026, 8, 3).strftime("%B %d, %Y")

# ---------------------------------------------------------------- palette
INK = colors.HexColor("#28251D")
MUTED = colors.HexColor("#7A7974")
FAINT = colors.HexColor("#BAB9B4")
RULE = colors.HexColor("#D4D1CA")
SURFACE = colors.HexColor("#F4F3EF")
PAPER = colors.HexColor("#FBFBF9")
ACCENT = colors.HexColor("#01696F")
ACCENT_DK = colors.HexColor("#0C4E54")
WARN = colors.HexColor("#964219")
DENY = colors.HexColor("#A12C7B")
OK = colors.HexColor("#437A22")

FONT_DIR = Path("/usr/share/fonts/truetype/noto")


def register_fonts() -> tuple[str, str, str, str]:
    """Register embedded TTFs. Falls back to Helvetica if unavailable."""
    try:
        pdfmetrics.registerFont(TTFont("Body", FONT_DIR / "NotoSans-Regular.ttf"))
        pdfmetrics.registerFont(TTFont("BodyMed", FONT_DIR / "NotoSans-Medium.ttf"))
        pdfmetrics.registerFont(TTFont("BodyBold", FONT_DIR / "NotoSans-Bold.ttf"))
        pdfmetrics.registerFont(TTFont("Head", FONT_DIR / "NotoSans-SemiBold.ttf"))
        pdfmetrics.registerFont(TTFont("Mono", FONT_DIR / "NotoSansMono-Regular.ttf"))
        pdfmetrics.registerFontFamily("Body", normal="Body", bold="BodyBold")
        return "Body", "Head", "BodyBold", "Mono"
    except Exception:  # pragma: no cover - environment fallback
        return "Helvetica", "Helvetica-Bold", "Helvetica-Bold", "Courier"


BODY, HEAD, BOLD, MONO = register_fonts()

# ----------------------------------------------------------------- styles
ss = getSampleStyleSheet()


def style(name: str, **kw) -> ParagraphStyle:
    return ParagraphStyle(name, parent=ss["BodyText"], **kw)


S_TITLE = style("t", fontName=HEAD, fontSize=30, leading=35, textColor=INK, spaceAfter=10)
S_SUB = style("s", fontName=BODY, fontSize=13.5, leading=19, textColor=ACCENT_DK, spaceAfter=6)
S_COVER_META = style("cm", fontName=BODY, fontSize=9.5, leading=15, textColor=MUTED)
S_H1 = style("h1", fontName=HEAD, fontSize=18, leading=23, textColor=INK, spaceBefore=6, spaceAfter=8)
S_H2 = style("h2", fontName=HEAD, fontSize=12.5, leading=16, textColor=ACCENT_DK, spaceBefore=13, spaceAfter=5)
S_H3 = style("h3", fontName=BOLD, fontSize=10.5, leading=14, textColor=INK, spaceBefore=10, spaceAfter=3)
S_BODY = style("b", fontName=BODY, fontSize=9.5, leading=14.5, textColor=INK, spaceAfter=6, alignment=TA_LEFT)
S_LEAD = style("ld", fontName=BODY, fontSize=10.5, leading=16, textColor=INK, spaceAfter=8)
S_SMALL = style("sm", fontName=BODY, fontSize=8.2, leading=12, textColor=MUTED, spaceAfter=4)
S_BULLET = style("bu", fontName=BODY, fontSize=9.5, leading=14, textColor=INK, spaceAfter=2)
S_CODE = style("c", fontName=MONO, fontSize=8, leading=12, textColor=INK, backColor=SURFACE,
               borderPadding=(7, 8, 7, 8), spaceBefore=4, spaceAfter=8, leftIndent=0)
S_CELL = style("cl", fontName=BODY, fontSize=8.2, leading=11.5, textColor=INK)
S_CELL_B = style("clb", fontName=BOLD, fontSize=8.2, leading=11.5, textColor=INK)
S_CELL_H = style("clh", fontName=HEAD, fontSize=8.2, leading=11.5, textColor=colors.white)
S_CALL = style("ca", fontName=BODY, fontSize=9, leading=13.5, textColor=INK)
S_CALL_T = style("cat", fontName=BOLD, fontSize=9, leading=13.5, textColor=ACCENT_DK)


def para(text: str, st: ParagraphStyle = S_BODY) -> Paragraph:
    return Paragraph(text, st)


def bullets(items: list[str], st: ParagraphStyle = S_BULLET) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(i, st), leftIndent=14) for i in items],
        bulletType="bullet", start="\u2022", bulletFontName=BODY, bulletFontSize=9,
        bulletColor=ACCENT, leftIndent=12, spaceAfter=7,
    )


def numbered(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(i, S_BULLET), leftIndent=15) for i in items],
        bulletType="1", bulletFontName=BOLD, bulletFontSize=8.6, bulletColor=ACCENT,
        leftIndent=13, spaceAfter=7,
    )


def code(text: str) -> Paragraph:
    return Paragraph(text.replace(" ", "&nbsp;").replace("\n", "<br/>"), S_CODE)


def table(header: list[str], rows: list[list[str]], widths: list[float], bold_first: bool = False) -> Table:
    data = [[Paragraph(h, S_CELL_H) for h in header]]
    for r in rows:
        cells = []
        for idx, cell in enumerate(r):
            st = S_CELL_B if (bold_first and idx == 0) else S_CELL
            cells.append(Paragraph(str(cell), st))
        data.append(cells)
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, SURFACE]),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
    ]))
    return t


def callout(title: str, body: str, tint: colors.Color = ACCENT) -> Table:
    inner = [[Paragraph(title, S_CALL_T)], [Paragraph(body, S_CALL)]]
    t = Table(inner, colWidths=[6.55 * inch], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 1),
        ("TOPPADDING", (0, 1), (-1, 1), 1),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 9),
        ("LINEBEFORE", (0, 0), (0, -1), 2.4, tint),
    ]))
    return t


def section(number: str, name: str) -> list:
    bar = Table([[""]], colWidths=[6.55 * inch], rowHeights=[2])
    bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT), ("LINEBELOW", (0, 0), (-1, -1), 0, ACCENT)]))
    return [
        CondPageBreak(2.2 * inch),
        Spacer(1, 12),
        Paragraph(f'<font color="#01696F">{number}</font>&nbsp;&nbsp;{name}', S_H1),
        bar,
        Spacer(1, 10),
    ]


# ------------------------------------------------------------ page canvas
def cover_page(canv, doc):
    canv.saveState()
    canv.setFillColor(PAPER)
    canv.rect(0, 0, LETTER[0], LETTER[1], stroke=0, fill=1)
    canv.setFillColor(ACCENT)
    canv.rect(0, LETTER[1] - 0.34 * inch, LETTER[0], 0.34 * inch, stroke=0, fill=1)
    canv.setFillColor(ACCENT_DK)
    canv.rect(0, 0, LETTER[0], 0.18 * inch, stroke=0, fill=1)
    canv.setFont(HEAD, 8.5)
    canv.setFillColor(colors.white)
    canv.drawString(0.95 * inch, LETTER[1] - 0.225 * inch, "REVVEL STANDARDS  /  AGENTOPS  /  AGENTIC STACK")
    canv.restoreState()


def body_page(canv, doc):
    canv.saveState()
    canv.setFillColor(PAPER)
    canv.rect(0, 0, LETTER[0], LETTER[1], stroke=0, fill=1)
    canv.setStrokeColor(RULE)
    canv.setLineWidth(0.5)
    canv.line(0.95 * inch, LETTER[1] - 0.72 * inch, LETTER[0] - 0.95 * inch, LETTER[1] - 0.72 * inch)
    canv.setFont(BODY, 7.6)
    canv.setFillColor(MUTED)
    canv.drawString(0.95 * inch, LETTER[1] - 0.63 * inch, "Revvel Personal Ops Fleet — Architecture and Operations Handbook")
    canv.drawRightString(LETTER[0] - 0.95 * inch, LETTER[1] - 0.63 * inch, f"v{VERSION}")
    canv.line(0.95 * inch, 0.72 * inch, LETTER[0] - 0.95 * inch, 0.72 * inch)
    canv.setFont(BODY, 7.6)
    canv.setFillColor(FAINT)
    canv.drawString(0.95 * inch, 0.56 * inch, "Original design document — internal. No external sources.")
    canv.setFillColor(MUTED)
    canv.drawRightString(LETTER[0] - 0.95 * inch, 0.56 * inch, f"{canv.getPageNumber()}")
    canv.restoreState()


def build() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=LETTER,
        title=TITLE,
        author=AUTHOR,
        subject="Architecture, safety model, policy engine, connector contracts, and operations for a hybrid personal operations agent fleet",
        creator=AUTHOR,
        keywords="agent fleet, policy engine, audit chain, least privilege, autonomy modes, runbooks",
        leftMargin=0.95 * inch, rightMargin=0.95 * inch,
        topMargin=0.95 * inch, bottomMargin=0.95 * inch,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame], onPage=cover_page),
        PageTemplate(id="body", frames=[frame], onPage=body_page),
    ])
    doc.build(story())
    return OUT


W = 6.55 * inch


def story() -> list:
    s: list = []

    # ---------------------------------------------------------------- cover
    s += [
        Spacer(1, 1.55 * inch),
        para("Revvel Personal Ops Fleet", S_TITLE),
        para("Architecture and Operations Handbook", S_SUB),
        Spacer(1, 6),
        para(
            "A proposal-first control plane for a hybrid personal operations agent fleet: "
            "scored proposals, explicit policy decisions, reversible-first actions, and an "
            "append-only hash-chained audit trail.",
            style("cl2", fontName=BODY, fontSize=11, leading=17, textColor=MUTED),
        ),
        Spacer(1, 0.5 * inch),
    ]
    meta = table(
        ["Field", "Value"],
        [
            ["Document", TITLE],
            ["Author", AUTHOR],
            ["Version", VERSION],
            ["Date", DATED],
            ["Repository", "revvel-personal-ops-fleet"],
            ["Status", "MVP — plan and dry-run only; no execution path implemented"],
            ["Scope", "Design + operations. Contains no secrets, credentials, memory contents, system prompts, or proprietary tool internals."],
            ["Sources", "None. Original design document; no external research or citations."],
        ],
        [1.35 * inch, W - 1.35 * inch],
        bold_first=True,
    )
    s += [meta, Spacer(1, 0.3 * inch)]
    s += [callout(
        "Read this first",
        "Every action in this system starts life as a <b>proposal</b>, receives a <b>0-100 confidence score</b>, "
        "and receives exactly one <b>policy disposition</b>: allow, propose, require_approval, or deny. "
        "High-risk, irreversible, and externally visible actions are blocked for human approval by default. "
        "Nothing in the MVP can mutate an external service.",
    )]
    s += [NextPageTemplate("body"), PageBreak()]

    # ------------------------------------------------------------ contents
    s += section("00", "Contents")
    s += [table(
        ["§", "Section", "What it answers"],
        [
            ["01", "System overview", "What the fleet is and what it refuses to do"],
            ["02", "Architecture", "Components, data flow, trust boundaries, storage"],
            ["03", "Safety model", "Threats, mitigations, redaction, prompt-injection stance"],
            ["04", "Policy engine", "Autonomy modes, scoring, rule table, reversible-first"],
            ["05", "Identity and account selection", "How the wrong account is prevented"],
            ["06", "Connector contracts", "Scopes, gates, rollback, honest availability"],
            ["07", "Companions", "Windows local design; mobile contract and its limits"],
            ["08", "Workflows", "Plan, dry-run, approve, apply, rollback, incident"],
            ["09", "Audit and evidence", "Hash chain, evidence IDs, verification"],
            ["10", "Runtime capability boundary", "Documented skills vs platform internals"],
            ["11", "Implementation steps", "Sequenced phases with exit criteria"],
            ["12", "Limitations", "What this MVP explicitly does not do"],
        ],
        [0.4 * inch, 2.0 * inch, W - 2.4 * inch],
    )]
    s += [PageBreak()]

    # ------------------------------------------------------ 01 overview
    s += section("01", "System overview")
    s += [para(
        "The fleet is a <b>decision layer</b> for personal operations across mail, calendar, files, code, "
        "and existing automations. It converts messy inputs into a queue of scored, policy-gated, "
        "reversible proposals, each backed by evidence and a rollback reference. Execution is the last, "
        "smallest, and most heavily gated part of the system — and in this MVP it is absent by design.",
        S_LEAD,
    )]
    s += [code(
        "plan  ->  score (0-100)  ->  policy disposition  ->  dry-run  ->  [human approval]  ->  apply\n"
        "                                                                                       ^ refused in MVP"
    )]
    s += [para("Enforced invariants", S_H2)]
    s += [table(
        ["Invariant", "Enforcement point"],
        [
            ["No module performs a network call", "Connectors are skeletons; <font face='%s'>apply()</font> raises NotImplementedError" % MONO],
            ["Default autonomy is review_everything", "Policy config defaults and PolicyConfig model"],
            ["High-risk / irreversible / externally visible actions need a human", "Policy rules R050, R060, R061"],
            ["Delete and unsubscribe always need a human", "Rule R040 + always_require_approval_permissions"],
            ["Deletion means Trash, never permanent delete", "Email cleanup skill + capability deny list"],
            ["Only allowlisted identities are addressable", "Rules R020 / R021"],
            ["Mutating automation requires a rollback reference", "Rule R070"],
            ["Audit log is append-only and tamper-evident", "Append-mode writes + SHA-256 chain verification"],
            ["Apply is refused", "Planner, CLI, and API all refuse and record the refusal"],
        ],
        [2.9 * inch, W - 2.9 * inch],
        bold_first=True,
    )]
    s += [para("Demonstrated behavior", S_H2)]
    s += [para(
        "Running the offline demo over ten synthetic mail threads produces 23 proposals across four "
        "action families — label, archive, unsubscribe proposal, and Trash proposal — and gates them:",
        S_BODY,
    )]
    s += [table(
        ["Autonomy mode", "allow", "propose", "require_approval", "deny"],
        [
            ["review_everything", "0", "0", "16", "7"],
            ["safe_automation", "0", "16", "0", "7"],
            ["policy_automation", "0", "16", "0", "7"],
        ],
        [1.9 * inch, 0.8 * inch, 0.95 * inch, 1.6 * inch, 0.8 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 6), callout(
        "Why allow is zero even at confidence 100",
        "The seven denials are the delete and unsubscribe proposals: the operator identity is granted "
        "read, suggest, and write — not delete or unsubscribe — so they are refused at the identity layer "
        "before scoring matters. And although labeling scores 100, the connector's declared gate for "
        "label application is <b>propose</b>. A connector gate may only tighten a decision, never loosen it.",
    )]

    # -------------------------------------------------- 02 architecture
    s += section("02", "Architecture")
    s += [para("Component model", S_H2)]
    s += [code(
        "                 +----------------------------------------------------------+\n"
        "                 |                    CONTROL PLANE                         |\n"
        "  fixtures /     |                                                          |\n"
        "  connector  --> |  Skills --> ActionProposal --> Policy Engine --> Plan     |\n"
        "  metadata       |   (email_cleanup, ...)   |        confidence 0-100        |\n"
        "                 |                     Evidence      disposition            |\n"
        "                 |                          v             v                 |\n"
        "                 |        Audit Log (append-only JSONL, SHA-256 chain)      |\n"
        "                 |          Dry-run simulator   Approval queue (human)      |\n"
        "                 +------------+---------------------------+-----------------+\n"
        "                              | skeletons only, no calls  |\n"
        "        +---------------------+                     +-----+------------------+\n"
        "        | Cloud connectors    |                     | Companions             |\n"
        "        | gmail, calendar,    |                     | windows local          |\n"
        "        | drive, dropbox,     |                     | (folder allowlist,     |\n"
        "        | box, github, n8n,   |                     | outbound only),        |\n"
        "        | openrouter          |                     | mobile (contract only) |\n"
        "        +---------------------+                     +------------------------+"
    )]
    s += [para("Module responsibilities", S_H2)]
    s += [table(
        ["Module", "Responsibility", "Never does"],
        [
            ["models", "Typed domain objects and hashing helpers", "Persist or transmit"],
            ["config", "Load policy / identities / storage YAML with restrictive defaults", "Read secrets"],
            ["skills", "Turn metadata into proposals with evidence", "Execute or fetch"],
            ["policy", "Score 0-100, assign disposition, enforce rule order", "Mutate targets"],
            ["planner", "Orchestrate plan -&gt; dry-run -&gt; refused apply; write audit", "Bypass policy"],
            ["audit", "Append-only JSONL, hash chain, redaction, verification", "Rewrite history"],
            ["inventory", "Labeled sample connector state and capability matrix", "Probe live services"],
            ["connectors", "Declare capabilities, scopes, gates, rollback", "Open a socket"],
            ["cli / api", "Operator surfaces", "Expose an apply path"],
        ],
        [0.95 * inch, 3.1 * inch, W - 4.05 * inch],
        bold_first=True,
    )]
    s += [para("Data flow for one run", S_H2)]
    s += [numbered([
        "<b>Ingest</b> — a skill receives already-fetched metadata (a fixture in the MVP). Message bodies are never loaded, so they cannot leak into evidence or logs.",
        "<b>Propose</b> — proposals default to the unsafe interpretation (high risk, irreversible, externally visible) until the skill proves otherwise.",
        "<b>Evidence</b> — each row records connector, opaque source reference, signal name, and a SHA-256 digest of the redacted observation. Evidence IDs are referenced from the audit log.",
        "<b>Score</b> — evidence count, reversibility, external visibility, rollback availability, a bounded skill heuristic, minus risk and permission penalties.",
        "<b>Decide</b> — ordered rules return exactly one disposition; a connector gate may then only tighten it.",
        "<b>Record</b> — plan started, fixture loaded, proposal created, policy decided, plan completed, each linked by prev_hash.",
        "<b>Dry-run</b> — non-denied items are simulated; the report asserts zero network calls.",
        "<b>Approve</b> — queued items carry approvers and an expiry (default 12 hours).",
        "<b>Apply</b> — refused in the MVP; the refusal itself is an audit event.",
    ])]
    s += [para("Trust boundaries", S_H2)]
    s += [table(
        ["Boundary", "Direction", "Control"],
        [
            ["Control plane &lt;-&gt; cloud APIs", "outbound only", "Least-privilege scopes, identity allowlist, capability gates"],
            ["Control plane &lt;-&gt; Windows companion", "companion dials out; no inbound port", "Folder allowlist, local approval prompt, enrollment token in OS credential store"],
            ["Control plane &lt;-&gt; mobile companion", "device-initiated push only", "OS permissions + device enrollment + biometric local authorization"],
            ["Control plane &lt;-&gt; n8n", "outbound to a registered workflow allowlist", "Production triggers are approval-gated; n8n credentials stay in n8n"],
            ["Control plane &lt;-&gt; model routing", "outbound, redacted payloads only", "Raw-content completion is hard-denied; spend and token caps"],
            ["Audit store", "write-append, read-verify", "Hash chain; retention exceeds every provider trash window"],
        ],
        [1.75 * inch, 1.5 * inch, W - 3.25 * inch],
        bold_first=True,
    )]
    s += [para("State and storage", S_H2)]
    s += [bullets([
        "<b>var/audit/&lt;run_id&gt;.jsonl</b> — the chain. One file per run, append-only, fsynced per event.",
        "<b>var/plans/&lt;plan_id&gt;.json</b> — serialized plan (proposals plus decisions) for approval review.",
        "<b>var/inventory/&lt;inventory_id&gt;.json</b> — labeled sample inventory snapshots.",
        "No database. Files are the source of truth; every persisted object has a generated JSON Schema.",
    ])]

    # -------------------------------------------------- 03 safety model
    s += section("03", "Safety model")
    s += [para("Assets: mail and calendar metadata (never bodies), file metadata across four stores, "
               "the audit chain's integrity, and identity bindings. Credentials live outside the repository.", S_BODY)]
    s += [para("Threats and mitigations", S_H2)]
    s += [table(
        ["Threat", "Mitigation", "Residual risk"],
        [
            ["Agent acts over the wrong signed-in account", "Identity allowlist with explicit deny rows; rules R020 / R021", "Operator misconfigures the allowlist"],
            ["Runaway bulk mutation", "Dry-run default, per-run caps, approval on all delete and unsubscribe", "An approved batch is still large"],
            ["Irreversible external side effect", "Externally visible and irreversible always gated; worst cases denied", "A human approves a bad proposal"],
            ["Audit tampering", "SHA-256 chain, append-only writes, verifier plus tamper demo", "Whole-file deletion (offsite replication is backlog)"],
            ["Secret leakage into logs or docs", "Redaction, gitignore, secret references only, matrix test for secret-like strings", "A human pastes a secret into config"],
            ["Local companion abused as a remote shell", "Outbound-only, empty command allowlist, forbidden roots, local prompt", "Operator adds a dangerous command"],
            ["Mobile over-collection", "Nothing readable by default; OS permission + enrollment + biometric", "Operator opts into notification forwarding"],
            ["Third-party model retention", "Redacted payloads only; raw-content path denied", "Provider-side retention policy"],
            ["Prompt injection from content", "Policy is deterministic code over typed fields; no natural language is executed", "Future content-reading skills must re-establish this"],
        ],
        [1.85 * inch, 2.6 * inch, W - 4.45 * inch],
        bold_first=True,
    )]
    s += [para("Data minimization and redaction", S_H2)]
    s += [para(
        "Redaction runs before any payload is written. Keys named body, content, snippet, text, html, "
        "message, token, access_token, refresh_token, password, secret, api_key, or authorization are "
        "replaced with a digest reference. Evidence stores an opaque source reference plus a digest, never "
        "the observation itself, and notes are capped at 280 characters to discourage copying content into logs.",
        S_BODY,
    )]
    s += [callout(
        "Prompt-injection stance",
        "Untrusted text may influence which category a skill suggests, but it can never change a disposition. "
        "The policy engine reads only typed fields — permission verb, risk tier, reversibility, external "
        "visibility, identity, capability — plus a bounded integer heuristic. There is no path from message "
        "text to a policy override.",
        WARN,
    )]
    s += [Spacer(1, 8), para("Never present in this repository", S_H3)]
    s += [para(
        "Secrets, tokens, OAuth client secrets, cookies, session material, private email addresses beyond the "
        "single allowlisted operator account, real message contents, agent memory contents, raw internal system "
        "prompts, or closed/proprietary tool internals. Only example configuration templates are tracked; live "
        "configuration, environment files, and run artifacts are ignored by version control.",
        S_BODY,
    )]

    # ------------------------------------------------- 04 policy engine
    s += section("04", "Policy engine")
    s += [para("Autonomy modes", S_H2)]
    s += [table(
        ["Mode", "Meaning", "Behavior"],
        [
            ["review_everything", "Default. Nothing executes without a human.", "Every non-denied proposal becomes require_approval (R030)."],
            ["safe_automation", "Auto-execute only an explicit allowlist of reversible, internal-only capabilities.", "Capability must be allowlisted and score at or above the allow threshold; otherwise propose."],
            ["policy_automation", "Threshold-driven, still bounded by every hard rule.", "&gt;=90 allow; &gt;=55 propose; below that require_approval."],
        ],
        [1.35 * inch, 2.4 * inch, W - 3.75 * inch],
        bold_first=True,
    )]
    s += [para("Modes never widen the hard rules. Raising the mode can only affect proposals that already "
               "passed identity, permission, risk, reversibility, external-visibility, and rollback checks.", S_BODY)]
    s += [para("Confidence score (0-100)", S_H2)]
    s += [code(
        "score = 20 (base)\n"
        "      + min(12 * evidence_count, 36)\n"
        "      + 20 reversible | 8 conditionally reversible\n"
        "      + 12 if not externally visible\n"
        "      + 10 if a rollback reference exists\n"
        "      + round(0.30 * skill heuristic)\n"
        "      - risk penalty        {low 0, medium 10, high 25, critical 45}\n"
        "      - permission penalty  {read 0, suggest 0, write 8, unsubscribe 18, delete 30}\n"
        "      clamped to [0, 100]"
    )]
    s += [para(
        "Every term is recorded in the decision's reason list, so a score is always explainable. Scoring and "
        "gating are separate axes: <b>a high score never unlocks a gated capability</b>.", S_BODY,
    )]
    s += [para("Rule table (first match wins)", S_H2)]
    s += [table(
        ["Rule", "Condition", "Result"],
        [
            ["R000", "always", "compute confidence"],
            ["R010", "capability on the deny list", "deny"],
            ["R020", "identity not allowlisted", "deny"],
            ["R021", "permission not granted to that identity", "deny"],
            ["R030", "mode is review_everything", "require_approval"],
            ["R040", "permission is delete or unsubscribe", "require_approval"],
            ["R041", "capability on the always-approve list", "require_approval"],
            ["R050", "action is externally visible", "require_approval"],
            ["R060", "action is irreversible", "require_approval"],
            ["R061", "risk tier is high or critical", "require_approval"],
            ["R070", "mutating action with no rollback reference or procedure", "require_approval"],
            ["R080-R082", "safe_automation: allowlist and threshold checks", "allow or propose"],
            ["R090-R092", "policy_automation: threshold bands", "allow, propose, or require_approval"],
            ["R100", "connector-declared gate is stricter than the decision", "tighten to the connector gate"],
        ],
        [0.85 * inch, 3.5 * inch, W - 4.35 * inch],
        bold_first=True,
    )]
    s += [para("Reversible-first doctrine", S_H2)]
    s += [numbered([
        "Prefer the reversible variant: label over archive, archive over trash, trash over permanent delete, staging move over local delete, draft over send.",
        "A mutating action without a rollback reference cannot be automated (R070).",
        "The rollback reference must be resolvable <i>before</i> execution — a label snapshot, an inbox restore reference, an untrash reference, a prior parent folder, a branch reference to delete.",
        "Audit retention (400 days) must exceed every provider trash window, so the record outlives the ability to undo.",
    ])]
    s += [para("Approvals", S_H2)]
    s += [bullets([
        "Approval-bearing decisions carry required approvers and an expiry (default 720 minutes).",
        "Expired decisions are re-planned and re-scored, never revived: inputs may have changed.",
        "Approvals are recorded as audit events; they can be superseded but never erased.",
        "Batch approval is acceptable only when every item shares one capability and one rollback path.",
    ])]
    s += [para("Configuring policy safely", S_H2)]
    s += [bullets([
        "Keep the safe-automation allowlist short, reversible, and internal-only.",
        "Never move a capability off the deny list without an architecture decision record.",
        "Lowering the allow threshold below 90 requires an ADR and a changelog entry.",
        "Re-run the test suite after every change: it asserts that delete, unsubscribe, externally visible, high-risk, and rollback-less actions are never auto-allowed in any mode.",
    ])]

    # ------------------------------------------------- 05 identity
    s += section("05", "Identity and account selection")
    s += [para(
        "The most likely serious incident is an agent acting correctly on the <b>wrong identity</b>. Multiple "
        "accounts are typically signed in on the same machine and browser, so identity binding is the primary brake.",
        S_LEAD,
    )]
    s += [para("Policy", S_H2)]
    s += [bullets([
        "There is no ambient credential path: every proposal carries an explicit identity.",
        "Identities are allowlisted per provider with <b>separated permission verbs</b>: read, suggest, write, delete, unsubscribe. Granting read never implies write.",
        "A non-allowlisted identity is denied at R020; a permission not granted to that identity is denied at R021 — both before scoring matters.",
        "An entry present with allowlisted set to false is an <b>explicit denial</b>. This is how other signed-in accounts are neutralized.",
        "Credentials themselves live in the OS keychain or a secret manager and are referenced by name only.",
    ])]
    s += [para("Example allowlist shape (illustrative, non-secret)", S_H2)]
    s += [table(
        ["Identity", "Provider", "Allowlisted", "Permissions"],
        [
            ["angelreporters@gmail.com", "google (mail + calendar)", "yes", "read, suggest, write"],
            ["angelreporters@gmail.com", "google_drive", "yes", "read"],
            ["other-google-account@example.com", "google", "<b>no — explicitly forbidden</b>", "—"],
            ["revvel-ops-bot", "github", "yes", "read, suggest"],
            ["dropbox:primary", "dropbox", "yes", "read"],
            ["box:primary", "box", "no — disabled by operator choice", "—"],
        ],
        [1.85 * inch, 1.6 * inch, 1.5 * inch, W - 4.95 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 6), callout(
        "Two independent brakes on the dangerous verbs",
        "The operator identity is granted write for reversible, internal-only mutations such as labeling and "
        "archiving, and is deliberately <b>not</b> granted delete or unsubscribe. Those proposals are therefore "
        "refused twice over: once at the identity layer (R021) and once at the policy layer (R040). Widening a "
        "grant is a reviewable configuration diff, never a runtime decision.",
    )]
    s += [Spacer(1, 8), para("Service accounts", S_H3)]
    s += [para(
        "Service or bot identities (for example a GitHub automation identity) are allowlisted separately and "
        "constrained further at the connector layer by repository, folder, or workflow allowlists. Never reuse a "
        "human identity as a service identity, and never grant a service identity delete or unsubscribe.",
        S_BODY,
    )]

    # ------------------------------------------------- 06 connectors
    s += section("06", "Connector contracts")
    s += [para(
        "Every connector is a skeleton adapter that declares capabilities and refuses to execute. Each capability "
        "names a permission verb, minimum provider scopes, risk tier, reversibility, external visibility, an "
        "approval gate, a rollback statement, and an honest availability value: available, partial, planned, or "
        "unavailable. Every right-hand side — identities, scopes, allowlists, gates, spend caps — is user-configurable.",
        S_BODY,
    )]
    s += [para("Permission verbs are never bundled", S_H2)]
    s += [table(
        ["Verb", "Meaning"],
        [
            ["read", "Fetch metadata or state. No mutation."],
            ["suggest", "Produce proposals locally. Touches nothing external."],
            ["write", "Mutate state reversibly or with a defined rollback."],
            ["delete", "Remove or trash. Always approval-gated; permanent deletion is denied."],
            ["unsubscribe", "Contact a third party. Externally visible, irreversible, always approval-gated."],
        ],
        [1.1 * inch, W - 1.1 * inch],
        bold_first=True,
    )]
    s += [para("Gmail and Calendar", S_H2)]
    s += [table(
        ["Capability", "Verb", "Scope", "Gate", "Rollback"],
        [
            ["messages.search", "read", "gmail.readonly", "allow", "n/a"],
            ["messages.categorize", "suggest", "—", "allow", "discard proposal"],
            ["labels.apply", "write", "gmail.modify", "propose", "remove the fleet-namespaced label"],
            ["threads.archive", "write", "gmail.modify", "propose", "re-add INBOX"],
            ["threads.trash", "delete", "gmail.modify", "require_approval", "untrash within retention"],
            ["subscriptions.unsubscribe", "unsubscribe", "gmail.readonly", "require_approval", "none — manual resubscribe"],
            ["messages.send", "write", "gmail.send", "require_approval", "none"],
            ["calendar.events.list", "read", "calendar.readonly", "allow", "n/a"],
            ["calendar.create_private_hold", "write", "calendar.events", "propose", "delete the created event"],
            ["calendar.invite_guests", "write", "calendar.events", "require_approval", "cancellation only"],
        ],
        [1.85 * inch, 0.75 * inch, 1.15 * inch, 1.15 * inch, W - 4.9 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 6), callout(
        "Do not assume all Gmail operations are available",
        "The reachable operation set depends both on granted scopes and on what the host platform's Gmail "
        "connector actually exposes at runtime. Several capabilities are marked planned or partial for exactly "
        "that reason and may require an independently authorized OAuth client. Permanent deletion, filter "
        "mutation, and forwarding rules are out of scope entirely.",
        WARN,
    )]
    s += [para("File stores", S_H2)]
    s += [table(
        ["Connector", "Sample status", "Read scope stance", "Gated writes"],
        [
            ["Google Drive", "connected — ready to revalidate", "Metadata-readonly or drive.file only; full-drive scopes are never requested", "Move proposes; sharing and trash require approval"],
            ["Dropbox", "connected", "files.metadata.read under a path allowlist", "Move proposes; shared links and delete require approval"],
            ["Box", "<b>disabled — reconnect required, by user choice</b>", "All capabilities resolve to unavailable", "None reachable; do not retrigger authorization"],
            ["Local (Windows)", "not configured", "Metadata and hashes only, inside an explicit folder allowlist", "Staging move proposes; delete is denied outright"],
        ],
        [1.15 * inch, 1.55 * inch, 2.2 * inch, W - 4.9 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 6), callout(
        "Current connector state — labeled sample, revalidate at runtime",
        "Gmail, Calendar, GitHub, and Dropbox are recorded as connected with read and suggest permissions. "
        "<b>Google Drive authorization has succeeded</b> and is recorded as connected — treat it as "
        "<i>ready-to-revalidate</i> rather than proven, because authorization is not access: the folder allowlist "
        "is still empty. <b>Box authorization was dismissed by the operator</b>, so Box is recorded as disabled "
        "with reconnect required; the fleet must never retrigger a Box authorization prompt, and reconnect is "
        "operator-initiated only. The local and mobile companions, n8n, and model routing are not configured. "
        "<b>Every status value here is a non-secret sample and must be revalidated at runtime.</b>",
    )]
    s += [Spacer(1, 8), para("GitHub, n8n, and model routing", S_H2)]
    s += [table(
        ["Capability", "Verb", "Gate", "Notes"],
        [
            ["github.repos.read", "read", "allow", "Repository allowlist; fine-grained token or app only"],
            ["github.issues.propose", "suggest", "allow", "Drafts locally; nothing is posted"],
            ["github.branches.create", "write", "propose", "Rollback deletes the branch reference"],
            ["github.pulls.create", "write", "require_approval", "Externally visible; notifications cannot be recalled"],
            ["github.repos.delete", "delete", "<b>deny</b>", "Hard-denied. No repository is ever created or modified here"],
            ["n8n.workflows.list / executions.read", "read", "allow", "Inventory and reliability metrics"],
            ["n8n.trigger_dry_run", "suggest", "propose", "Only workflows declared side-effect free"],
            ["n8n.trigger_production", "write", "require_approval", "Compensating flow required before enabling"],
            ["n8n.workflows.modify", "write", "require_approval", "Rollback restores an exported workflow snapshot"],
            ["model routing — redacted completion", "suggest", "propose", "Minimized, redacted input; token and spend caps"],
            ["model routing — raw content", "write", "<b>deny</b>", "Sending unredacted personal content is denied"],
        ],
        [2.05 * inch, 0.72 * inch, 1.15 * inch, W - 3.92 * inch],
        bold_first=True,
    )]

    # ------------------------------------------------- 07 companions
    s += section("07", "Companions")
    s += [para("Windows local companion", S_H2)]
    s += [para(
        "A user-installed per-user tray application. It is <b>outbound-only</b>: it dials the control plane over "
        "TLS, never listens on a port, and is not remotely addressable. It operates strictly inside an explicit, "
        "absolute folder allowlist — no wildcards above an allowlisted root, no system directories. An empty "
        "allowlist means it does nothing.",
        S_BODY,
    )]
    s += [table(
        ["Design element", "Rule"],
        [
            ["Folder allowlist", "Explicit absolute paths only. The companion refuses to start if the allowlist includes the Windows directory, Program Files, or a user profile root."],
            ["Enrollment", "One-time operator-generated pairing code; the resulting token is stored in the OS credential store, never in a file in the repository."],
            ["Reads", "Metadata only — path, size, modified time, content hash. File contents never leave the machine."],
            ["Writes", "Reversible staging moves only, and each requires a <b>local</b> approval prompt on the machine in addition to control-plane approval."],
            ["Deletion", "Not implemented and hard-denied. Staging plus retention replaces deletion."],
            ["Command execution", "Signed, user-defined allowlist that is empty by default. Arbitrary shell execution is never enabled; each entry needs a documented compensating action."],
        ],
        [1.3 * inch, W - 1.3 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 10), para("Mobile companion — contract, not an implementation", S_H2)]
    s += [callout(
        "A phone cannot be read by default",
        "Nothing in this system can observe a mobile device. Mobile participation requires all three of: "
        "(1) an <b>installed companion app</b> that the user chose to install, (2) <b>user-approved OS "
        "permissions</b> granted per data class in the operating system settings and revocable at any time, and "
        "(3) a <b>separate local authorization</b> — device enrollment with a pairing code plus device biometric "
        "confirmation, distinct from any cloud OAuth grant. Absent any one of these, every capability resolves to "
        "unavailable.",
        WARN,
    )]
    s += [Spacer(1, 8)]
    s += [table(
        ["Capability", "Verb", "Gate", "Availability"],
        [
            ["capture.push_note", "suggest", "allow", "planned — device-initiated only"],
            ["approvals.respond", "write", "require_approval", "planned — biometric confirmation per approval"],
            ["notifications.summarize_optin", "read", "require_approval", "unavailable — Android-only permission class, off by default"],
            ["files.upload_selected", "read", "require_approval", "unavailable — OS document-picker scope only"],
            ["device.read_arbitrary", "read", "<b>deny</b>", "unavailable — explicitly not offered"],
        ],
        [1.95 * inch, 0.75 * inch, 1.25 * inch, W - 3.95 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 8), para(
        "The channel is device-initiated push only: there is no server-to-device pull path for user data. iOS "
        "restricts background notification and file access far more than Android, so assume less capability, never "
        "more. Revoking an OS permission or unenrolling the device disables the capability immediately.",
        S_BODY,
    )]

    # ------------------------------------------------- 08 workflows
    s += section("08", "Operational workflows")
    s += [para("Daily loop", S_H2)]
    s += [table(
        ["When", "Action", "Command"],
        [
            ["Session start", "Confirm posture and thresholds", "revvel-ops doctor"],
            ["Before planning", "Revalidate connector state and identity grants", "revvel-ops inventory --demo, then a cheap live read"],
            ["Plan", "Build scored, gated proposals", "revvel-ops plan --mode review_everything"],
            ["Simulate", "Confirm zero external calls", "revvel-ops dry-run"],
            ["Review", "Work the approval queue", "read the plan JSON in var/plans"],
            ["Close out", "Prove chain integrity, record the head hash", "revvel-ops verify-audit"],
        ],
        [1.1 * inch, 2.15 * inch, W - 3.25 * inch],
        bold_first=True,
    )]
    s += [para("Email cleanup pass", S_H2)]
    s += [numbered([
        "Check posture and identity grants; confirm the intended verbs are the only ones granted.",
        "Plan in review_everything. Expect four families: label on every thread, archive for stale bulk mail, unsubscribe for high-volume low-engagement senders, and Trash for stale promotional or notification threads only.",
        "Protected categories — security, personal, receipt — are never archived or trashed.",
        "Dry-run and verify zero network calls plus an intact chain.",
        "Review the plan file item by item: identity, target, evidence, rollback reference, and the rule identifiers behind the disposition.",
        "Approve labels first. Never batch-approve unsubscribe or Trash items.",
        "Apply is unavailable in the MVP and records a refusal event. When live adapters exist, apply labels, verify, then archive, then re-review deletions.",
    ])]
    s += [para("Approval triage order", S_H2)]
    s += [bullets([
        "<b>deny</b> — read the rule identifier; if a denial is wrong, fix configuration or the skill. Never bypass.",
        "<b>require_approval</b> — decide individually. Reject anything whose rollback needs more than one sentence.",
        "<b>propose</b> — batch only within one capability and one rollback path.",
        "<b>allow</b> — spot-check that the capability really is reversible and internal-only.",
    ])]
    s += [para("Incident response", S_H2)]
    s += [numbered([
        "Contain: set autonomy to review_everything and stop planning. Never edit or delete anything under the artifact directory.",
        "Preserve: copy the audit directory to a read-only location; work only on copies.",
        "Verify: recompute the chains. Intact means the record is trustworthy; broken means treat the host as untrusted and rotate referenced credentials.",
        "Reconstruct: the policy decision event carries confidence, disposition, rule identifiers, and reasons; the paired proposal event carries identity, capability, target, and evidence digests.",
        "Classify: policy followed but outcome undesired (tighten gates), policy not followed (code defect — failing test first), wrong identity (allowlist error), or action outside the fleet (inventory the other automation).",
        "Recover: execute the documented rollback and append it to the chain.",
        "Postmortem: timeline, evidence identifiers, rule identifiers, root cause, the configuration or code change, and the new test. Reference identifiers, never content.",
    ])]

    # ------------------------------------------------- 09 audit
    s += section("09", "Audit and evidence")
    s += [para("Chain construction", S_H2)]
    s += [code(
        "payload_hash = SHA256(canonical(payload))\n"
        "event_hash   = SHA256(event_id, sequence, recorded_at, run_id, phase, event_type,\n"
        "                      actor, identity, subject_ref, payload_hash, prev_hash)\n"
        "first event   prev_hash = 64 zeros"
    )]
    s += [para(
        "Canonical encoding sorts keys and normalizes timestamps to a single UTC form, so re-reading a line can "
        "never change its hash. Writers open in append mode and flush to disk per event; reopening a run resumes "
        "the chain from the last line. Signature and signer fields exist on every event and are always empty in "
        "the MVP: hash chaining is claimed, non-repudiation is not.",
        S_BODY,
    )]
    s += [para("What verification checks", S_H2)]
    s += [bullets([
        "Sequence numbers are monotonic from zero with no gaps.",
        "Each event's previous-hash equals the prior event's hash; the first links to the genesis value.",
        "Each payload hash matches a recomputation of its payload.",
        "Each event hash matches a recomputation over the sealed field set.",
    ])]
    s += [para("Failure interpretation", S_H2)]
    s += [table(
        ["Error", "Likely cause", "Action"],
        [
            ["payload hash mismatch", "A payload was edited in place", "Incident: preserve and investigate"],
            ["event hash mismatch", "Header field edited, or code version skew", "Check version; otherwise incident"],
            ["previous-hash break", "A line was inserted, removed, or reordered", "Incident: reconstruct from the last good sequence"],
            ["sequence mismatch", "Concurrent writers or a manual edit", "Ensure one writer per run"],
        ],
        [1.4 * inch, 2.3 * inch, W - 3.7 * inch],
        bold_first=True,
    )]
    s += [para("Evidence discipline", S_H2)]
    s += [bullets([
        "Every proposal carries evidence rows: connector, opaque source reference, signal name, SHA-256 digest, and a note capped at 280 characters.",
        "Evidence identifiers and digests are the audit currency — reference them in reviews, tickets, and postmortems instead of pasting content.",
        "If a decision cannot be justified from its evidence rows, that is a defect in the skill, not a reason to approve.",
        "Retention is 400 days and must exceed every provider's trash window. Archive whole files by run; never truncate.",
    ])]
    s += [Spacer(1, 4), callout(
        "Tamper evidence is demonstrable, not asserted",
        "A bundled script copies a real chain to a temporary location, edits a single payload, and shows "
        "verification flipping from intact to broken with the offending line reported. The original log is never "
        "modified. Whole-file deletion remains undetectable until offsite append-only replication ships.",
        OK,
    )]

    # ------------------------------------------------- 10 boundary
    s += section("10", "Runtime capability boundary")
    s += [para(
        "An agent fleet has two very different kinds of ability, and conflating them produces both security "
        "mistakes and false expectations. This handbook documents only the first kind.",
        S_LEAD,
    )]
    s += [table(
        ["Dimension", "Documented runtime skills (in scope)", "Platform-internal capabilities (out of scope)"],
        [
            ["Definition", "Declared capabilities of this control plane and its connectors", "Whatever a hosting agent platform can do internally"],
            ["Where defined", "Connector manifests, skill modules, the capability manifest", "Vendor-internal; deliberately not reproduced"],
            ["Contract", "Stable capability key, permission verb, scopes, gate, rollback, availability", "No contract exposed to this system"],
            ["Auditable here", "Yes — every use is an audit event", "No"],
            ["Policy-gated here", "Yes", "Not by this policy engine"],
        ],
        [1.0 * inch, 2.75 * inch, W - 3.75 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 10), callout(
        "The boundary rule",
        "If a capability cannot be named with a permission verb, a least-privilege scope, an approval gate, and a "
        "rollback, it is <b>not</b> a runtime capability of this fleet, and the fleet must not depend on it. A "
        "platform feature that <i>might</i> exist is treated as absent: unknown capabilities are rejected at plan "
        "time and recorded as such.",
    )]
    s += [Spacer(1, 10), para("Deliberately excluded", S_H2)]
    s += [bullets([
        "Raw internal system prompts or instruction text of any agent platform.",
        "Actual agent memory contents or memory-store internals.",
        "Closed or proprietary tool internals, private API shapes, undocumented endpoints.",
        "Secrets, tokens, cookies, session material, and private addresses beyond the single allowlisted operator account.",
        "Real user data of any kind — every fixture in the repository is synthetic.",
    ])]
    s += [para("Interface contract with a host platform", S_H2)]
    s += [numbered([
        "The platform hands over already-fetched metadata, or invokes the command-line/API surface.",
        "The fleet returns proposals, decisions, and audit references — never raw user content.",
        "Execution, if ever enabled, happens through a declared connector capability with an approval token; the platform's own internal abilities remain outside this policy engine's claims.",
    ])]
    s += [para("Memory boundary", S_H2)]
    s += [para(
        "The fleet keeps three durable artifacts only: audit chains, plans, and inventories. It stores no "
        "conversational memory, no user profile, and no embeddings. Any future memory feature must arrive as a "
        "declared capability with its own retention, redaction, and deletion runbook — never as an implicit side effect.",
        S_BODY,
    )]

    # ------------------------------------------------- 11 implementation
    s += section("11", "Implementation steps")
    s += [para("Phase 0 — shipped in this MVP", S_H2)]
    s += [bullets([
        "Domain models and generated JSON Schemas for every persisted object.",
        "Policy engine: 0-100 scoring, four dispositions, ordered rules, three autonomy modes.",
        "Append-only hash-chained audit log with redaction, verification, and a tamper demonstration.",
        "Email cleanup skill: deterministic categorization plus label, archive, unsubscribe, and Trash proposals with evidence.",
        "Ten connector skeletons with scopes, gates, rollback statements, and honest availability.",
        "Identity allowlist with separated permission verbs, enforced ahead of scoring.",
        "Command-line interface, optional read/plan HTTP surface with no apply endpoint, test suite, and this handbook.",
    ])]
    s += [para("Sequenced phases and exit criteria", S_H2)]
    s += [table(
        ["Phase", "Work", "Exit criterion"],
        [
            ["1 — read-only reality", "Runtime revalidation probes; live metadata ingestion; Drive read inside a non-empty folder allowlist; keychain-backed secret references; approval queue with expiry", "Each scope proven by a cheap read recorded as an audit event; no secret material in files or logs"],
            ["2 — first reversible automation", "Live label adapter with snapshot rollback; promote one capability to safe automation; per-run batch caps; archive adapter", "Rollback restores exactly; two clean weeks of review-mode history before promotion; ADR filed"],
            ["3 — companions", "Windows enrollment and outbound channel; allowlist enforcement with forbidden roots; metadata indexing and staging moves with local prompts; mobile enrollment and approvals", "No inbound listener; companion refuses system or profile roots; biometric per mobile approval; no device data pulled"],
            ["4 — integration breadth", "n8n workflow registry and dry-run triggers; redacted model routing with spend caps; GitHub read and issue drafting; Dropbox dedupe proposals", "Only allowlisted side-effect-free workflows triggerable; raw-content model path still denied; no repository created or modified"],
            ["5 — assurance hardening", "External signer over event hashes; offsite append-only replication; API authentication; multi-approver policy; property-based policy tests", "Signatures verified; whole-file deletion detectable; no unauthenticated route; no generated proposal reaches allow while high-risk, external, or irreversible"],
        ],
        [1.35 * inch, 2.55 * inch, W - 3.9 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 6), callout(
        "Escalation ladder, not a switch",
        "Prove a capability in review_everything for at least two weeks of real plans. Review the false-positive "
        "rate per capability from the audit log. Promote exactly one reversible, internal-only capability into safe "
        "automation with an ADR and a changelog entry. Watch for a week. Only then consider threshold-driven "
        "automation — and never for delete, unsubscribe, send, share, or pull-request creation.",
    )]

    # ------------------------------------------------- 12 limitations
    s += section("12", "Known limitations")
    s += [para(
        "Stated plainly, because an honest limitation list is a safety feature. Each item is tracked in the "
        "repository backlog.",
        S_BODY,
    )]
    s += [table(
        ["#", "Limitation"],
        [
            ["1", "Apply is not implemented anywhere. The fleet cannot execute a single external action."],
            ["2", "All connectors are skeletons: no client libraries, no auth flows, no retry or rate-limit logic."],
            ["3", "Signing is not implemented. Integrity rests on SHA-256 chaining plus filesystem controls; non-repudiation is not claimed."],
            ["4", "The approval queue is a JSON file reviewed by hand. There is no user interface and no notification path."],
            ["5", "Companion applications for Windows and mobile are designs and contracts only — no binaries exist."],
            ["6", "The HTTP surface has no authentication and must remain bound to loopback."],
            ["7", "Categorization is rule-based on purpose: reproducible and auditable rather than clever, so nuanced misclassification is expected."],
            ["8", "Every connector status recorded in the repository is a labeled sample requiring runtime revalidation."],
            ["9", "Retention and rotation of local run artifacts are manual; offsite append-only replication has not shipped."],
            ["10", "Single-operator assumption throughout: no multi-approver policy, no delegation, no role separation."],
            ["11", "Google Drive is authorized but its folder allowlist is empty, so no Drive proposal can be planned yet."],
            ["12", "Box is disabled by operator choice; its capabilities are unavailable and authorization must not be retriggered."],
        ],
        [0.4 * inch, W - 0.4 * inch],
        bold_first=True,
    )]
    s += [Spacer(1, 16)]
    s += [callout(
        "Closing principle",
        "The value of this system is not how much it automates — it is that every action it proposes can be "
        "explained, gated, reversed, and proven after the fact. Automation is earned one reversible capability at "
        "a time.",
    )]
    s += [Spacer(1, 20), para(
        f"{TITLE} · Version {VERSION} · {DATED} · Author: {AUTHOR} · Original design document, no external sources.",
        S_SMALL,
    )]
    return s


if __name__ == "__main__":
    path = build()
    print(f"wrote {path} ({path.stat().st_size / 1024:.0f} KB)")
