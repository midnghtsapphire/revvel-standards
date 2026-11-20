#!/usr/bin/env python3
"""ins.py <config.yml> <job_anchor_line_exact_prefix_comment> ... see usage in caller; additive insert only."""
import sys

def insert_before(s, anchor, text):
    assert s.count(anchor) == 1, (anchor, s.count(anchor))
    return s.replace(anchor, text + anchor, 1)

def insert_after(s, anchor, text, which=1):
    # nth occurrence
    idx = -1
    for _ in range(which):
        idx = s.index(anchor, idx + 1)
    end = idx + len(anchor)
    return s[:end] + text + s[end:]
