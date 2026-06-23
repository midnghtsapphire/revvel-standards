"""Serve the live dashboard. Regenerates data on start, then serves statically.

    python3 dashboard/serve.py   # -> http://localhost:8088
"""
import http.server, socketserver, os, sys, subprocess

PORT = int(os.environ.get("PORT", "8088"))
HERE = os.path.dirname(os.path.abspath(__file__))

# regenerate data
subprocess.run([sys.executable, os.path.join(HERE, "..", "src", "orchestrator.py")], check=False)

os.chdir(HERE)
with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"Evidence Ledger live at http://localhost:{PORT}")
    httpd.serve_forever()
