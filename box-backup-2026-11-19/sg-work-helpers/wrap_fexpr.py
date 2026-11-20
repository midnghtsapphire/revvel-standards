import sys, subprocess
LIMIT = 120
def long_lines(path):
    out = subprocess.run(['/tmp/v310/bin/python','-m','flake8','--isolated','--no-show-source','--select=E501',f'--max-line-length={LIMIT}',path],capture_output=True,text=True).stdout
    return sorted({int(l.split(':')[1]) for l in out.splitlines() if ':' in l}, reverse=True)
def brk(line):
    depth = 1 if line[:1] in ('"', "'") else 0; q = None; best = None; i = 0
    while i < len(line):
        ch = line[i]
        if q:
            if ch == q: q = None
            elif ch == ' ' and i + 3 <= LIMIT: best = (i, q)
        elif depth > 0 and ch in '"\'':
            q = ch
        elif ch == '{':
            if line[i+1:i+2] == '{' and depth == 0: i += 1
            else: depth += 1
        elif ch == '}' and depth > 0:
            depth -= 1
        i += 1
    return best
for p in sys.argv[1:]:
    while True:
        done = True
        for n in long_lines(p):
            L = open(p, encoding='utf-8').read().split('\n')
            b = brk(L[n-1])
            if not b: continue
            i, q = b
            L[n-1:n] = [L[n-1][:i+1] + q, q + L[n-1][i+1:]]
            open(p, 'w', encoding='utf-8').write('\n'.join(L)); done = False; break
        if done: break
