"""Chrome-headless helpers: svg/html -> png, html -> pdf. No network, no extra deps."""
import subprocess, os, tempfile, shutil
CHROME = "google-chrome"
BASE = ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--allow-file-access-from-files"]
def _run(args):
    """Runs headless Chrome, then removes the temp profile dirs this run created in /tmp (each leaves ~25 MB; the disk is tight)."""
    import glob
    before = set(glob.glob("/tmp/scoped_dir*"))
    try:
        return subprocess.run([CHROME, *BASE, *args], capture_output=True, text=True, timeout=180)
    finally:
        for d in set(glob.glob("/tmp/scoped_dir*")) - before:
            shutil.rmtree(d, ignore_errors=True)
def html_to_png(src, dst, w, h, dark=False):
    src = os.path.abspath(src)
    extra = ["--blink-settings=preferredColorScheme=1"] if dark else []
    tmp = os.path.abspath(dst) + ".new.png"
    if os.path.exists(tmp): os.remove(tmp)
    _run([*extra, f"--screenshot={tmp}", f"--window-size={w},{h}", "--virtual-time-budget=3000", "file://" + src])
    assert os.path.exists(tmp) and os.path.getsize(tmp) > 0, "screenshot failed"
    os.replace(tmp, os.path.abspath(dst))
def html_to_pdf(src, dst):
    src = os.path.abspath(src)
    tmp = os.path.abspath(dst) + ".new.pdf"
    if os.path.exists(tmp): os.remove(tmp)
    _run([f"--print-to-pdf={tmp}", "--no-pdf-header-footer", "--virtual-time-budget=5000", "file://" + src])
    assert os.path.exists(tmp) and os.path.getsize(tmp) > 0, "pdf failed"
    os.replace(tmp, os.path.abspath(dst))
