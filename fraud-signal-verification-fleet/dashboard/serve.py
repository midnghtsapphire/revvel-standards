"""Serve the live dashboard. Regenerates data on start, then serves statically.

    python3 dashboard/serve.py   # -> http://localhost:8088
"""
import http.server, socketserver, os, sys, subprocess

PORT = int(os.environ.get("PORT", "8088"))
HERE = os.path.dirname(os.path.abspath(__file__))

# regenerate data — fail fast so we never serve stale/missing data on a silent failure
subprocess.run([sys.executable, os.path.join(HERE, "..", "src", "orchestrator.py")], check=True)

os.chdir(HERE)
# Bind localhost only — this serves an evidence ledger, not a public service.
# Override with HOST=0.0.0.0 deliberately if you really want network exposure.
HOST = os.environ.get("HOST", "127.0.0.1")
with socketserver.TCPServer((HOST, PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"Evidence Ledger live at http://localhost:{PORT}")
    httpd.serve_forever()
