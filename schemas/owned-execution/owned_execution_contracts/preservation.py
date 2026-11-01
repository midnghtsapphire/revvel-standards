"""Conservative patch gate; before-images and symlink facts MUST be server-derived."""

from dataclasses import dataclass
from pathlib import PurePosixPath

from .policy import require


@dataclass(frozen=True)
class PatchFile:
    path: str
    before: str | None
    after: str | None
    symlink: bool = False
    binary: bool = False


def safe_path(value: str) -> PurePosixPath:
    require(bool(value) and "\\" not in value and "\x00" not in value, "unsafe_path")
    path = PurePosixPath(value)
    require(not path.is_absolute() and ".." not in path.parts, "unsafe_path")
    require(".git" not in path.parts and ".env" not in path.parts, "protected_path")
    return path


def _uncomment(line: str) -> str:
    stripped = line.lstrip()
    for prefix in ("// ", "# ", "-- ", "* "):
        if stripped.startswith(prefix):
            return stripped[len(prefix):]
    return line


def validate_patch(
    files: tuple[PatchFile, ...], allowed_paths: tuple[str, ...], metadata: dict[str, str] | None = None
) -> None:
    require(bool(files), "empty_patch")
    roots = tuple(safe_path(root) for root in allowed_paths)
    seen = set()
    for file in files:
        path = safe_path(file.path)
        require(file.path not in seen, "duplicate_patch_path")
        seen.add(file.path)
        require(any(path == root or root in path.parents for root in roots), "patch_scope_denied")
        require(not file.symlink and not file.binary, "unsafe_patch_type")
        require(file.after is not None, "file_deletion_denied")
        if file.before is None:
            continue
        before = [line for line in file.before.splitlines() if line.strip()]
        after = file.after.splitlines()
        cursor = 0
        for original in before:
            while cursor < len(after) and after[cursor] != original and _uncomment(after[cursor]) != original:
                cursor += 1
            require(cursor < len(after), "destructive_replacement_denied")
            cursor += 1
        preserved_literally = all(line in after for line in before)
        if not preserved_literally:
            require(file.path.endswith(".json") is False, "strict_json_retirement_denied")
            required = ("date", "agent", "reason", "reference", "replacement", "restoration")
            require(
                metadata is not None and all(metadata.get(key, "").strip() for key in required),
                "retirement_metadata_missing",
            )
            require("REVVEL-DISABLED" in file.after, "retirement_marker_missing")
            require(all(value in file.after for value in metadata.values()), "retirement_metadata_not_in_place")
