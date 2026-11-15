"""Original Hula Arcade pixel art, drawn as <rect> grids. Everything here is original to AudreyBuildsAI."""
P = dict(navy="1B1F4B", ink="14163A", yellow="FFD23F", teal="19C3B1", hibiscus="D81B60", cream="FFF4E0", lavender="B8A1FF")
C = {k: "#"+v for k, v in P.items()}
C.update(dict(
    hair="#2E1E2B", hairhi="#4F3548", skin="#E0A070", skinsh="#C48353", pinklt="#FF7FA8",
    green="#2FA05A", greendk="#1E7A43", sand="#E8CFA0", sanddk="#C9AE7C", brown="#8A5A3A", white="#FFFFFF",
    tealdk="#0F8F83", skyhi="#7FE3D8", violet="#6C4FD6",
))

def grid_svg_body(rows, legend, x0=0, y0=0, s=4):
    """Return <rect> markup for an ASCII grid; horizontal runs are merged to keep files small."""
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch == ".":
                x += 1; continue
            e = x
            while e < len(row) and row[e] == ch: e += 1
            out.append(f'<rect x="{x0+x*s}" y="{y0+y*s}" width="{(e-x)*s}" height="{s}" fill="{legend[ch]}"/>')
            x = e
    return "".join(out)

def svg(w, h, body, title=None, desc=None, extra_defs=""):
    t = f"<title>{title}</title>" if title else ""
    d = f"<desc>{desc}</desc>" if desc else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'shape-rendering="crispEdges" role="img">{t}{d}{extra_defs}{body}</svg>')

# ---------- sprites -------------------------------------------------------
HIBISCUS = [  # 9x9
    "..PP.PP..",
    ".PPPPPPP.",
    "PPPpppPPP",
    "PPpYYYpPP",
    "PPpYmYpPP",
    "PPpYYYpPP",
    "PPPpppPPP",
    ".PPPPPPP.",
    "..PP.PP..",
]
HIB_L = dict(P=C["hibiscus"], p=C["pinklt"], m=C["ink"], Y=C["yellow"])

PALM = [  # 16x18
    "....GGG....GGG..",
    "..GGGGGGGGGGGGG.",
    ".GGgGGGGGGGGgGGG",
    "GGg..GGGGGGg..GG",
    "G....gGGGGg....G",
    ".....GGgGGG.....",
    "......GBBg......",
    ".......BB.......",
    ".......BB.......",
    "......BBb.......",
    "......BB........",
    "......BB........",
    ".....BBb........",
    ".....BB.........",
    "..ssssssssss....",
    ".ssSSSSSSSSSss..",
    "ssSSSSSSSSSSSss.",
    "................",
]
PALM_L = dict(G=C["green"], g=C["greendk"], B=C["brown"], b=C["brown"], s=C["sanddk"], S=C["sand"])

PELLET = ["..yy..", ".yyyy.", "yyyyyy", "yyyyyy", ".yyyy.", "..yy.."]
PELLET_L = dict(y=C["yellow"])
PELLET_S = [".yy.", "yyyy", "yyyy", ".yy."]

GLITCH = [  # eyeless glitch blob 14x12 - original: flat bottom, no eyes
    "...vvvvvvvv...",
    "..vvvvvvvvvv..",
    ".vvvvlvvvvvvv.",
    "vvvvvlvvvvvvvv",
    "vvvvvvvvvvddvv",
    "vvvvvvvvvvddvv",
    "vvdddvvvvvvvvv",
    "vvdddvvvvlvvvv",
    "vvvvvvvvvlvvvv",
    ".vvvvvvvvvvvv.",
    "..vvvv..vvvv..",
    "..dd......dd..",
]
GLITCH_L = dict(v=C["lavender"], l=C["cream"], d=C["violet"])

