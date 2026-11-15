"""Hula Arcade palette: Audrey's seven brand colours plus a few *derived* shades.
Derived shades exist only so text clears WCAG AA (4.5:1) on both dark and light backgrounds.
Run `python3 palette.py` to print and assert every text/background pair."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "_shared")); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from contrast import ratio

BRAND = dict(navy="#1B1F4B", ink="#14163A", yellow="#FFD23F", teal="#19C3B1", hibiscus="#D81B60", cream="#FFF4E0", lavender="#B8A1FF")

# derived shades (documented in the guide)
D = dict(
    night_hi="#252A63",     # dark hover / selection surface
    night_line="#3A4090",   # dark borders (UI, needs only 3:1 against ink)
    night_muted="#A9A8D6",  # dark secondary text
    hib_light="#FF7FA8",    # hibiscus tint for text on dark (brand hibiscus is only 3.5:1 on ink)
    sky="#7FE3D8",          # light teal for types on dark
    day_side="#F6E6C8",     # light sidebar surface
    day_hi="#EBD7B0",       # light hover / selection surface
    day_line="#D6BE92",     # light borders
    day_muted="#4E5180",    # light secondary text
    day_teal="#0A6B63",     # teal darkened for text on cream
    day_violet="#5B3FB8",   # lavender darkened for text on cream
    day_gold="#7D4A00",     # yellow darkened for text on cream
    day_blue="#0B5F8C",     # type colour on cream
    day_green="#1B6B3A",
    mint="#8EE59A",         # ANSI green on dark
    blue_dk="#8FB4FF",      # ANSI blue on dark
    day_hib="#B5124F",      # hibiscus deepened for text on cream/sand surfaces
)
ALL = {**BRAND, **D}

# (foreground, background, minimum) -- every text pair used by the themes
PAIRS = [
    ("mint","ink",4.5),("blue_dk","ink",4.5),
    # dark
    ("cream","ink",4.5),("cream","navy",4.5),("night_muted","ink",4.5),("night_muted","navy",4.5),
    ("yellow","ink",4.5),("teal","ink",4.5),("lavender","ink",4.5),("hib_light","ink",4.5),("sky","ink",4.5),
    ("hib_light","navy",4.5),("teal","navy",4.5),("yellow","navy",4.5),("lavender","navy",4.5),
    ("cream","night_hi",4.5),("yellow","night_hi",4.5),("hib_light","night_hi",4.5),("teal","night_hi",4.5),("lavender","night_hi",4.5),("sky","night_hi",4.5),("night_muted","night_hi",4.5),
    ("ink","yellow",4.5),("ink","teal",4.5),("cream","hibiscus",4.5),("ink","lavender",4.5),
    # light
    ("ink","cream",4.5),("ink","day_side",4.5),("ink","day_hi",4.5),
    ("hibiscus","cream",4.5),("day_muted","cream",4.5),("day_muted","day_side",4.5),("day_muted","day_hi",4.5),
    ("day_teal","cream",4.5),("day_violet","cream",4.5),("day_gold","cream",4.5),("day_blue","cream",4.5),("day_green","cream",4.5),
    ("day_teal","day_hi",4.5),("day_violet","day_hi",4.5),("day_gold","day_hi",4.5),("day_blue","day_hi",4.5),("day_green","day_hi",4.5),("day_hib","day_hi",4.5),("day_hib","day_side",4.5),("day_hib","cream",4.5),
    ("day_teal","day_side",4.5),("day_violet","day_side",4.5),("day_gold","day_side",4.5),("day_blue","day_side",4.5),("day_green","day_side",4.5),
    ("cream","hibiscus",4.5),("cream","day_violet",4.5),("cream","day_teal",4.5),("cream","ink",4.5),
]
def check(verbose=True):
    rows, bad = [], []
    for f, b, m in PAIRS:
        r = ratio(ALL[f][1:], ALL[b][1:])
        rows.append((f, b, r, m))
        if r < m: bad.append((f, b, r, m))
    if verbose:
        for f, b, r, m in rows: print(f"{f:12s} on {b:10s} {r:5.2f}:1 {'OK' if r>=m else 'FAIL'}")
    return rows, bad
if __name__ == "__main__":
    rows, bad = check()
    print("FAILURES:", bad)
    sys.exit(1 if bad else 0)
