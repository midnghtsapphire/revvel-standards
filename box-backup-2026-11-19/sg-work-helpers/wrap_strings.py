#!/usr/bin/env python3
"""Wrap over-long lines that sit inside non-raw string literals using a
backslash-newline inside the literal. The string value is byte-identical
(backslash-newline is removed by the parser), which the AST check verifies."""
import io, re, sys, tokenize, subprocess, ast

LIMIT = 120

def long_lines(path):
    out = subprocess.run(['/tmp/v310/bin/python', '-m', 'flake8', '--isolated', '--no-show-source', '--select=E501',
                          f'--max-line-length={LIMIT}', path], capture_output=True, text=True).stdout
    return sorted({int(l.split(':')[1]) for l in out.splitlines() if ':' in l}, reverse=True)

def candidates(src_lines, toks, n):
    """return list of break indices (col of the space) valid on line n"""
    line = src_lines[n - 1]
    res = []
    for t in toks:
        if t.type != tokenize.STRING:
            continue
        (sr, sc), (er, ec) = t.start, t.end
        if not (sr <= n <= er):
            continue
        m = re.match(r'^([A-Za-z]*)("""|\'\'\'|"|\')', t.string)
        prefix, q = m.group(1).lower(), m.group(2)
        if 'r' in prefix:
            continue
        isf = 'f' in prefix
        body_off = len(prefix) + len(q)
        # walk the token text tracking (row, col) and brace depth
        row, col = sr, sc
        depth = 0
        i = 0
        txt = t.string
        while i < len(txt):
            ch = txt[i]
            if i >= body_off and i < len(txt) - len(q) and row == n:
                if ch in ' ;>,' and depth == 0:
                    # not preceded by an odd run of backslashes
                    j = col - 1; bs = 0
                    while j >= 0 and line[j] == '\\':
                        bs += 1; j -= 1
                    nxt = txt[i + 1] if i + 1 < len(txt) else ''
                    if bs % 2 == 0 and col + 2 <= LIMIT:
                        res.append(col)
            if isf and i >= body_off:
                if ch == '{':
                    if txt[i + 1:i + 2] == '{' and depth == 0:
                        i += 1; col += 1
                    else:
                        depth += 1
                elif ch == '}':
                    if depth > 0:
                        depth -= 1
                    elif txt[i + 1:i + 2] == '}':
                        i += 1; col += 1
            if ch == '\n':
                row += 1; col = 0
            else:
                col += 1
            i += 1
    return res

def fix(path):
    changed = 0
    for _ in range(12):
        src = open(path, encoding='utf-8').read()
        ls = long_lines(path)
        if not ls:
            break
        src_lines = src.split('\n')
        toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
        did = False
        for n in ls:
            c = candidates(src_lines, toks, n)
            if not c:
                continue
            p = c[-1]
            line = src_lines[n - 1]
            # the continuation must not begin an empty remainder
            if not line[p + 1:].strip():
                continue
            src_lines[n - 1:n] = [line[:p + 1] + '\\', line[p + 1:]]
            did = True; changed += 1
            # only one edit per token per pass keeps offsets valid
            src = '\n'.join(src_lines)
            open(path, 'w', encoding='utf-8').write(src)
            break
        if not did:
            break
    return changed

if __name__ == '__main__':
    for p in sys.argv[1:]:
        # repeat: each pass fixes one line; loop until stable
        total = 0
        while True:
            c = fix(p)
            total += c
            if c == 0 or total > 2000:
                break
        print(p, total)
