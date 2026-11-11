"""Build a GEPA train/validation/test set from historical WR markdown.

Source of examples: every markdown file in wr/issues. Numbered
issue-<id>-*.md files cite that id. Other historical WR notes cite their
filename stem and take a stable split id from the filename hash, so they are
kept in the set. The request text is the title plus acceptance checkboxes
when those lines exist, otherwise the title plus a short excerpt.
required_terms always includes that citation, plus distinctive words from the
acceptance lines. Splits are deterministic from the id so a later run does
not move an example from test into train.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ISSUE_NAME = re.compile(r"^issue-(\d+)-")
HEADING = re.compile(r"^#\s+(.+)$", re.M)
CHECKBOX = re.compile(r"^\s*[-*]\s+\[[ xX]\]\s+(.+)$", re.M)
WORD = re.compile(r"[A-Za-z][A-Za-z0-9_+-]{4,}")
STOPWORDS = frozenset(
    """
    about after again agent agents before being build built could every first
    from have issue other should their there these those under using where
    which while would write
    """.split()
)
VAL_CAP = 24
REQUEST_CAP = 2000


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _title(text: str, issue_id: int) -> str:
    match = HEADING.search(text)
    raw = match.group(1).strip() if match else "WR {0}".format(issue_id)
    raw = re.sub(r"^\[WR\]\s*", "", raw)
    raw = re.sub(r"^WR:\s*", "", raw)
    return raw.strip() or "WR {0}".format(issue_id)


def _terms(checkboxes: list[str], issue_id: int) -> list[str]:
    terms = ["#{0}".format(issue_id)]
    seen = {terms[0].casefold()}
    for line in checkboxes:
        for word in WORD.findall(line):
            key = word.casefold()
            if key in STOPWORDS or key in seen:
                continue
            seen.add(key)
            terms.append(word)
            if len(terms) >= 7:
                return terms
    return terms


def _request(issue_id: int, title: str, checkboxes: list[str], body: str) -> str:
    lines = ["Work request #{0}: {1}".format(issue_id, title)]
    if checkboxes:
        lines.append("")
        lines.append("Acceptance criteria:")
        for item in checkboxes[:12]:
            lines.append("- " + item.strip()[:240])
    else:
        excerpt = body.strip().replace("\r\n", "\n")
        if len(excerpt) > 600:
            excerpt = excerpt[:600]
        lines.append("")
        lines.append(excerpt)
    text = "\n".join(lines).strip()
    if len(text) > REQUEST_CAP:
        text = text[:REQUEST_CAP]
    return text


def _identity(path: Path) -> tuple[int, str, int]:
    """Issue number (0 when the file has none), citation term, and split id.

    Several archives share one issue number with different filenames, so the
    split id is a filename hash. The citation term stays the real issue id
    when the filename has one, and the filename stem otherwise.
    """
    digest = int(hashlib.sha256(path.name.encode("utf-8")).hexdigest()[:12], 16)
    match = ISSUE_NAME.match(path.name)
    if match:
        issue_id = int(match.group(1))
        return issue_id, "#{0}".format(issue_id), digest
    return 0, path.stem, digest


def example_from_file(path: Path) -> dict:
    """One example from one WR markdown file."""
    issue_id, label, split_id = _identity(path)
    body = path.read_text(encoding="utf-8", errors="replace")
    checkboxes = [item.strip() for item in CHECKBOX.findall(body) if item.strip()]
    title = _title(body, issue_id or 0)
    terms = _terms(checkboxes, issue_id or 0)
    terms[0] = label
    header = "Work request #{0}:".format(issue_id or 0)
    request = _request(issue_id or 0, title, checkboxes, body).replace(
        header, "Work request {0}:".format(label), 1
    )
    return {
        "issue": issue_id,
        "split_id": split_id,
        "title": title,
        "source": str(path),
        "request": request,
        "required_terms": terms,
    }


def assign_splits(examples: list[dict], val_cap: int = VAL_CAP) -> dict:
    """15% test via issue id modulo. Validation is a stride of at most val_cap.

    The stride keeps the validation set small because GEPA's auto=light budget
    grows with the validation length. The remainder is train. Test is never
    folded into train: it is the held-out benchmark split.
    """
    ordered = sorted(examples, key=lambda item: item["split_id"])
    test = [item for item in ordered if item["split_id"] % 20 < 3]
    rest = [item for item in ordered if item["split_id"] % 20 >= 3]
    if len(rest) < 2 or not test:
        raise ValueError("Historical WRs did not yield nonempty train, validation, and test splits")
    take = val_cap if len(rest) > val_cap + 1 else max(1, len(rest) // 5)
    step = max(1, len(rest) // take)
    validation = rest[::step][:take]
    chosen = {item["split_id"] for item in validation}
    train = [item for item in rest if item["split_id"] not in chosen]
    if not train or not validation:
        raise ValueError("Split left train or validation empty")
    requests = [item["request"] for item in train + validation + test]
    if len(set(requests)) != len(requests):
        raise ValueError("Repeated requests would leak between evaluation splits")
    return {"train": train, "validation": validation, "test": test}


def build_trainset(issues_dir: Path) -> dict:
    files = sorted(path for path in issues_dir.glob("*.md") if path.is_file())
    examples = [example_from_file(path) for path in files]
    ids = [item["split_id"] for item in examples]
    if len(set(ids)) != len(ids):
        raise ValueError("Two WR files produced the same split id")
    skipped = 0
    # Relative source paths when the file lives under the repo, so the JSON
    # does not embed a machine-specific absolute path.
    root = repo_root()
    for example in examples:
        source = Path(example["source"])
        try:
            example["source"] = str(source.resolve().relative_to(root))
        except ValueError:
            example["source"] = str(source)
    splits = assign_splits(examples)
    return {
        "source": str(issues_dir),
        "files_seen": len(files),
        "examples": len(examples),
        "skipped_unnumbered": skipped,
        "minimum": 100,
        "meets_minimum": len(examples) >= 100,
        "counts": {name: len(rows) for name, rows in splits.items()},
        "splits": splits,
    }


def write_trainset(payload: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def load_trainset(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))