# Lil Aud-Bod: pixel hula dancer, 16 x 26.  K hair, H highlight, S skin, s shadow, E eye, M mouth, P/p flower, Y lei, T top, G/g skirt
HULA = [
    "......KKKK......",
    "....KKHHHHKK.pp.",
    "...KKHHKKKKKpPPp",
    "..KKHKSSSSSKKpPp",
    "..KKKSSSSSSSKK..",
    "..KKSSESSESSKK..",
    "..KKSSSSSSSSKK..",
    "..KKSSSMMSSSKK..",
    "..KK.SSSSSS.KK..",
    "..KK..sSSs..KK..",
    "..KK.YYYYYY.KK..",
    "..KSSYYTTYYSSK..",
    ".SSS.YTTTTY.SSS.",
    "SS...YYYYYY...SS",
    "S...sSSSSSSs....",
    "....GGGGGGGG....",
    "...GgGgGgGgGG...",
    "..GGgGGgGGgGGG..",
    "..GgGGgGGgGGgG..",
    "..GGgGGgGGgGGG..",
    "...gG.gG.gG.g...",
    "....sSS..SSs....",
    "....SSs..sSS....",
    "....SS....SS....",
    "...SSS....SSS...",
    "................",
]
HULA_L = dict(K=C["hair"], H=C["hairhi"], S=C["skin"], s=C["skinsh"], E=C["ink"], M=C["hibiscus"],
              P=C["hibiscus"], p=C["pinklt"], Y=C["yellow"], T=C["hibiscus"], G=C["teal"], g=C["tealdk"])

# Auky: round yellow friend, full circle (no wedge/chomp), teal bow, hibiscus.  16 x 16
AUKY = [
    "......bbbb......",
    "....bbBBBBbb....",
    "....bbbBBbbb.pp.",
    "....yyyyyyyypPPp",
    "..yyyyyyyyyyypPp",
    ".yyyyyyyyyyyyyy.",
    ".yyykkyyyykkyyy.",
    "yyyykkyyyykkyyyy",
    "yyyyyyyyyyyyyyyy",
    "yyrryyyyyyyyrryy",
    "yyyyymmmmmmyyyyy",
    ".yyyyymmmmyyyyy.",
    ".yyyyyyyyyyyyyy.",
    "..yyyyyyyyyyyy..",
    "....yyyyyyyy....",
    "......yyyy......",
]
AUKY_L = dict(y=C["yellow"], k=C["ink"], r=C["pinklt"], m=C["hibiscus"], b=C["teal"], B=C["tealdk"],
              P=C["hibiscus"], p=C["pinklt"])

WAVE_TILE = [  # 16 x 6, tiles horizontally
    "................",
    "....tt......tt..",
    "..tttttt..tttttt",
    "tttttttttttttttt",
    "dddddddddddddddd",
    "................",
]
WAVE_L = dict(t=C["teal"], d=C["tealdk"])

def sprite(rows, legend, s=4, title=None):
    w, h = len(rows[0])*s, len(rows)*s
    return svg(w, h, grid_svg_body(rows, legend, s=s), title=title)

def sprite_g(rows, legend, x, y, s=4):
    return grid_svg_body(rows, legend, x0=x, y0=y, s=s)

