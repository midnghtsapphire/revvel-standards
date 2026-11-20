import ast, subprocess
def norm(t):
    for n in ast.walk(t):
        if isinstance(n,(ast.Module,ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)) and n.body and isinstance(n.body[0],ast.Expr) and isinstance(getattr(n.body[0],'value',None),ast.Constant) and isinstance(n.body[0].value.value,str):
            n.body[0].value.value=' '.join(n.body[0].value.value.split())
    return t
bad=0
for p in open('/tmp/orig34.txt').read().split():
    old=subprocess.run(['git','show',f'HEAD:{p}'],capture_output=True,text=True).stdout
    new=open(p).read()
    try: a,b=ast.dump(norm(ast.parse(old))),ast.dump(norm(ast.parse(new)))
    except SyntaxError as e: print('SYNTAX',p,e); bad+=1; continue
    if a!=b: bad+=1; print('AST DIFF',p)
print('bad',bad)
