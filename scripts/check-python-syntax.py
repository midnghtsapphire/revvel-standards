#!/usr/bin/env python3
"""Check that every Python file given on stdin parses.

Reads one path per line, compiles each in memory, and prints every file that
fails with its line number and message. Exits 1 if any file failed.

Single process on purpose: spawning `py -m py_compile` once per file over the
~630 tracked Python files in this repo takes minutes and times out. Compiling
in memory also avoids writing __pycache__ into the tree.
"""
import pathlib
import sys


def main() -> int:
    paths = [line.strip() for line in sys.stdin if line.strip()]
    if not paths:
        print("no paths on stdin -- nothing was checked", file=sys.stderr)
        return 2

    failures = []
    for rel in paths:
        p = pathlib.Path(rel)
        try:
            source = p.read_bytes()
        except OSError as exc:
            failures.append("%s: cannot read (%s)" % (rel, exc))
            continue
        try:
            compile(source, rel, "exec")
        except SyntaxError as exc:
            failures.append("%s:%s: %s" % (rel, exc.lineno, exc.msg))
        except ValueError as exc:
            # e.g. source containing null bytes
            failures.append("%s: %s" % (rel, exc))

    print("checked %d files, %d failed" % (len(paths), len(failures)))
    for line in failures:
        print("  " + line)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