# ---------------------------------------------------------------- pixel font (5x7, original glyph set)
_G = {
 "A": [".###.","#...#","#...#","#####","#...#","#...#","#...#"], "B": ["####.","#...#","#...#","####.","#...#","#...#","####."],
 "C": [".####","#....","#....","#....","#....","#....",".####"], "D": ["####.","#...#","#...#","#...#","#...#","#...#","####."],
 "E": ["#####","#....","#....","####.","#....","#....","#####"], "F": ["#####","#....","#....","####.","#....","#....","#...."],
 "G": [".####","#....","#....","#.###","#...#","#...#",".###."], "H": ["#...#","#...#","#...#","#####","#...#","#...#","#...#"],
 "I": ["#####","..#..","..#..","..#..","..#..","..#..","#####"], "J": ["..###","...#.","...#.","...#.","...#.","#..#.",".##.."],
 "K": ["#...#","#..#.","#.#..","##...","#.#..","#..#.","#...#"], "L": ["#....","#....","#....","#....","#....","#....","#####"],
 "M": ["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"], "N": ["#...#","##..#","#.#.#","#..##","#...#","#...#","#...#"],
 "O": [".###.","#...#","#...#","#...#","#...#","#...#",".###."], "P": ["####.","#...#","#...#","####.","#....","#....","#...."],
 "Q": [".###.","#...#","#...#","#...#","#.#.#","#..#.",".##.#"], "R": ["####.","#...#","#...#","####.","#.#..","#..#.","#...#"],
 "S": [".####","#....","#....",".###.","....#","....#","####."], "T": ["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
 "U": ["#...#","#...#","#...#","#...#","#...#","#...#",".###."], "V": ["#...#","#...#","#...#","#...#","#...#",".#.#.","..#.."],
 "W": ["#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"], "X": ["#...#","#...#",".#.#.","..#..",".#.#.","#...#","#...#"],
 "Y": ["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."], "Z": ["#####","....#","...#.","..#..",".#...","#....","#####"],
 "0": [".###.","#...#","#..##","#.#.#","##..#","#...#",".###."], "1": ["..#..",".##..","..#..","..#..","..#..","..#..",".###."],
 "2": [".###.","#...#","....#","...#.","..#..",".#...","#####"], "3": ["####.","....#","....#",".###.","....#","....#","####."],
 "4": ["#...#","#...#","#...#","#####","....#","....#","....#"], "5": ["#####","#....","####.","....#","....#","#...#",".###."],
 "6": [".###.","#....","#....","####.","#...#","#...#",".###."], "7": ["#####","....#","...#.","..#..",".#...",".#...",".#..."],
 "8": [".###.","#...#","#...#",".###.","#...#","#...#",".###."], "9": [".###.","#...#","#...#",".####","....#","....#",".###."],
 ".": [".",".",".",".",".",".","#"], ",": ["..","..","..","..",".#",".#","#."], "!": ["#","#","#","#","#",".","#"],
 "?": [".###.","#...#","....#","..##.","..#..",".....","..#.."], "-": ["....","....","....","####","....","....","...."],
 ":": [".","#",".",".",".","#","."], "/": ["....#","....#","...#.","..#..",".#...","#....","#...."], "'": ["#","#",".",".",".",".","."],
 "+": [".....","..#..","..#..","#####","..#..","..#..","....."], "#": [".#.#.","#####",".#.#.",".#.#.","#####",".#.#.","....."],
 "(": ["..#",".#.","#..","#..","#..",".#.","..#"], ")": ["#..",".#.","..#","..#","..#",".#.","#.."],
 "_": [".....",".....",".....",".....",".....",".....","#####"], ">": ["#...",".#..","..#.","...#","..#.",".#..","#..."],
 "<": ["...#","..#.",".#..","#...",".#..","..#.","...#"], "&": [".##..","#..#.","#.#..",".#...","#.#.#","#..#.",".##.#"],
 " ": ["...","...","...","...","...","...","..."],
}
def text_width(s, scale=1, gap=1):
    s = s.upper(); n = 0
    for i, ch in enumerate(s):
        g = _G.get(ch, _G[" "]); n += len(g[0]) + (gap if i < len(s) - 1 else 0)
    return n * scale
def text_rects(s, x, y, unit, fill, scale=1, gap=1):
    """Pixel text. x,y in SVG px, unit = px per font pixel at scale 1."""
    out, cx = [], x
    for ch in s.upper():
        g = _G.get(ch, _G[" "])
        for r, row in enumerate(g):
            c = 0
            while c < len(row):
                if row[c] == "#":
                    e = c
                    while e < len(row) and row[e] == "#": e += 1
                    out.append(f'<rect x="{cx+c*unit*scale}" y="{y+r*unit*scale}" width="{(e-c)*unit*scale}" height="{unit*scale}" fill="{fill}"/>')
                    c = e
                else: c += 1
        cx += (len(g[0]) + gap) * unit * scale
    return "".join(out)

# ---------------------------------------------------------------- scenes
def _pix_circle(cx, cy, r, u, fill):
    out = []
    for y in range(-r, r + 1):
        w = int((r * r - y * y) ** 0.5)
        out.append(f'<rect x="{(cx-w)*u}" y="{(cy+y)*u}" width="{(2*w+1)*u}" height="{u}" fill="{fill}"/>')
    return "".join(out)

def _theme(light):
    return dict(bg=C["cream"] if light else C["ink"], sun=C["lavender"] if light else C["navy"],
                title=C["hibiscus"] if light else C["yellow"], text=C["ink"] if light else C["cream"],
                pellet=C["hibiscus"] if light else C["yellow"], ring=C["hibiscus"] if light else C["teal"])

DEFAULTS = {
    "hero": ("ALOHA, WORLD!", ("SHIPPING WITH ALOHA", "ONE PELLET AT A TIME")),
    "minimal": ("ALOHA!", ("THIS IS MY CORNER OF THE INTERNET",)),
    "dashboard": ("BUILD LOG", ("SHIP. LEARN. REPEAT.",)),
}
def banner(layout="hero", light=False, title=None, tagline=None):
    """Original pixel banner. 1 unit = 5 px. hero 1280x320, minimal 1280x220, dashboard 1280x280."""
    dt, dtag = DEFAULTS[layout]
    title = title or dt
    if tagline is None: tagline = dtag
    if isinstance(tagline, str): tagline = (tagline,)
    t = _theme(light); u = 5
    W = 256
    H = {"hero": 64, "minimal": 44, "dashboard": 56}[layout]
    b = [f'<rect width="{W*u}" height="{H*u}" fill="{t["bg"]}"/>']
    if layout == "hero":
        b.append(_pix_circle(214, 30, 22, u, t["sun"]))
        for yy in (40, 46, 50, 53):   # retro sunset stripes cut into the sun
            b.append(f'<rect x="{190*u}" y="{yy*u}" width="{48*u}" height="{u}" fill="{t["bg"]}"/>')
    elif layout == "minimal":
        b.append(_pix_circle(228, 16, 12, u, t["sun"]))
    else:
        b.append(f'<rect x="0" y="{3*u}" width="{W*u}" height="{u}" fill="{t["ring"]}"/>')
        b.append(f'<rect x="0" y="{(H-9)*u}" width="{W*u}" height="{u}" fill="{t["ring"]}"/>')
    for i in range(W // 16 + 1):
        b.append(sprite_g(WAVE_TILE, WAVE_L, i*16*u, (H-6)*u, u))
    ty = {"hero": 8, "minimal": 6, "dashboard": 10}[layout]
    b.append(text_rects(title, 12*u, ty*u, u, t["title"], scale=2))
    sy = ty + 14 + 4
    for k, line in enumerate(tagline):
        b.append(text_rects(line, 12*u, (sy + k*10)*u, u, t["text"], scale=1))
    if layout == "hero":
        for i in range(13): b.append(sprite_g(PELLET_S, {"y": t["pellet"]}, (12 + i*10) * u, 48 * u, u))
        b.append(sprite_g(AUKY, AUKY_L, 148*u, 38*u, u))
        b.append(sprite_g(GLITCH, GLITCH_L, 172*u, 46*u, u))
        b.append(sprite_g(HULA, HULA_L, 214*u, 6*u, 2*u))
        b.append(sprite_g(HIBISCUS, HIB_L, 238*u, 4*u, u))
    elif layout == "minimal":
        b.append(sprite_g(PALM, PALM_L, 216*u, 12*u, u))
        b.append(sprite_g(HIBISCUS, HIB_L, 238*u, 28*u, u))
    else:
        b.append(sprite_g(AUKY, AUKY_L, 150*u, 16*u, u))
        for i in range(8): b.append(sprite_g(PELLET_S, {"y": t["pellet"]}, (172 + i*8)*u, 22*u, u))
        b.append(sprite_g(GLITCH, GLITCH_L, 238*u, 20*u, u))
    return svg(W*u, H*u, "".join(b), title=f"{title} banner", desc="Original Hula Arcade pixel banner")

def divider(kind="pellets", light=False, w=800):
    t = _theme(light); u = 3
    if kind == "pellets":
        n = w // (u*10)
        body = "".join(sprite_g(PELLET_S, {"y": t["pellet"]}, (2 + i*10) * u + 4, 4*u, u) for i in range(n))
        return svg(w, 12*u+4, body, title="Pellet divider")
    n = w // (16*u) + 1
    body = "".join(sprite_g(WAVE_TILE, WAVE_L, i*16*u, 0, u) for i in range(n))
    return svg(w, 6*u, f'<g>{body}</g>', title="Wave divider")

BADGE_COLORS = {  # name -> (fill, text) every pair >= 4.5:1
    "yellow": (C["yellow"], C["ink"]), "teal": (C["teal"], C["ink"]), "lavender": (C["lavender"], C["ink"]),
    "hibiscus": (C["hibiscus"], C["cream"]), "navy": (C["navy"], C["cream"]), "cream": (C["cream"], C["ink"]),
}
def badge(text, color="yellow", u=3):
    fill, fg = BADGE_COLORS[color]
    tw = text_width(text) * u; pad = 4 * u; h = 11 * u; w = tw + 2 * pad
    body = [f'<rect x="{u}" y="0" width="{w-2*u}" height="{h}" fill="{C["ink"]}"/>', f'<rect x="0" y="{u}" width="{w}" height="{h-2*u}" fill="{C["ink"]}"/>',
            f'<rect x="{u}" y="{u}" width="{w-2*u}" height="{h-2*u}" fill="{fill}"/>',
            text_rects(text, pad, 2*u, u, fg)]
    return svg(w, h, "".join(body), title=text)
