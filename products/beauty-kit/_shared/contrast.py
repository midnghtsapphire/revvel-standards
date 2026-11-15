"""WCAG 2.x contrast helper for the Hula Arcade palette."""
P = dict(navy="1B1F4B", ink="14163A", yellow="FFD23F", teal="19C3B1", hibiscus="D81B60", cream="FFF4E0", lavender="B8A1FF")
def lin(c):
    c/=255
    return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def lum(h):
    r,g,b=[int(h[i:i+2],16) for i in (0,2,4)]
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def ratio(a,b):
    la,lb=lum(a),lum(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
if __name__=="__main__":
    for fg in P:
        print(fg.ljust(9), *[f"{bg}:{ratio(P[fg],P[bg]):5.2f}" for bg in P])
