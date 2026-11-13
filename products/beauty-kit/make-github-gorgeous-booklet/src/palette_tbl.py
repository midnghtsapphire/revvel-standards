import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "_shared"))
from contrast import ratio
P = dict(navy="1B1F4B", ink="14163A", yellow="FFD23F", teal="19C3B1", hibiscus="D81B60", cream="FFF4E0", lavender="B8A1FF")
pairs = [("Cream", "cream", "Deep ink", "ink"), ("Cream", "cream", "Navy", "navy"), ("Pellet yellow", "yellow", "Deep ink", "ink"), ("Lagoon teal", "teal", "Deep ink", "ink"),
         ("Lei lavender", "lavender", "Deep ink", "ink"), ("Deep ink", "ink", "Sand cream", "cream"), ("Deep ink", "ink", "Pellet yellow", "yellow"), ("Deep ink", "ink", "Lagoon teal", "teal"),
         ("Deep ink", "ink", "Lei lavender", "lavender"), ("Hibiscus", "hibiscus", "Sand cream", "cream"), ("Sand cream", "cream", "Hibiscus", "hibiscus"),
         ("Hibiscus", "hibiscus", "Deep ink", "ink"), ("Lagoon teal", "teal", "Sand cream", "cream"), ("Lei lavender", "lavender", "Sand cream", "cream")]
rows = [(f"{a}", f"{b}", ratio(P[ak], P[bk])) for a, ak, b, bk in pairs]
